import { CryptoPair } from '../types/trading';

export const SUPPORTED_PAIRS: CryptoPair[] = [
  {
    symbol: 'BTCUSDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    name: 'Bitcoin / TetherUS',
    priceDecimals: 2,
    qtyDecimals: 5,
    minNotional: 10,
    initialPrice: 65420.50
  },
  {
    symbol: 'ETHUSDT',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    name: 'Ethereum / TetherUS',
    priceDecimals: 2,
    qtyDecimals: 4,
    minNotional: 10,
    initialPrice: 2640.80
  },
  {
    symbol: 'SOLUSDT',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    name: 'Solana / TetherUS',
    priceDecimals: 2,
    qtyDecimals: 2,
    minNotional: 10,
    initialPrice: 154.20
  },
  {
    symbol: 'BNBUSDT',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    name: 'BNB / TetherUS',
    priceDecimals: 2,
    qtyDecimals: 3,
    minNotional: 10,
    initialPrice: 588.60
  },
  {
    symbol: 'XRPUSDT',
    baseAsset: 'XRP',
    quoteAsset: 'USDT',
    name: 'Ripple / TetherUS',
    priceDecimals: 4,
    qtyDecimals: 1,
    minNotional: 10,
    initialPrice: 0.5840
  },
  {
    symbol: 'ADAUSDT',
    baseAsset: 'ADA',
    quoteAsset: 'USDT',
    name: 'Cardano / TetherUS',
    priceDecimals: 4,
    qtyDecimals: 1,
    minNotional: 10,
    initialPrice: 0.3820
  },
  {
    symbol: 'DOGEUSDT',
    baseAsset: 'DOGE',
    quoteAsset: 'USDT',
    name: 'Dogecoin / TetherUS',
    priceDecimals: 5,
    qtyDecimals: 0,
    minNotional: 10,
    initialPrice: 0.12450
  },
  {
    symbol: 'AVAXUSDT',
    baseAsset: 'AVAX',
    quoteAsset: 'USDT',
    name: 'Avalanche / TetherUS',
    priceDecimals: 2,
    qtyDecimals: 2,
    minNotional: 10,
    initialPrice: 28.75
  },
  {
    symbol: 'LINKUSDT',
    baseAsset: 'LINK',
    quoteAsset: 'USDT',
    name: 'Chainlink / TetherUS',
    priceDecimals: 2,
    qtyDecimals: 2,
    minNotional: 10,
    initialPrice: 12.30
  },
  {
    symbol: 'NEARUSDT',
    baseAsset: 'NEAR',
    quoteAsset: 'USDT',
    name: 'NEAR Protocol / TetherUS',
    priceDecimals: 3,
    qtyDecimals: 1,
    minNotional: 10,
    initialPrice: 5.120
  },
  {
    symbol: 'SUIUSDT',
    baseAsset: 'SUI',
    quoteAsset: 'USDT',
    name: 'Sui Network / TetherUS',
    priceDecimals: 4,
    qtyDecimals: 1,
    minNotional: 10,
    initialPrice: 1.8450
  },
  {
    symbol: 'PEPEUSDT',
    baseAsset: 'PEPE',
    quoteAsset: 'USDT',
    name: 'Pepe / TetherUS',
    priceDecimals: 8,
    qtyDecimals: 0,
    minNotional: 10,
    initialPrice: 0.00000980
  }
];
