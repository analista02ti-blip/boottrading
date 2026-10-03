#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
ROBÔ DE TRADING DE CRIPTOMOEDAS - INTEGRAÇÃO BINANCE API
================================================================================
Recursos:
- Interface Gráfica de Usuário (Window / GUI com Tkinter)
- Registro completo em arquivo de logs local: 'trading_bot.log'
- Seleção de par de criptomoedas (BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, etc.)
- Modo de operação: COMPRA_E_VENDA (Ciclo), APENAS_COMPRA, APENAS_VENDA
- Gatilho automático de Compra na Baixa (% de queda)
- Venda automática por Realização de Lucro (Take Profit %)
- Venda automática por Proteção de Capital (Stop Loss %)
- Assinatura criptográfica HMAC SHA-256 para ordens reais na Binance
- Modo Simulação (Paper Trading) integrado para testes seguros
================================================================================
"""

import sys
import time
import hmac
import hashlib
import logging
import threading
from urllib.parse import urlencode
from datetime import datetime
import json
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import urllib.request
import urllib.error

# Configuração do Arquivo de Logs
LOG_FILENAME = "trading_bot.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(threadName)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILENAME, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("BinanceBot")

# Constantes da Binance
BINANCE_REAL_API = "https://api.binance.com"
BINANCE_TESTNET_API = "https://testnet.binance.vision"

DEFAULT_PAIRS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", 
    "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", 
    "LINKUSDT", "NEARUSDT", "SUIUSDT"
]

class BinanceClient:
    """Cliente para interagir com a API da Binance (REST API)"""
    def __init__(self, api_key="", api_secret="", use_testnet=False):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = BINANCE_TESTNET_API if use_testnet else BINANCE_REAL_API

    def _sign(self, query_string):
        return hmac.new(
            self.api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    def get_ticker_price(self, symbol):
        """Consulta o preço atual de mercado da criptomoeda"""
        url = f"{self.base_url}/api/v3/ticker/price?symbol={symbol}"
        req = urllib.request.Request(url, headers={'User-Agent': 'BinanceBotPython/2.4'})
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                return float(data['price'])
        except Exception as e:
            logger.error(f"Erro ao buscar preço para {symbol}: {e}")
            return None

    def get_24hr_stats(self, symbol):
        """Consulta estatísticas de 24h (máxima, mínima, variação)"""
        url = f"{self.base_url}/api/v3/ticker/24hr?symbol={symbol}"
        req = urllib.request.Request(url, headers={'User-Agent': 'BinanceBotPython/2.4'})
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            logger.error(f"Erro ao buscar estatísticas 24h de {symbol}: {e}")
            return None

    def test_connectivity(self):
        """Testa o ping com os servidores da Binance"""
        url = f"{self.base_url}/api/v3/ping"
        req = urllib.request.Request(url, headers={'User-Agent': 'BinanceBotPython/2.4'})
        try:
            start = time.time()
            with urllib.request.urlopen(req, timeout=5) as response:
                latency = round((time.time() - start) * 1000)
                return True, latency
        except Exception as e:
            return False, str(e)

    def create_order(self, symbol, side, quantity):
        """Envia ordem de mercado para a Binance com assinatura HMAC"""
        if not self.api_key or not self.api_secret:
            raise ValueError("API Key ou Secret vazios para envio de ordem real.")

        endpoint = "/api/v3/order"
        timestamp = int(time.time() * 1000)
        params = {
            "symbol": symbol,
            "side": side.upper(),
            "type": "MARKET",
            "quantity": quantity,
            "timestamp": timestamp,
            "recvWindow": 5000
        }
        query_string = urlencode(params)
        signature = self._sign(query_string)
        full_url = f"{self.base_url}{endpoint}?{query_string}&signature={signature}"

        req = urllib.request.Request(
            full_url, 
            method="POST",
            headers={
                "X-MBX-APIKEY": self.api_key,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                return res_data
        except urllib.error.HTTPError as he:
            err_body = he.read().decode('utf-8')
            logger.error(f"Erro HTTP Binance: {err_body}")
            raise Exception(err_body)


class TradingBotApp(tk.Tk):
    """Janela Principal Desktop (Tkinter) do Robô de Trading"""
    def __init__(self):
        super().__init__()
        self.title("🤖 Binance Crypto Trading Bot v2.4 - [WINDOW ATIVA]")
        self.geometry("980x760")
        self.minsize(880, 680)
        self.configure(bg="#0b0e14")

        # Variáveis de Estado
        self.is_running = False
        self.worker_thread = None
        self.client = BinanceClient()
        
        # Posição ativa em aberto
        self.current_position = None
        self.reference_price = 0.0
        self.last_price = 0.0

        self._setup_styles()
        self._build_ui()
        self._init_logger_to_gui()
        
        logger.info("Aplicação Desktop Python iniciada com sucesso. Arquivo de log: trading_bot.log")

    def _setup_styles(self):
        self.style = ttk.Style(self)
        self.style.theme_use("clam")
        
        # Cores do terminal
        self.bg_dark = "#0b0e14"
        self.surface_dark = "#151a23"
        self.border_dark = "#242d3d"
        self.accent_green = "#10b981"
        self.accent_red = "#ef4444"
        self.accent_yellow = "#f59e0b"
        self.text_main = "#f1f5f9"
        self.text_muted = "#94a3b8"

        self.style.configure(".", background=self.bg_dark, foreground=self.text_main, font=("Segoe UI", 10))
        self.style.configure("TLabel", background=self.bg_dark, foreground=self.text_main)
        self.style.configure("TFrame", background=self.bg_dark)
        self.style.configure("Card.TFrame", background=self.surface_dark, relief="flat")
        self.style.configure("Header.TLabel", font=("Segoe UI", 13, "bold"), foreground="#38bdf8", background=self.surface_dark)
        self.style.configure("SubHeader.TLabel", font=("Segoe UI", 10, "bold"), foreground=self.text_muted, background=self.surface_dark)
        self.style.configure("Metric.TLabel", font=("Consolas", 14, "bold"), foreground="#ffffff", background=self.surface_dark)

    def _build_ui(self):
        # Barra Superior
        top_bar = tk.Frame(self, bg="#0f172a", height=50)
        top_bar.pack(fill="x", side="top", padx=0, pady=0)

        title_lbl = tk.Label(
            top_bar, 
            text="BINANCE CRIPTO TRADING BOT  |  MOTOR ALGORÍTMICO PYTHON", 
            font=("Segoe UI", 12, "bold"), 
            bg="#0f172a", 
            fg="#38bdf8"
        )
        title_lbl.pack(side="left", padx=16, pady=12)

        self.status_badge = tk.Label(
            top_bar, 
            text="● ROBÔ PARADO", 
            font=("Segoe UI", 9, "bold"), 
            bg="#1e293b", 
            fg="#94a3b8",
            padx=10, 
            pady=4
        )
        self.status_badge.pack(side="right", padx=16, pady=10)

        # Container Principal com 2 colunas
        main_container = tk.Frame(self, bg=self.bg_dark)
        main_container.pack(fill="both", expand=True, padx=16, pady=12)

        # Coluna Esquerda: Configurações e Parâmetros
        left_col = tk.Frame(main_container, bg=self.bg_dark, width=420)
        left_col.pack(side="left", fill="both", padx=(0, 10))

        # Card 1: Par e Modo de Operação
        card_params = tk.LabelFrame(
            left_col, 
            text=" 1. Configurações de Operação ", 
            font=("Segoe UI", 10, "bold"),
            bg=self.surface_dark, 
            fg="#38bdf8", 
            bd=1, 
            relief="solid"
        )
        card_params.pack(fill="x", pady=(0, 10), ipady=8, ipadx=8)

        # Par de Cripto
        tk.Label(card_params, text="Par de Criptomoeda:", bg=self.surface_dark, fg=self.text_main).grid(row=0, column=0, sticky="w", pady=4, padx=6)
        self.pair_var = tk.StringVar(value="BTCUSDT")
        pair_cb = ttk.Combobox(card_params, textvariable=self.pair_var, values=DEFAULT_PAIRS, width=16, state="readonly")
        pair_cb.grid(row=0, column=1, sticky="e", pady=4, padx=6)
        pair_cb.bind("<<ComboboxSelected>>", self._on_pair_changed)

        # Modo de Operação
        tk.Label(card_params, text="Modo de Operação:", bg=self.surface_dark, fg=self.text_main).grid(row=1, column=0, sticky="w", pady=4, padx=6)
        self.mode_var = tk.StringVar(value="COMPRA_E_VENDA")
        mode_cb = ttk.Combobox(
            card_params, 
            textvariable=self.mode_var, 
            values=["COMPRA_E_VENDA", "APENAS_COMPRA", "APENAS_VENDA"], 
            width=16, 
            state="readonly"
        )
        mode_cb.grid(row=1, column=1, sticky="e", pady=4, padx=6)

        # Card 2: Porcentagens do Robô (Gatilho de Compra, Lucro/Take Profit, Stop Loss)
        card_triggers = tk.LabelFrame(
            left_col, 
            text=" 2. Porcentagens e Gatilhos Automáticos ", 
            font=("Segoe UI", 10, "bold"),
            bg=self.surface_dark, 
            fg="#38bdf8", 
            bd=1, 
            relief="solid"
        )
        card_triggers.pack(fill="x", pady=(0, 10), ipady=8, ipadx=8)

        # Gatilho de Compra na Baixa (%)
        tk.Label(card_triggers, text="Queda para Compra (%):", bg=self.surface_dark, fg="#38bdf8").grid(row=0, column=0, sticky="w", pady=4, padx=6)
        self.buy_dip_var = tk.DoubleVar(value=2.0)
        buy_entry = tk.Entry(card_triggers, textvariable=self.buy_dip_var, width=12, bg="#0f172a", fg="#ffffff", insertbackground="white", bd=1)
        buy_entry.grid(row=0, column=1, sticky="e", pady=4, padx=6)

        # Alvo de Lucro / Take Profit (%)
        tk.Label(card_triggers, text="Lucro para Venda / Take Profit (%):", bg=self.surface_dark, fg="#10b981").grid(row=1, column=0, sticky="w", pady=4, padx=6)
        self.take_profit_var = tk.DoubleVar(value=3.0)
        tp_entry = tk.Entry(card_triggers, textvariable=self.take_profit_var, width=12, bg="#0f172a", fg="#ffffff", insertbackground="white", bd=1)
        tp_entry.grid(row=1, column=1, sticky="e", pady=4, padx=6)

        # Stop Loss (%)
        tk.Label(card_triggers, text="Proteção / Stop Loss (%):", bg=self.surface_dark, fg="#ef4444").grid(row=2, column=0, sticky="w", pady=4, padx=6)
        self.stop_loss_var = tk.DoubleVar(value=2.0)
        sl_entry = tk.Entry(card_triggers, textvariable=self.stop_loss_var, width=12, bg="#0f172a", fg="#ffffff", insertbackground="white", bd=1)
        sl_entry.grid(row=2, column=1, sticky="e", pady=4, padx=6)

        # Volume em USDT por Ordem
        tk.Label(card_triggers, text="Valor da Ordem (USDT):", bg=self.surface_dark, fg=self.text_main).grid(row=3, column=0, sticky="w", pady=4, padx=6)
        self.order_usdt_var = tk.DoubleVar(value=50.0)
        usdt_entry = tk.Entry(card_triggers, textvariable=self.order_usdt_var, width=12, bg="#0f172a", fg="#ffffff", insertbackground="white", bd=1)
        usdt_entry.grid(row=3, column=1, sticky="e", pady=4, padx=6)

        # Card 3: Credenciais Binance e Modo Simulação
        card_api = tk.LabelFrame(
            left_col, 
            text=" 3. Conexão Binance API ", 
            font=("Segoe UI", 10, "bold"),
            bg=self.surface_dark, 
            fg="#38bdf8", 
            bd=1, 
            relief="solid"
        )
        card_api.pack(fill="x", pady=(0, 10), ipady=8, ipadx=8)

        self.simulated_var = tk.BooleanVar(value=True)
        sim_check = tk.Checkbutton(
            card_api, 
            text="Modo Simulação (Paper Trading - Sem Risco)", 
            variable=self.simulated_var,
            bg=self.surface_dark, 
            fg="#fbbf24", 
            selectcolor="#0f172a",
            activebackground=self.surface_dark,
            activeforeground="#fbbf24",
            font=("Segoe UI", 9, "bold")
        )
        sim_check.pack(anchor="w", padx=6, pady=2)

        api_frame = tk.Frame(card_api, bg=self.surface_dark)
        api_frame.pack(fill="x", padx=6, pady=4)

        tk.Label(api_frame, text="API Key:", bg=self.surface_dark, fg=self.text_muted, font=("Segoe UI", 8)).grid(row=0, column=0, sticky="w")
        self.api_key_entry = tk.Entry(api_frame, width=28, bg="#0f172a", fg="#ffffff", bd=1)
        self.api_key_entry.grid(row=0, column=1, sticky="ew", padx=4, pady=2)

        tk.Label(api_frame, text="Secret:", bg=self.surface_dark, fg=self.text_muted, font=("Segoe UI", 8)).grid(row=1, column=0, sticky="w")
        self.api_secret_entry = tk.Entry(api_frame, width=28, show="*", bg="#0f172a", fg="#ffffff", bd=1)
        self.api_secret_entry.grid(row=1, column=1, sticky="ew", padx=4, pady=2)

        btn_test = tk.Button(
            card_api, 
            text="⚡ Testar Conexão com Binance API", 
            command=self._test_binance_connection,
            bg="#1e293b", 
            fg="#38bdf8", 
            font=("Segoe UI", 9, "bold"),
            bd=1, 
            relief="solid", 
            cursor="hand2"
        )
        btn_test.pack(fill="x", padx=6, pady=4)

        # Botões de Ação Principal: Iniciar / Parar
        action_frame = tk.Frame(left_col, bg=self.bg_dark)
        action_frame.pack(fill="x", pady=6)

        self.btn_start = tk.Button(
            action_frame, 
            text="▶ INICIAR ROBÔ DE TRADING", 
            command=self.start_bot,
            bg="#10b981", 
            fg="#ffffff", 
            font=("Segoe UI", 11, "bold"),
            pady=8, 
            bd=0, 
            cursor="hand2"
        )
        self.btn_start.pack(fill="x", pady=(0, 6))

        self.btn_stop = tk.Button(
            action_frame, 
            text="⏹ PARAR ROBÔ", 
            command=self.stop_bot,
            bg="#334155", 
            fg="#94a3b8", 
            font=("Segoe UI", 10, "bold"),
            pady=6, 
            bd=0, 
            state="disabled", 
            cursor="hand2"
        )
        self.btn_stop.pack(fill="x")

        # Coluna Direita: Dashboard de Preços + Console de Logs (trading_bot.log)
        right_col = tk.Frame(main_container, bg=self.bg_dark)
        right_col.pack(side="right", fill="both", expand=True)

        # Monitor de Mercado
        monitor_frame = tk.LabelFrame(
            right_col, 
            text=" Monitor em Tempo Real (Binance API) ", 
            font=("Segoe UI", 10, "bold"),
            bg=self.surface_dark, 
            fg="#38bdf8", 
            bd=1, 
            relief="solid"
        )
        monitor_frame.pack(fill="x", pady=(0, 10), ipady=6, ipadx=8)

        stats_grid = tk.Frame(monitor_frame, bg=self.surface_dark)
        stats_grid.pack(fill="x", padx=8, pady=4)

        # Preço Atual
        tk.Label(stats_grid, text="PREÇO ATUAL", font=("Segoe UI", 8, "bold"), fg=self.text_muted, bg=self.surface_dark).grid(row=0, column=0, sticky="w")
        self.lbl_current_price = tk.Label(stats_grid, text="-- USD", font=("Consolas", 16, "bold"), fg="#ffffff", bg=self.surface_dark)
        self.lbl_current_price.grid(row=1, column=0, sticky="w", padx=(0, 20))

        # Preço de Referência
        tk.Label(stats_grid, text="REF. ENTRADA / BASE", font=("Segoe UI", 8, "bold"), fg=self.text_muted, bg=self.surface_dark).grid(row=0, column=1, sticky="w")
        self.lbl_ref_price = tk.Label(stats_grid, text="-- USD", font=("Consolas", 14, "bold"), fg="#94a3b8", bg=self.surface_dark)
        self.lbl_ref_price.grid(row=1, column=1, sticky="w", padx=(0, 20))

        # Alvo de Compra
        tk.Label(stats_grid, text="GATILHO COMPRA", font=("Segoe UI", 8, "bold"), fg="#38bdf8", bg=self.surface_dark).grid(row=0, column=2, sticky="w")
        self.lbl_target_buy = tk.Label(stats_grid, text="-- USD", font=("Consolas", 14, "bold"), fg="#38bdf8", bg=self.surface_dark)
        self.lbl_target_buy.grid(row=1, column=2, sticky="w", padx=(0, 20))

        # Alvo Take Profit
        tk.Label(stats_grid, text="ALVO TAKE PROFIT", font=("Segoe UI", 8, "bold"), fg="#10b981", bg=self.surface_dark).grid(row=0, column=3, sticky="w")
        self.lbl_target_tp = tk.Label(stats_grid, text="-- USD", font=("Consolas", 14, "bold"), fg="#10b981", bg=self.surface_dark)
        self.lbl_target_tp.grid(row=1, column=3, sticky="w")

        # Posição Aberta Atual
        pos_frame = tk.Frame(monitor_frame, bg="#0f172a", bd=1, relief="solid")
        pos_frame.pack(fill="x", padx=8, pady=(4, 6), ipady=4)
        self.lbl_pos_status = tk.Label(
            pos_frame, 
            text="Sem posição aberta no momento. Robô aguardando oportunidade de compra.", 
            font=("Segoe UI", 9), 
            fg="#94a3b8", 
            bg="#0f172a"
        )
        self.lbl_pos_status.pack(anchor="w", padx=8)

        # Área de Logs (Espelho do arquivo trading_bot.log)
        log_header = tk.Frame(right_col, bg=self.bg_dark)
        log_header.pack(fill="x", pady=(4, 4))

        tk.Label(
            log_header, 
            text="📄 Arquivo de Logs: trading_bot.log (Tempo Real)", 
            font=("Segoe UI", 10, "bold"), 
            bg=self.bg_dark, 
            fg="#e2e8f0"
        ).pack(side="left")

        btn_clear_log = tk.Button(
            log_header, 
            text="Limpar Tela", 
            command=self._clear_gui_logs,
            font=("Segoe UI", 8), 
            bg="#1e293b", 
            fg=self.text_muted, 
            bd=0, 
            padx=8, 
            cursor="hand2"
        )
        btn_clear_log.pack(side="right")

        self.log_area = scrolledtext.ScrolledText(
            right_col, 
            wrap="word", 
            font=("Consolas", 9), 
            bg="#05070a", 
            fg="#cbd5e1", 
            insertbackground="white",
            bd=1, 
            relief="solid"
        )
        self.log_area.pack(fill="both", expand=True)

        # Tags de cores para o log
        self.log_area.tag_config("INFO", foreground="#94a3b8")
        self.log_area.tag_config("SUCCESS", foreground="#10b981")
        self.log_area.tag_config("WARNING", foreground="#f59e0b")
        self.log_area.tag_config("ERROR", foreground="#ef4444")
        self.log_area.tag_config("HIGHLIGHT", foreground="#38bdf8", font=("Consolas", 9, "bold"))

    def _init_logger_to_gui(self):
        class TkinterLogHandler(logging.Handler):
            def __init__(self, text_widget):
                super().__init__()
                self.text_widget = text_widget

            def emit(self, record):
                msg = self.format(record)
                tag = record.levelname
                if "SUCESSO" in msg or "LUCRO" in msg or "EXECUTADA" in msg:
                    tag = "SUCCESS"
                elif "STOP LOSS" in msg or "ERRO" in msg:
                    tag = "ERROR"
                elif "AVISO" in msg:
                    tag = "WARNING"

                def append():
                    try:
                        self.text_widget.insert(tk.END, msg + "\n", tag)
                        self.text_widget.see(tk.END)
                    except Exception:
                        pass

                self.text_widget.after(0, append)

        self.gui_handler = TkinterLogHandler(self.log_area)
        self.gui_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
        logger.addHandler(self.gui_handler)

    def _clear_gui_logs(self):
        self.log_area.delete("1.0", tk.END)

    def _on_pair_changed(self, event=None):
        pair = self.pair_var.get()
        logger.info(f"Par selecionado: {pair}. Buscando cotação inicial na Binance...")
        threading.Thread(target=self._update_single_price, daemon=True).start()

    def _update_single_price(self):
        pair = self.pair_var.get()
        price = self.client.get_ticker_price(pair)
        if price:
            self.last_price = price
            self.lbl_current_price.config(text=f"${price:,.2f}")
            self._update_target_calculations(price)

    def _update_target_calculations(self, current_price):
        buy_pct = self.buy_dip_var.get()
        tp_pct = self.take_profit_var.get()
        sl_pct = self.stop_loss_var.get()

        target_buy = current_price * (1 - buy_pct / 100.0)
        target_tp = current_price * (1 + tp_pct / 100.0)

        self.lbl_ref_price.config(text=f"${current_price:,.2f}")
        self.lbl_target_buy.config(text=f"${target_buy:,.2f} (-{buy_pct:.1f}%)")
        self.lbl_target_tp.config(text=f"${target_tp:,.2f} (+{tp_pct:.1f}%)")

    def _test_binance_connection(self):
        logger.info("Testando conectividade com servidores da Binance API...")
        def run_test():
            ok, latency_or_err = self.client.test_connectivity()
            if ok:
                msg = f"Conexão com a Binance OK! Latência: {latency_or_err}ms"
                logger.info(f"[SUCESSO] {msg}")
                messagebox.showinfo("Binance API", msg)
            else:
                msg = f"Falha ao conectar com Binance: {latency_or_err}"
                logger.error(msg)
                messagebox.showerror("Erro de Conexão", msg)
        threading.Thread(target=run_test, daemon=True).start()

    def start_bot(self):
        if self.is_running:
            return

        pair = self.pair_var.get()
        mode = self.mode_var.get()
        buy_pct = self.buy_dip_var.get()
        tp_pct = self.take_profit_var.get()
        sl_pct = self.stop_loss_var.get()
        is_sim = self.simulated_var.get()

        self.is_running = True
        self.btn_start.config(state="disabled", bg="#334155")
        self.btn_stop.config(state="normal", bg="#ef4444", fg="#ffffff")
        self.status_badge.config(text="● ROBÔ ATIVO OPERANDO", bg="#065f46", fg="#34d399")

        logger.info("=" * 60)
        logger.info(f"INICIANDO ROBÔ DE TRADING")
        logger.info(f"Par: {pair} | Modo: {mode}")
        logger.info(f"Gatilho Compra na Baixa: -{buy_pct:.2f}% | Take Profit: +{tp_pct:.2f}% | Stop Loss: -{sl_pct:.2f}%")
        logger.info(f"Ambiente: {'SIMULAÇÃO (Sem Risco)' if is_sim else 'REAL (Binance API Orders)'}")
        logger.info("=" * 60)

        self.worker_thread = threading.Thread(target=self._trading_loop, daemon=True)
        self.worker_thread.start()

    def stop_bot(self):
        if not self.is_running:
            return

        self.is_running = False
        self.btn_start.config(state="normal", bg="#10b981")
        self.btn_stop.config(state="disabled", bg="#334155", fg="#94a3b8")
        self.status_badge.config(text="● ROBÔ PARADO", bg="#1e293b", fg="#94a3b8")
        logger.info("Robô de trading finalizado pelo operador. Monitoramento pausado.")

    def _trading_loop(self):
        """Loop contínuo de tomada de decisão do robô"""
        while self.is_running:
            try:
                symbol = self.pair_var.get()
                mode = self.mode_var.get()
                buy_dip_pct = self.buy_dip_var.get()
                tp_pct = self.take_profit_var.get()
                sl_pct = self.stop_loss_var.get()
                order_usdt = self.order_usdt_var.get()
                is_sim = self.simulated_var.get()

                # Busca preço em tempo real na Binance
                current_price = self.client.get_ticker_price(symbol)
                if not current_price:
                    time.sleep(3)
                    continue

                self.last_price = current_price
                self.lbl_current_price.config(text=f"${current_price:,.2f}")

                # Inicializa preço de referência caso ainda não exista
                if self.reference_price <= 0.0:
                    self.reference_price = current_price
                    self._update_target_calculations(self.reference_price)
                    logger.info(f"Preço Base de Referência estabelecido: ${self.reference_price:,.2f}")

                # -------------------------------------------------------------
                # CENÁRIO 1: Robô está COM UMA POSIÇÃO ABERTA (Aguardando Venda)
                # -------------------------------------------------------------
                if self.current_position is not None:
                    pos = self.current_position
                    entry_price = pos["entry_price"]
                    qty = pos["quantity"]
                    
                    # Cálculo de PnL não realizado
                    pnl_pct = ((current_price - entry_price) / entry_price) * 100.0
                    pnl_usdt = (current_price - entry_price) * qty

                    # Atualiza texto da posição na tela
                    pos_txt = (
                        f"Posição Aberta: {qty:.4f} {symbol} @ ${entry_price:,.2f} | "
                        f"Atual: ${current_price:,.2f} | PnL: {pnl_pct:+.2f}% (${pnl_usdt:+.2f})"
                    )
                    self.lbl_pos_status.config(
                        text=pos_txt, 
                        fg="#34d399" if pnl_pct >= 0 else "#f87171"
                    )

                    # 1. Verifica Gatilho de TAKE PROFIT (Lucro automático)
                    if pnl_pct >= tp_pct:
                        logger.info(f"🎯 [TAKE PROFIT ATINGIDO] Preço: ${current_price:,.2f} | Lucro: +{pnl_pct:.2f}% (+${pnl_usdt:.2f})")
                        self._execute_sell(symbol, qty, current_price, "TAKE_PROFIT", pnl_pct, pnl_usdt, is_sim)
                        self.current_position = None
                        self.reference_price = current_price
                        self._update_target_calculations(current_price)

                    # 2. Verifica Gatilho de STOP LOSS (Proteção de capital)
                    elif pnl_pct <= -abs(sl_pct):
                        logger.warning(f"🛑 [STOP LOSS ACIONADO] Preço: ${current_price:,.2f} | Variação: {pnl_pct:.2f}% (${pnl_usdt:.2f})")
                        self._execute_sell(symbol, qty, current_price, "STOP_LOSS", pnl_pct, pnl_usdt, is_sim)
                        self.current_position = None
                        self.reference_price = current_price
                        self._update_target_calculations(current_price)

                # -------------------------------------------------------------
                # CENÁRIO 2: Robô está SEM POSIÇÃO (Aguardando Oportunidade de Compra)
                # -------------------------------------------------------------
                else:
                    self.lbl_pos_status.config(
                        text=f"Sem posição em aberto. Monitorando queda de -{buy_dip_pct:.2f}% em relação a ${self.reference_price:,.2f}",
                        fg="#94a3b8"
                    )

                    # Atualiza referência se o preço subiu para acompanhar o topo
                    if current_price > self.reference_price:
                        self.reference_price = current_price
                        self._update_target_calculations(self.reference_price)

                    # Cálculo da queda em relação ao topo/referência
                    dip_pct = ((current_price - self.reference_price) / self.reference_price) * 100.0
                    target_buy_price = self.reference_price * (1 - buy_dip_pct / 100.0)

                    # Se o modo permite compra (COMPRA_E_VENDA ou APENAS_COMPRA)
                    if mode in ["COMPRA_E_VENDA", "APENAS_COMPRA"]:
                        if current_price <= target_buy_price:
                            qty = order_usdt / current_price
                            logger.info(f"💎 [GATILHO DE QUEDA ATIVADO] Preço caiu {dip_pct:.2f}%. Executando ordem de COMPRA automática!")
                            self._execute_buy(symbol, qty, current_price, is_sim)
                            
                            self.current_position = {
                                "symbol": symbol,
                                "entry_price": current_price,
                                "quantity": qty,
                                "usdt": order_usdt,
                                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            }

                # Intervalo entre checagens
                time.sleep(2.5)

            except Exception as e:
                logger.error(f"Erro no loop de operação do robô: {e}")
                time.sleep(4)

    def _execute_buy(self, symbol, quantity, price, is_sim):
        if is_sim:
            logger.info(f"✅ [COMPRA SIMULADA EXECUTADA] {quantity:.5f} {symbol} a ${price:,.2f} (Total: ${quantity * price:.2f} USDT)")
        else:
            try:
                res = self.client.create_order(symbol, "BUY", round(quantity, 4))
                logger.info(f"✅ [ORDEM REAL EXECUTADA BINANCE] Ordem #{res.get('orderId')} | Preço: ${price:,.2f}")
            except Exception as e:
                logger.error(f"Falha ao executar ordem real de compra na Binance: {e}")

    def _execute_sell(self, symbol, quantity, price, trigger, pnl_pct, pnl_usdt, is_sim):
        tag = "[TAKE PROFIT]" if trigger == "TAKE_PROFIT" else "[STOP LOSS]"
        if is_sim:
            logger.info(f"💰 {tag} [VENDA SIMULADA EXECUTADA] {quantity:.5f} {symbol} a ${price:,.2f} | PnL: {pnl_pct:+.2f}% (${pnl_usdt:+.2f} USDT)")
        else:
            try:
                res = self.client.create_order(symbol, "SELL", round(quantity, 4))
                logger.info(f"💰 {tag} [VENDA REAL EXECUTADA BINANCE] Ordem #{res.get('orderId')} | PnL: {pnl_pct:+.2f}%")
            except Exception as e:
                logger.error(f"Falha ao executar ordem real de venda na Binance: {e}")

def main():
    app = TradingBotApp()
    app.mainloop()

if __name__ == "__main__":
    main()
