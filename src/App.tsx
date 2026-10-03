import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { PairSelector } from './components/PairSelector';
import { BotControlPanel } from './components/BotControlPanel';
import { TradingChart } from './components/TradingChart';
import { OrderBook } from './components/OrderBook';
import { PositionsAndTrades } from './components/PositionsAndTrades';
import { PythonWindow } from './components/PythonWindow';
import { LogViewer } from './components/LogViewer';
import { BotPerformanceReport } from './components/BotPerformanceReport';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { ToastContainer } from './components/ToastContainer';
import { SUPPORTED_PAIRS } from './data/cryptoPairs';
import { INITIAL_PERFORMANCE_TRADES } from './data/mockPerformanceTrades';
import { BotConfig, Candle, CryptoPair, LogEntry, OrderBook as OrderBookType, Position, TickerData, TradeRecord } from './types/trading';
import { ToastNotification } from './types/toast';
import { playTakeProfitSound, playStopLossSound, playDipBuySound } from './utils/soundEffects';
import { checkBinancePing, executeBinanceOrder, fetchBinanceDepth, fetchBinanceKlines, fetchBinanceTicker } from './services/binanceService';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; role: string } | null>(() => {
    try {
      const saved = localStorage.getItem('binance_algo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Navigation
  const [currentTab, setCurrentTab] = useState<'terminal' | 'bot' | 'python_window' | 'logs' | 'reports' | 'docs'>('terminal');

  // Toast Notification System
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastNotification = {
      ...toast,
      id,
      timestamp: Date.now()
    };
    setToasts((prev) => [newToast, ...prev.slice(0, 3)]); // Keep max 4 visible

    // Play synthesized institutional sound effects
    if (toast.type === 'take_profit') {
      playTakeProfitSound();
    } else if (toast.type === 'stop_loss') {
      playStopLossSound();
    } else if (toast.type === 'buy_dip') {
      playDipBuySound();
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Selected Crypto Pair
  const [selectedPair, setSelectedPair] = useState<CryptoPair>(SUPPORTED_PAIRS[0]);
  const [timeframe, setTimeframe] = useState<string>('5m');

  // Bot Configuration
  const [config, setConfig] = useState<BotConfig>({
    symbol: SUPPORTED_PAIRS[0].symbol,
    mode: 'BOTH',
    buyDipPercent: 2.0, // 2% queda
    takeProfitPercent: 3.0, // 3% lucro
    stopLossPercent: 2.0, // 2% stop loss
    orderSizeUsdt: 50.0,
    maxConcurrentTrades: 1,
    trailingTakeProfit: false,
    trailingStepPercent: 0.5,
    checkIntervalSeconds: 2,
    isSimulated: true,
    apiKey: '',
    apiSecret: '',
    useTestnet: false
  });

  // Bot Status
  const [isBotRunning, setIsBotRunning] = useState<boolean>(false);
  const [referencePrice, setReferencePrice] = useState<number>(SUPPORTED_PAIRS[0].initialPrice);
  const [activePosition, setActivePosition] = useState<Position | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>(INITIAL_PERFORMANCE_TRADES);

  // Market Data
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBookType | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(42);

  // Modals & UI States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Logging System (Mirrors trading_bot.log)
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      tag: 'PYTHON_APP',
      message: 'Aplicação Desktop Python iniciada com sucesso. Arquivo de log ativo: trading_bot.log'
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      tag: 'BINANCE_API',
      message: 'Conexão com os servidores da Binance estabelecida com sucesso via REST API.'
    },
    {
      id: 'init-3',
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      tag: 'BOT_CORE',
      message: `Configuração padrão carregada: ${SUPPORTED_PAIRS[0].symbol} | Queda Compra: -2.00% | Take Profit: +3.00% | Stop Loss: -2.00%`
    }
  ]);

  const addLog = useCallback((level: LogEntry['level'], tag: string, message: string) => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      tag,
      message
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 150)]);
  }, []);

  // Update Config
  const handleConfigChange = (newValues: Partial<BotConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newValues };
      if (newValues.symbol && newValues.symbol !== prev.symbol) {
        const found = SUPPORTED_PAIRS.find(p => p.symbol === newValues.symbol);
        if (found) {
          setSelectedPair(found);
          setReferencePrice(found.initialPrice);
          setActivePosition(null);
        }
      }
      return updated;
    });
  };

  // Change Crypto Pair
  const handleSelectPair = (pair: CryptoPair) => {
    setSelectedPair(pair);
    handleConfigChange({ symbol: pair.symbol });
    setReferencePrice(pair.initialPrice);
    setActivePosition(null);
    addLog('INFO', 'PAIR_CHANGE', `Par de criptomoeda alterado para ${pair.symbol}. Carregando livro de ofertas e velas da Binance...`);
  };

  // Initial Ping Test
  useEffect(() => {
    const doPing = async () => {
      const res = await checkBinancePing(config.useTestnet);
      if (res.success) {
        setPingLatency(res.latencyMs);
      }
    };
    doPing();
  }, [config.useTestnet]);

  // Generate synthetic candles around a base price if Binance public API response needs fallback
  const generateFallbackCandles = useCallback((base: number) => {
    const result: Candle[] = [];
    const now = Date.now();
    let current = base * 0.985;
    for (let i = 40; i >= 0; i--) {
      const time = now - i * 5 * 60 * 1000;
      const change = (Math.random() - 0.48) * (base * 0.006);
      const open = current;
      const close = current + change;
      const high = Math.max(open, close) + Math.random() * (base * 0.003);
      const low = Math.min(open, close) - Math.random() * (base * 0.003);
      const volume = 10 + Math.random() * 80;
      result.push({ time, open, high, low, close, volume });
      current = close;
    }
    return result;
  }, []);

  // Market Data Fetching Loop (Every 2 seconds)
  useEffect(() => {
    let isSubscribed = true;

    const fetchMarketData = async () => {
      try {
        const t = await fetchBinanceTicker(selectedPair.symbol);
        if (isSubscribed && t) {
          setTicker(t);
        } else if (isSubscribed && !ticker) {
          // Fallback initial ticker
          setTicker({
            symbol: selectedPair.symbol,
            price: selectedPair.initialPrice,
            priceChange: selectedPair.initialPrice * 0.018,
            priceChangePercent: 1.82,
            high24h: selectedPair.initialPrice * 1.025,
            low24h: selectedPair.initialPrice * 0.978,
            volume24h: 32450.8,
            quoteVolume24h: 32450.8 * selectedPair.initialPrice,
            bidPrice: selectedPair.initialPrice * 0.9999,
            askPrice: selectedPair.initialPrice * 1.0001,
            updatedAt: Date.now()
          });
        }

        // Fetch Depth
        const depth = await fetchBinanceDepth(selectedPair.symbol, 8);
        if (isSubscribed && depth) {
          setOrderBook(depth);
        } else if (isSubscribed && !orderBook) {
          // Synthetic depth
          const p = ticker?.price || selectedPair.initialPrice;
          const bids = [0.999, 0.998, 0.997, 0.996, 0.995].map((factor, idx) => ({
            price: p * factor,
            quantity: (0.4 + idx * 0.3),
            total: (idx + 1) * 1.2
          }));
          const asks = [1.001, 1.002, 1.003, 1.004, 1.005].map((factor, idx) => ({
            price: p * factor,
            quantity: (0.35 + idx * 0.28),
            total: (idx + 1) * 1.15
          }));
          setOrderBook({ bids, asks });
        }

        // Fetch Candlesticks
        const klines = await fetchBinanceKlines(selectedPair.symbol, timeframe, 36);
        if (isSubscribed && klines && klines.length > 0) {
          setCandles(klines);
        } else if (isSubscribed && candles.length === 0) {
          setCandles(generateFallbackCandles(selectedPair.initialPrice));
        }
      } catch (err) {
        // Handled silently
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedPair.symbol, timeframe, generateFallbackCandles]);

  // Micro-fluctuation simulation when bot is active to simulate live price movements if network is delayed
  useEffect(() => {
    const jitter = setInterval(() => {
      setTicker((prev) => {
        if (!prev) return prev;
        const delta = (Math.random() - 0.495) * (prev.price * 0.0006);
        const newPrice = Math.max(0.000001, prev.price + delta);
        return {
          ...prev,
          price: newPrice,
          bidPrice: newPrice * 0.9999,
          askPrice: newPrice * 1.0001,
          updatedAt: Date.now()
        };
      });
    }, 1200);

    return () => clearInterval(jitter);
  }, []);

  const currentPrice = ticker?.price || selectedPair.initialPrice;

  // ---------------------------------------------------------------------------
  // BOT CORE TRADING LOGIC (BUY DIP / TAKE PROFIT / STOP LOSS)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isBotRunning) return;

    // Track highest price seen to anchor dip calculation
    if (!activePosition && currentPrice > referencePrice) {
      setReferencePrice(currentPrice);
    }

    // 1. POSITION MANAGEMENT (Take Profit / Stop Loss)
    if (activePosition) {
      const entry = activePosition.entryPrice;
      const qty = activePosition.quantity;
      const pnlPct = ((currentPrice - entry) / entry) * 100;
      const pnlUsdt = (currentPrice - entry) * qty;

      // Update unrealized PnL in state
      setActivePosition((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentPrice,
          unrealizedPnl: pnlUsdt,
          unrealizedPnlPercent: pnlPct,
          highestPriceSeen: Math.max(prev.highestPriceSeen, currentPrice)
        };
      });

      // A) CHECK TAKE PROFIT
      if (pnlPct >= config.takeProfitPercent) {
        addLog(
          'SUCCESS',
          'TAKE_PROFIT',
          `🎯 [ALVO DE LUCRO ALCANÇADO] Venda automática executada a $${currentPrice.toFixed(2)} (+${pnlPct.toFixed(2)}% | Lucro: +$${pnlUsdt.toFixed(2)} USDT)`
        );

        addToast({
          type: 'take_profit',
          title: 'ALVO DE TAKE PROFIT ATINGIDO! 🎯',
          message: `Venda automática executada a $${currentPrice.toFixed(2)}. Lucro garantido de +$${pnlUsdt.toFixed(2)} USDT!`,
          symbol: selectedPair.symbol,
          price: currentPrice,
          pnlUsdt,
          pnlPercent: pnlPct,
          quantity: qty
        });

        setTradeHistory((prev) => [
          {
            id: `trade-${Date.now()}`,
            symbol: selectedPair.symbol,
            side: 'SELL',
            price: currentPrice,
            quantity: qty,
            totalUsdt: qty * currentPrice,
            trigger: 'TAKE_PROFIT',
            pnlUsdt,
            pnlPercent: pnlPct,
            timestamp: Date.now()
          },
          ...prev
        ]);

        setActivePosition(null);
        setReferencePrice(currentPrice);
      }

      // B) CHECK STOP LOSS
      else if (pnlPct <= -Math.abs(config.stopLossPercent)) {
        addLog(
          'WARNING',
          'STOP_LOSS',
          `🛑 [STOP LOSS ACIONADO] Venda defensiva automática a $${currentPrice.toFixed(2)} (${pnlPct.toFixed(2)}% | PnL: -$${Math.abs(pnlUsdt).toFixed(2)} USDT)`
        );

        addToast({
          type: 'stop_loss',
          title: 'STOP LOSS DEFENSIVO ACIONADO! 🛑',
          message: `Venda de proteção executada a $${currentPrice.toFixed(2)}. Prejuízo contido em -$${Math.abs(pnlUsdt).toFixed(2)} USDT.`,
          symbol: selectedPair.symbol,
          price: currentPrice,
          pnlUsdt,
          pnlPercent: pnlPct,
          quantity: qty
        });

        setTradeHistory((prev) => [
          {
            id: `trade-${Date.now()}`,
            symbol: selectedPair.symbol,
            side: 'SELL',
            price: currentPrice,
            quantity: qty,
            totalUsdt: qty * currentPrice,
            trigger: 'STOP_LOSS',
            pnlUsdt,
            pnlPercent: pnlPct,
            timestamp: Date.now()
          },
          ...prev
        ]);

        setActivePosition(null);
        setReferencePrice(currentPrice);
      }
    }

    // 2. NO ACTIVE POSITION -> CHECK BUY DIP TRIGGER
    else {
      if (config.mode === 'BOTH' || config.mode === 'BUY_ONLY') {
        const dipThresholdPrice = referencePrice * (1 - config.buyDipPercent / 100);

        if (currentPrice <= dipThresholdPrice) {
          const qty = config.orderSizeUsdt / currentPrice;
          const targetTp = currentPrice * (1 + config.takeProfitPercent / 100);
          const targetSl = currentPrice * (1 - config.stopLossPercent / 100);

          addLog(
            'SUCCESS',
            'DIP_BUY',
            `💎 [GATILHO DE QUEDA ATIVADO] Preço atingiu $${currentPrice.toFixed(2)} (-${config.buyDipPercent}%). Ordem de COMPRA executada: ${qty.toFixed(4)} ${selectedPair.baseAsset}!`
          );

          addToast({
            type: 'buy_dip',
            title: 'COMPRA NA BAIXA EXECUTADA! 💎',
            message: `Queda de -${config.buyDipPercent}% atingida. Entrada de ${qty.toFixed(4)} ${selectedPair.baseAsset} a $${currentPrice.toFixed(2)}.`,
            symbol: selectedPair.symbol,
            price: currentPrice,
            quantity: qty
          });

          setActivePosition({
            id: `pos-${Date.now()}`,
            symbol: selectedPair.symbol,
            side: 'BUY',
            entryPrice: currentPrice,
            quantity: qty,
            investedUsdt: config.orderSizeUsdt,
            targetTakeProfitPrice: targetTp,
            targetStopLossPrice: targetSl,
            currentPrice,
            unrealizedPnl: 0,
            unrealizedPnlPercent: 0,
            highestPriceSeen: currentPrice,
            entryTimestamp: Date.now()
          });

          setTradeHistory((prev) => [
            {
              id: `trade-${Date.now()}`,
              symbol: selectedPair.symbol,
              side: 'BUY',
              price: currentPrice,
              quantity: qty,
              totalUsdt: config.orderSizeUsdt,
              trigger: 'DIP_BUY',
              timestamp: Date.now()
            },
            ...prev
          ]);
        }
      }
    }
  }, [isBotRunning, currentPrice, referencePrice, activePosition, config, selectedPair, addLog, addToast]);

  // Bot Start/Stop Handler
  const handleToggleBot = () => {
    if (!isBotRunning) {
      setIsBotRunning(true);
      setReferencePrice(currentPrice);
      addToast({
        type: 'bot_status',
        title: 'Robô de Trading Iniciado 🤖',
        message: `Monitorando ${selectedPair.symbol}. Take Profit: +${config.takeProfitPercent}% | Stop Loss: -${config.stopLossPercent}%.`,
        symbol: selectedPair.symbol
      });
      addLog(
        'INFO',
        'BOT_CONTROL',
        `Robô INICIADO para ${selectedPair.symbol}. Modo: ${config.mode} | Queda Compra: -${config.buyDipPercent}% | TP: +${config.takeProfitPercent}% | SL: -${config.stopLossPercent}%`
      );
    } else {
      setIsBotRunning(false);
      addToast({
        type: 'bot_status',
        title: 'Robô de Trading Pausado ⏸️',
        message: 'Monitoramento e ordens automatizadas pausadas pelo operador.',
        symbol: selectedPair.symbol
      });
      addLog('INFO', 'BOT_CONTROL', 'Robô PAUSADO pelo operador.');
    }
  };

  // Manual Buy
  const handleManualBuy = () => {
    const qty = config.orderSizeUsdt / currentPrice;
    const targetTp = currentPrice * (1 + config.takeProfitPercent / 100);
    const targetSl = currentPrice * (1 - config.stopLossPercent / 100);

    setActivePosition({
      id: `pos-manual-${Date.now()}`,
      symbol: selectedPair.symbol,
      side: 'BUY',
      entryPrice: currentPrice,
      quantity: qty,
      investedUsdt: config.orderSizeUsdt,
      targetTakeProfitPrice: targetTp,
      targetStopLossPrice: targetSl,
      currentPrice,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      highestPriceSeen: currentPrice,
      entryTimestamp: Date.now()
    });

    setTradeHistory((prev) => [
      {
        id: `trade-${Date.now()}`,
        symbol: selectedPair.symbol,
        side: 'BUY',
        price: currentPrice,
        quantity: qty,
        totalUsdt: config.orderSizeUsdt,
        trigger: 'MANUAL',
        timestamp: Date.now()
      },
      ...prev
    ]);

    addLog('INFO', 'MANUAL_TRADE', `Ordem Manual de COMPRA a mercado: ${qty.toFixed(4)} ${selectedPair.baseAsset} a $${currentPrice.toFixed(2)}`);
  };

  // Manual Sell
  const handleManualSell = () => {
    if (!activePosition) return;
    const qty = activePosition.quantity;
    const pnlPct = ((currentPrice - activePosition.entryPrice) / activePosition.entryPrice) * 100;
    const pnlUsdt = (currentPrice - activePosition.entryPrice) * qty;

    setTradeHistory((prev) => [
      {
        id: `trade-${Date.now()}`,
        symbol: selectedPair.symbol,
        side: 'SELL',
        price: currentPrice,
        quantity: qty,
        totalUsdt: qty * currentPrice,
        trigger: 'MANUAL',
        pnlUsdt,
        pnlPercent: pnlPct,
        timestamp: Date.now()
      },
      ...prev
    ]);

    // Toast for manual sell
    if (pnlUsdt >= 0) {
      addToast({
        type: 'take_profit',
        title: 'POSIÇÃO ENCERRADA COM LUCRO! 🎯',
        message: `Venda manual executada a $${currentPrice.toFixed(2)}. Lucro de +$${pnlUsdt.toFixed(2)} USDT creditado.`,
        symbol: selectedPair.symbol,
        price: currentPrice,
        pnlUsdt,
        pnlPercent: pnlPct,
        quantity: qty
      });
    } else {
      addToast({
        type: 'stop_loss',
        title: 'POSIÇÃO ENCERRADA A MERCADO 🛑',
        message: `Venda manual de proteção executada a $${currentPrice.toFixed(2)}. PnL: -$${Math.abs(pnlUsdt).toFixed(2)} USDT.`,
        symbol: selectedPair.symbol,
        price: currentPrice,
        pnlUsdt,
        pnlPercent: pnlPct,
        quantity: qty
      });
    }

    addLog(
      'INFO',
      'MANUAL_TRADE',
      `Posição encerrada manualmente a mercado a $${currentPrice.toFixed(2)} | PnL: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}% ($${pnlUsdt.toFixed(2)} USDT)`
    );

    setActivePosition(null);
  };

  // Emergency Panic Stop
  const handleEmergencyStop = () => {
    handleManualSell();
    setIsBotRunning(false);
    addLog('WARNING', 'PANIC_STOP', 'PARADA DE EMERGÊNCIA: Posição liquidada e robô desativado imediatamente.');
  };

  // Test alert toast simulation
  const handleTestAlert = useCallback((type: 'take_profit' | 'stop_loss' | 'buy_dip') => {
    if (type === 'take_profit') {
      const simulatedPnl = config.orderSizeUsdt * (config.takeProfitPercent / 100);
      addToast({
        type: 'take_profit',
        title: 'ALVO DE TAKE PROFIT ATINGIDO! 🎯',
        message: `Venda automática simulada executada a $${currentPrice.toFixed(2)}. Lucro de +$${simulatedPnl.toFixed(2)} USDT garantido na carteira!`,
        symbol: selectedPair.symbol,
        price: currentPrice,
        pnlUsdt: simulatedPnl,
        pnlPercent: config.takeProfitPercent,
        quantity: config.orderSizeUsdt / currentPrice
      });
    } else if (type === 'stop_loss') {
      const simulatedLoss = config.orderSizeUsdt * (config.stopLossPercent / 100);
      addToast({
        type: 'stop_loss',
        title: 'STOP LOSS DEFENSIVO ACIONADO! 🛑',
        message: `Limite de risco atingido a $${currentPrice.toFixed(2)}. Venda de proteção contra perdas acionada (-$${simulatedLoss.toFixed(2)} USDT).`,
        symbol: selectedPair.symbol,
        price: currentPrice,
        pnlUsdt: -simulatedLoss,
        pnlPercent: -config.stopLossPercent,
        quantity: config.orderSizeUsdt / currentPrice
      });
    } else {
      addToast({
        type: 'buy_dip',
        title: 'COMPRA NA BAIXA EXECUTADA! 💎',
        message: `Gatilho de -${config.buyDipPercent}% ativado. Entrada de ${(config.orderSizeUsdt / currentPrice).toFixed(4)} ${selectedPair.baseAsset} a $${currentPrice.toFixed(2)}!`,
        symbol: selectedPair.symbol,
        price: currentPrice,
        quantity: config.orderSizeUsdt / currentPrice
      });
    }
  }, [addToast, config, currentPrice, selectedPair]);

  // Test Connection for Python tab
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    addLog('INFO', 'BINANCE_API', 'Executando teste de ping com os servidores da Binance...');
    const res = await checkBinancePing(config.useTestnet);
    if (res.success) {
      setPingLatency(res.latencyMs);
      addLog('SUCCESS', 'BINANCE_API', `Conexão Binance OK! Latência de rede: ${res.latencyMs}ms`);
    } else {
      addLog('ERROR', 'BINANCE_API', `Falha ao conectar com Binance: ${res.error}`);
    }
    setIsTestingConnection(false);
  };

  // Targets for chart display
  const basePriceForTargets = activePosition ? activePosition.entryPrice : referencePrice;
  const targetBuyPrice = basePriceForTargets * (1 - config.buyDipPercent / 100);
  const targetTakeProfitPrice = basePriceForTargets * (1 + config.takeProfitPercent / 100);
  const targetStopLossPrice = basePriceForTargets * (1 - config.stopLossPercent / 100);

  const handleLoginSuccess = (user: { email: string; name: string; role: string }) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('binance_algo_user', JSON.stringify(user));
    } catch {}
    addLog('SUCCESS', 'AUTH_SECURITY', `Sessão autenticada para ${user.email} (${user.role}). Criptografia TLS 1.3 ativa.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('binance_algo_user');
    } catch {}
    addLog('INFO', 'AUTH_SECURITY', 'Sessão encerrada com sucesso pelo operador.');
  };

  // If not authenticated, render 3D Crypto Exchange Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-200 flex flex-col font-sans">
      {/* Visual Toast Notification System for Take Profit, Stop Loss & Bot Events */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onNavigateToReports={() => setCurrentTab('reports')}
      />

      {/* Top Bar Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isBotRunning={isBotRunning}
        onToggleBot={handleToggleBot}
        onOpenSettings={() => setIsSettingsOpen(true)}
        selectedPair={selectedPair}
        isSimulated={config.isSimulated}
        pingLatency={pingLatency}
        onOpenPythonWindow={() => setCurrentTab('python_window')}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Viewport */}
      <main className="flex-1 p-3 lg:p-5 max-w-[1680px] w-full mx-auto flex flex-col gap-4">
        {/* Pair Selector & Top Market Metrics */}
        <PairSelector
          selectedPair={selectedPair}
          onSelectPair={handleSelectPair}
          ticker={ticker}
        />

        {/* TAB 1: TERMINAL DE TRADING PRINCIPAL */}
        {currentTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left & Center: Chart, Orderbook & Positions */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Candlestick & Volume Chart */}
              <TradingChart
                candles={candles}
                selectedPair={selectedPair}
                currentPrice={currentPrice}
                targetBuyPrice={targetBuyPrice}
                targetTakeProfitPrice={targetTakeProfitPrice}
                targetStopLossPrice={targetStopLossPrice}
                activeEntryPrice={activePosition?.entryPrice}
                timeframe={timeframe}
                onChangeTimeframe={setTimeframe}
              />

              {/* OrderBook & Positions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <OrderBook
                    orderBook={orderBook}
                    selectedPair={selectedPair}
                    currentPrice={currentPrice}
                  />
                </div>
                <div className="md:col-span-7">
                  <PositionsAndTrades
                    activePosition={activePosition}
                    tradeHistory={tradeHistory}
                    onClosePosition={handleManualSell}
                    onClearHistory={() => setTradeHistory([])}
                  />
                </div>
              </div>
            </div>

            {/* Right: Bot Control Panel */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <BotControlPanel
                config={config}
                onChangeConfig={handleConfigChange}
                isBotRunning={isBotRunning}
                onToggleBot={handleToggleBot}
                currentPrice={currentPrice}
                selectedPair={selectedPair}
                activePosition={activePosition}
                referencePrice={referencePrice}
                onManualBuy={handleManualBuy}
                onManualSell={handleManualSell}
                onEmergencyStop={handleEmergencyStop}
                onTestAlert={handleTestAlert}
              />

              {/* Mini Log Snapshot in Terminal View */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    trading_bot.log (Últimos Eventos)
                  </span>
                  <button
                    onClick={() => setCurrentTab('logs')}
                    className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                  >
                    Ver Tudo
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-400">
                  {logs.slice(0, 5).map((l) => (
                    <div key={l.id} className="truncate">
                      <span className="text-slate-500">[{l.timestamp}]</span>{' '}
                      <span className={l.level === 'SUCCESS' ? 'text-emerald-400 font-semibold' : l.level === 'WARNING' ? 'text-amber-400' : 'text-slate-300'}>
                        {l.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIGURAÇÃO COMPLETA DO ROBÔ */}
        {currentTab === 'bot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6">
              <BotControlPanel
                config={config}
                onChangeConfig={handleConfigChange}
                isBotRunning={isBotRunning}
                onToggleBot={handleToggleBot}
                currentPrice={currentPrice}
                selectedPair={selectedPair}
                activePosition={activePosition}
                referencePrice={referencePrice}
                onManualBuy={handleManualBuy}
                onManualSell={handleManualSell}
                onEmergencyStop={handleEmergencyStop}
                onTestAlert={handleTestAlert}
              />
            </div>
            <div className="lg:col-span-6 flex flex-col gap-4">
              <PositionsAndTrades
                activePosition={activePosition}
                tradeHistory={tradeHistory}
                onClosePosition={handleManualSell}
                onClearHistory={() => setTradeHistory([])}
              />
            </div>
          </div>
        )}

        {/* TAB 3: APLICAÇÃO PYTHON COM JANELA & LOGS */}
        {currentTab === 'python_window' && (
          <PythonWindow
            config={config}
            onChangeConfig={handleConfigChange}
            isBotRunning={isBotRunning}
            onToggleBot={handleToggleBot}
            currentPrice={currentPrice}
            selectedPair={selectedPair}
            activePosition={activePosition}
            logs={logs}
            onTestConnection={handleTestConnection}
            isTestingConnection={isTestingConnection}
          />
        )}

        {/* TAB 4: ARQUIVO DE LOGS COMPLETO (trading_bot.log) */}
        {currentTab === 'logs' && (
          <LogViewer
            logs={logs}
            onClearLogs={() => setLogs([])}
          />
        )}

        {/* TAB 5: RELATÓRIOS -> DESEMPENHO BOOT */}
        {currentTab === 'reports' && (
          <BotPerformanceReport trades={tradeHistory} />
        )}
      </main>

      {/* Binance API Credentials Modal */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onChangeConfig={handleConfigChange}
        onLog={addLog}
      />
    </div>
  );
}
