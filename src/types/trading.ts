export interface CryptoPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  name: string;
  priceDecimals: number;
  qtyDecimals: number;
  minNotional: number;
  initialPrice: number;
}

export type OperationMode = 'BOTH' | 'BUY_ONLY' | 'SELL_ONLY';

export interface BotConfig {
  symbol: string;
  mode: OperationMode;
  buyDipPercent: number; // Ex: 2.5% de queda para comprar
  takeProfitPercent: number; // Ex: 3.0% de lucro para vender
  stopLossPercent: number; // Ex: 2.0% de stop loss
  orderSizeUsdt: number; // Valor em USDT por ordem
  maxConcurrentTrades: number;
  trailingTakeProfit: boolean;
  trailingStepPercent: number;
  checkIntervalSeconds: number;
  isSimulated: boolean; // Simulação sem gastar fundos reais vs API Binance Real
  apiKey: string;
  apiSecret: string;
  useTestnet: boolean;
}

export interface TickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  bidPrice: number;
  askPrice: number;
  updatedAt: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface Position {
  id: string;
  symbol: string;
  side: 'BUY';
  entryPrice: number;
  quantity: number;
  investedUsdt: number;
  targetTakeProfitPrice: number;
  targetStopLossPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  highestPriceSeen: number;
  entryTimestamp: number;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  totalUsdt: number;
  trigger: 'DIP_BUY' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL';
  pnlUsdt?: number;
  pnlPercent?: number;
  timestamp: number;
  orderId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';
  tag: string;
  message: string;
}

export interface AccountBalance {
  usdt: number;
  crypto: number;
  lockedUsdt: number;
  lockedCrypto: number;
}
