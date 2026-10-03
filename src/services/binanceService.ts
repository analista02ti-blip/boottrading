import { Candle, OrderBook, TickerData } from '../types/trading';

const BINANCE_PUBLIC_BASE = 'https://api.binance.com';
const BINANCE_TESTNET_BASE = 'https://testnet.binance.vision';

/**
 * Generate HMAC SHA-256 signature for Binance API authentication
 */
export async function createBinanceSignature(queryString: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(queryString);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetch 24hr Ticker from Binance REST API
 */
export async function fetchBinanceTicker(symbol: string): Promise<TickerData | null> {
  try {
    const res = await fetch(`${BINANCE_PUBLIC_BASE}/api/v3/ticker/24hr?symbol=${symbol}`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      priceChange: parseFloat(data.priceChange),
      priceChangePercent: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      volume24h: parseFloat(data.volume),
      quoteVolume24h: parseFloat(data.quoteVolume),
      bidPrice: parseFloat(data.bidPrice),
      askPrice: parseFloat(data.askPrice),
      updatedAt: Date.now()
    };
  } catch (err) {
    return null;
  }
}

/**
 * Fetch Candlesticks (klines) from Binance REST API
 */
export async function fetchBinanceKlines(symbol: string, interval: string = '5m', limit: number = 40): Promise<Candle[]> {
  try {
    const res = await fetch(`${BINANCE_PUBLIC_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    return rawData.map((k: any) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Fetch Order Book Depth from Binance REST API
 */
export async function fetchBinanceDepth(symbol: string, limit: number = 10): Promise<OrderBook | null> {
  try {
    const res = await fetch(`${BINANCE_PUBLIC_BASE}/api/v3/depth?symbol=${symbol}&limit=${limit}`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    let bidCum = 0;
    const bids = data.bids.map((b: string[]) => {
      const p = parseFloat(b[0]);
      const q = parseFloat(b[1]);
      bidCum += q;
      return { price: p, quantity: q, total: bidCum };
    });

    let askCum = 0;
    const asks = data.asks.map((a: string[]) => {
      const p = parseFloat(a[0]);
      const q = parseFloat(a[1]);
      askCum += q;
      return { price: p, quantity: q, total: askCum };
    });

    return { bids, asks };
  } catch (err) {
    return null;
  }
}

/**
 * Ping Binance API to verify connectivity & latency
 */
export async function checkBinancePing(useTestnet = false): Promise<{ success: boolean; latencyMs: number; serverTime?: number; error?: string }> {
  const base = useTestnet ? BINANCE_TESTNET_BASE : BINANCE_PUBLIC_BASE;
  const start = performance.now();
  try {
    const res = await fetch(`${base}/api/v3/time`, { cache: 'no-store' });
    const latency = Math.round(performance.now() - start);
    if (!res.ok) {
      return { success: false, latencyMs: latency, error: `Status ${res.status}` };
    }
    const data = await res.json();
    return { success: true, latencyMs: latency, serverTime: data.serverTime };
  } catch (err: any) {
    return { success: false, latencyMs: Math.round(performance.now() - start), error: err.message || 'Falha na conexão de rede' };
  }
}

/**
 * Check Binance Account with API Key and Secret (Signed Request)
 */
export async function checkBinanceAccount(apiKey: string, apiSecret: string, useTestnet = false): Promise<{ success: boolean; balances?: any[]; error?: string }> {
  if (!apiKey || !apiSecret) {
    return { success: false, error: 'API Key e Secret são obrigatórios' };
  }
  const base = useTestnet ? BINANCE_TESTNET_BASE : BINANCE_PUBLIC_BASE;
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&recvWindow=5000`;
    const signature = await createBinanceSignature(queryString, apiSecret);

    const res = await fetch(`${base}/api/v3/account?${queryString}&signature=${signature}`, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.msg || `Erro na API Binance (${data.code})` };
    }

    const nonZeroBalances = (data.balances || []).filter(
      (b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    );

    return { success: true, balances: nonZeroBalances };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao comunicar com Binance API' };
  }
}

/**
 * Execute Spot Order on Binance (Test/Real)
 */
export async function executeBinanceOrder(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  useTestnet = false
): Promise<{ success: boolean; orderId?: string; price?: number; error?: string }> {
  const base = useTestnet ? BINANCE_TESTNET_BASE : BINANCE_PUBLIC_BASE;
  try {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}&recvWindow=5000`;
    const signature = await createBinanceSignature(queryString, apiSecret);

    const res = await fetch(`${base}/api/v3/order?${queryString}&signature=${signature}`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.msg || `Código erro: ${data.code}` };
    }

    return {
      success: true,
      orderId: String(data.orderId || Date.now()),
      price: data.fills && data.fills.length > 0 ? parseFloat(data.fills[0].price) : undefined
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
