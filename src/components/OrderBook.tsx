import React from 'react';
import { OrderBook as OrderBookType, CryptoPair } from '../types/trading';

interface OrderBookProps {
  orderBook: OrderBookType | null;
  selectedPair: CryptoPair;
  currentPrice: number;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  orderBook,
  selectedPair,
  currentPrice
}) => {
  const bids = orderBook?.bids.slice(0, 7) || [];
  const asks = orderBook?.asks.slice(0, 7).reverse() || [];

  const maxTotal = Math.max(
    ...(bids.map(b => b.total)),
    ...(asks.map(a => a.total)),
    1
  );

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase">
          Livro de Ordens (Depth)
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">
          Binance L2
        </span>
      </div>

      <div className="grid grid-cols-3 text-[10px] text-slate-400 font-mono pb-1 border-b border-slate-800/60 px-1">
        <span>Preço ({selectedPair.quoteAsset})</span>
        <span className="text-right">Qtd ({selectedPair.baseAsset})</span>
        <span className="text-right">Total</span>
      </div>

      {/* ASKS (Vendas - Vermelho) */}
      <div className="flex flex-col gap-0.5">
        {asks.map((ask, i) => {
          const depthPct = Math.min(100, (ask.total / maxTotal) * 100);
          return (
            <div key={`ask-${i}`} className="relative flex items-center justify-between text-[11px] font-mono-numbers py-0.5 px-1 rounded hover:bg-slate-800/40">
              <div
                className="absolute right-0 top-0 bottom-0 bg-red-500/10 pointer-events-none rounded-r"
                style={{ width: `${depthPct}%` }}
              />
              <span className="text-red-400 relative z-10 font-semibold">
                ${ask.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: selectedPair.priceDecimals })}
              </span>
              <span className="text-slate-300 relative z-10 text-right">
                {ask.quantity.toFixed(selectedPair.qtyDecimals > 3 ? 3 : selectedPair.qtyDecimals)}
              </span>
              <span className="text-slate-400 relative z-10 text-right">
                {ask.total.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mid Market Price Banner */}
      <div className="py-1.5 px-2 bg-slate-900 border-y border-slate-800/90 flex items-center justify-between font-mono-numbers">
        <span className="text-xs font-bold text-white">
          ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: selectedPair.priceDecimals })}
        </span>
        <span className="text-[10px] text-slate-400">
          Spread: $0.02 (0.01%)
        </span>
      </div>

      {/* BIDS (Compras - Verde) */}
      <div className="flex flex-col gap-0.5">
        {bids.map((bid, i) => {
          const depthPct = Math.min(100, (bid.total / maxTotal) * 100);
          return (
            <div key={`bid-${i}`} className="relative flex items-center justify-between text-[11px] font-mono-numbers py-0.5 px-1 rounded hover:bg-slate-800/40">
              <div
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none rounded-r"
                style={{ width: `${depthPct}%` }}
              />
              <span className="text-emerald-400 relative z-10 font-semibold">
                ${bid.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: selectedPair.priceDecimals })}
              </span>
              <span className="text-slate-300 relative z-10 text-right">
                {bid.quantity.toFixed(selectedPair.qtyDecimals > 3 ? 3 : selectedPair.qtyDecimals)}
              </span>
              <span className="text-slate-400 relative z-10 text-right">
                {bid.total.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
