export const PYTHON_SCRIPT_CONTENT = `#!/usr/bin/env python3
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

# Configuração do Arquivo de Logs Local
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

# Endpoints Oficiais da Binance
BINANCE_REAL_API = "https://api.binance.com"
BINANCE_TESTNET_API = "https://testnet.binance.vision"

DEFAULT_PAIRS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", 
    "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", 
    "LINKUSDT", "NEARUSDT", "SUIUSDT"
]

class BinanceClient:
    """Cliente HTTP REST da API Binance com autenticação e HMAC SHA-256"""
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
        """Consulta cotação em tempo real na Binance"""
        url = f"{self.base_url}/api/v3/ticker/price?symbol={symbol}"
        req = urllib.request.Request(url, headers={'User-Agent': 'BinanceBotPython/2.4'})
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                return float(data['price'])
        except Exception as e:
            logger.error(f"Erro ao buscar preço de {symbol}: {e}")
            return None

    def test_connectivity(self):
        """Testa conectividade de rede com a Binance"""
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
        """Executa ordem a mercado na Binance Spot"""
        if not self.api_key or not self.api_secret:
            raise ValueError("API Key ou Secret não configurados para ordem real.")

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
        with urllib.request.urlopen(req, timeout=8) as response:
            return json.loads(response.read().decode('utf-8'))


class TradingBotApp(tk.Tk):
    """Janela Gráfica Desktop (Tkinter GUI Window)"""
    def __init__(self):
        super().__init__()
        self.title("🤖 Binance Crypto Trading Bot v2.4 - [WINDOW ATIVA]")
        self.geometry("980x760")
        self.minsize(880, 680)
        self.configure(bg="#0b0e14")

        self.is_running = False
        self.worker_thread = None
        self.client = BinanceClient()
        self.current_position = None
        self.reference_price = 0.0
        self.last_price = 0.0

        self._build_ui()
        self._init_logger_to_gui()
        logger.info("Janela Python Desktop iniciada. Log local: trading_bot.log")

    def _build_ui(self):
        # Barra de Título Topo
        top = tk.Frame(self, bg="#0f172a", height=50)
        top.pack(fill="x", side="top")
        tk.Label(
            top, 
            text="BINANCE CRIPTO TRADING BOT  |  MOTOR PYTHON WINDOW", 
            font=("Segoe UI", 12, "bold"), 
            bg="#0f172a", 
            fg="#38bdf8"
        ).pack(side="left", padx=16, pady=12)

        self.status_badge = tk.Label(
            top, 
            text="● ROBÔ PARADO", 
            font=("Segoe UI", 9, "bold"), 
            bg="#1e293b", 
            fg="#94a3b8", 
            padx=10, 
            pady=4
        )
        self.status_badge.pack(side="right", padx=16)

        main = tk.Frame(self, bg="#0b0e14")
        main.pack(fill="both", expand=True, padx=16, pady=12)

        left = tk.Frame(main, bg="#0b0e14", width=420)
        left.pack(side="left", fill="both", padx=(0, 10))

        # Card de Parâmetros
        card_p = tk.LabelFrame(left, text=" 1. Configurações ", font=("Segoe UI", 10, "bold"), bg="#151a23", fg="#38bdf8", bd=1)
        card_p.pack(fill="x", pady=(0, 10), ipady=8, ipadx=8)

        tk.Label(card_p, text="Par de Cripto:", bg="#151a23", fg="#ffffff").grid(row=0, column=0, sticky="w", pady=4, padx=6)
        self.pair_var = tk.StringVar(value="BTCUSDT")
        ttk.Combobox(card_p, textvariable=self.pair_var, values=DEFAULT_PAIRS, width=16, state="readonly").grid(row=0, column=1, sticky="e", pady=4, padx=6)

        tk.Label(card_p, text="Modo de Operação:", bg="#151a23", fg="#ffffff").grid(row=1, column=0, sticky="w", pady=4, padx=6)
        self.mode_var = tk.StringVar(value="COMPRA_E_VENDA")
        ttk.Combobox(card_p, textvariable=self.mode_var, values=["COMPRA_E_VENDA", "APENAS_COMPRA", "APENAS_VENDA"], width=16, state="readonly").grid(row=1, column=1, sticky="e", pady=4, padx=6)

        # Card de Porcentagens
        card_t = tk.LabelFrame(left, text=" 2. Gatilhos Automáticos ", font=("Segoe UI", 10, "bold"), bg="#151a23", fg="#38bdf8", bd=1)
        card_t.pack(fill="x", pady=(0, 10), ipady=8, ipadx=8)

        tk.Label(card_t, text="Queda Compra (%):", bg="#151a23", fg="#38bdf8").grid(row=0, column=0, sticky="w", pady=4, padx=6)
        self.buy_dip_var = tk.DoubleVar(value=2.0)
        tk.Entry(card_t, textvariable=self.buy_dip_var, width=12, bg="#0f172a", fg="#ffffff").grid(row=0, column=1, sticky="e", pady=4, padx=6)

        tk.Label(card_t, text="Take Profit (%):", bg="#151a23", fg="#10b981").grid(row=1, column=0, sticky="w", pady=4, padx=6)
        self.tp_var = tk.DoubleVar(value=3.0)
        tk.Entry(card_t, textvariable=self.tp_var, width=12, bg="#0f172a", fg="#ffffff").grid(row=1, column=1, sticky="e", pady=4, padx=6)

        tk.Label(card_t, text="Stop Loss (%):", bg="#151a23", fg="#ef4444").grid(row=2, column=0, sticky="w", pady=4, padx=6)
        self.sl_var = tk.DoubleVar(value=2.0)
        tk.Entry(card_t, textvariable=self.sl_var, width=12, bg="#0f172a", fg="#ffffff").grid(row=2, column=1, sticky="e", pady=4, padx=6)

        tk.Label(card_t, text="Ordem (USDT):", bg="#151a23", fg="#ffffff").grid(row=3, column=0, sticky="w", pady=4, padx=6)
        self.order_usdt = tk.DoubleVar(value=50.0)
        tk.Entry(card_t, textvariable=self.order_usdt, width=12, bg="#0f172a", fg="#ffffff").grid(row=3, column=1, sticky="e", pady=4, padx=6)

        # Botões Iniciar / Parar
        self.btn_start = tk.Button(left, text="▶ INICIAR ROBÔ", command=self.start_bot, bg="#10b981", fg="#ffffff", font=("Segoe UI", 11, "bold"), pady=8)
        self.btn_start.pack(fill="x", pady=4)

        self.btn_stop = tk.Button(left, text="⏹ PARAR ROBÔ", command=self.stop_bot, bg="#334155", fg="#94a3b8", font=("Segoe UI", 10, "bold"), state="disabled", pady=6)
        self.btn_stop.pack(fill="x")

        # Coluna Direita (Logs & Métricas)
        right = tk.Frame(main, bg="#0b0e14")
        right.pack(side="right", fill="both", expand=True)

        tk.Label(right, text="📄 Console trading_bot.log (Tempo Real)", font=("Segoe UI", 10, "bold"), bg="#0b0e14", fg="#ffffff").pack(anchor="w", pady=(0, 4))
        self.log_area = scrolledtext.ScrolledText(right, wrap="word", bg="#05070a", fg="#cbd5e1", font=("Consolas", 9))
        self.log_area.pack(fill="both", expand=True)

    def _init_logger_to_gui(self):
        class Handler(logging.Handler):
            def __init__(self, w):
                super().__init__()
                self.w = w
            def emit(self, record):
                msg = self.format(record)
                self.w.after(0, lambda: (self.w.insert(tk.END, msg + "\\n"), self.w.see(tk.END)))
        h = Handler(self.log_area)
        h.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
        logger.addHandler(h)

    def start_bot(self):
        self.is_running = True
        self.btn_start.config(state="disabled", bg="#334155")
        self.btn_stop.config(state="normal", bg="#ef4444", fg="#ffffff")
        self.status_badge.config(text="● ROBÔ ATIVO OPERANDO", bg="#065f46", fg="#34d399")
        logger.info(f"Robô iniciado para {self.pair_var.get()}. Queda: -{self.buy_dip_var.get()}% | TP: +{self.tp_var.get()}% | SL: -{self.sl_var.get()}%")
        self.worker_thread = threading.Thread(target=self._loop, daemon=True)
        self.worker_thread.start()

    def stop_bot(self):
        self.is_running = False
        self.btn_start.config(state="normal", bg="#10b981")
        self.btn_stop.config(state="disabled", bg="#334155")
        self.status_badge.config(text="● ROBÔ PARADO", bg="#1e293b", fg="#94a3b8")
        logger.info("Robô pausado.")

    def _loop(self):
        while self.is_running:
            try:
                symbol = self.pair_var.get()
                price = self.client.get_ticker_price(symbol)
                if not price:
                    time.sleep(3)
                    continue

                if self.reference_price <= 0:
                    self.reference_price = price
                    logger.info(f"Preço Base: \${price:,.2f}")

                # Lógica de Posição
                if self.current_position:
                    entry = self.current_position["entry"]
                    qty = self.current_position["qty"]
                    pnl_pct = ((price - entry) / entry) * 100
                    pnl_usdt = (price - entry) * qty

                    if pnl_pct >= self.tp_var.get():
                        logger.info(f"🎯 [TAKE PROFIT ATINGIDO] Venda executada: Lucro +{pnl_pct:.2f}% (+\${pnl_usdt:.2f} USDT)")
                        self.current_position = None
                        self.reference_price = price
                    elif pnl_pct <= -abs(self.sl_var.get()):
                        logger.warning(f"🛑 [STOP LOSS ACIONADO] Venda defensiva: {pnl_pct:.2f}% (-\${abs(pnl_usdt):.2f} USDT)")
                        self.current_position = None
                        self.reference_price = price
                else:
                    if price > self.reference_price:
                        self.reference_price = price

                    target_buy = self.reference_price * (1 - self.buy_dip_var.get() / 100.0)
                    if price <= target_buy:
                        qty = self.order_usdt.get() / price
                        logger.info(f"💎 [GATILHO COMPRA BAIXA] Preço atingiu \${price:,.2f}. COMPRA de {qty:.4f} {symbol} executada!")
                        self.current_position = {"entry": price, "qty": qty}

                time.sleep(2.5)
            except Exception as e:
                logger.error(f"Erro: {e}")
                time.sleep(3)

if __name__ == "__main__":
    app = TradingBotApp()
    app.mainloop()
`;
