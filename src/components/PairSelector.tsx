import React, { useState } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { CryptoPair, TickerData } from '../types/trading';
import { SUPPORTED_PAIRS } from '../data/cryptoPairs';

interface PairSelectorProps {
  selectedPair: CryptoPair;
  onSelectPair: (pair: CryptoPair) => void;
  ticker: TickerData | null;
}

export const PairSelector: React.FC<PairSelectorProps> = ({
  selectedPair,
  onSelectPair,
  ticker
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredPairs = SUPPORTED_PAIRS.filter(p =>
    p.symbol.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.baseAsset.toLowerCase().includes(search.toLowerCase())
  );

  const price = ticker?.price ?? selectedPair.initialPrice;
  const changePct = ticker?.priceChangePercent ?? 1.84;
  const isPositive = changePct >= 0;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-3 lg:gap-6 bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-lg">
        {/* Pair Dropdown Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors cursor-pointer text-left"
        >
          <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center font-mono">
            {selectedPair.baseAsset.slice(0, 3)}
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>{selectedPair.baseAsset}</span>
              <span className="text-slate-400 font-normal">/{selectedPair.quoteAsset}</span>
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Live Metrics Header */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-8 text-xs font-mono-numbers">
          {/* Last Price */}
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Preço Atual</div>
            <div className={`text-base lg:text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: selectedPair.priceDecimals })}
            </div>
          </div>

          {/* 24h Change */}
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Variação 24h</div>
            <div className={`font-semibold flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>{isPositive ? '+' : ''}{changePct.toFixed(2)}%</span>
            </div>
          </div>

          {/* 24h High */}
          <div className="hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Máxima 24h</div>
            <div className="text-slate-200 font-medium">
              ${(ticker?.high24h ?? (price * 1.025)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* 24h Low */}
          <div className="hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Mínima 24h</div>
            <div className="text-slate-200 font-medium">
              ${(ticker?.low24h ?? (price * 0.978)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* 24h Volume */}
          <div className="hidden md:block">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">Volume 24h ({selectedPair.baseAsset})</div>
            <div className="text-slate-300 font-medium">
              {(ticker?.volume24h ?? 28450.45).toLocaleString('en-US', { maximumFractionDigits: 1 })}
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-[#0f172a] border border-slate-700/80 rounded-lg shadow-2xl z-50 overflow-hidden">
            <div className="p-2.5 border-b border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar par cripto (ex: BTC, ETH, SOL)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/40">
              {filteredPairs.map((p) => {
                const isSelected = p.symbol === selectedPair.symbol;
                return (
                  <button
                    key={p.symbol}
                    onClick={() => {
                      onSelectPair(p);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/70 transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-800/90 text-white' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-mono font-bold text-amber-400">
                        {p.baseAsset.slice(0, 3)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                          {p.baseAsset}
                          <span className="text-slate-400 font-normal">/{p.quoteAsset}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans truncate max-w-[140px]">
                          {p.name}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono-numbers">
                      <div className="text-xs font-semibold text-slate-200">
                        ${p.initialPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Spot Binance
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 ml-2 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
