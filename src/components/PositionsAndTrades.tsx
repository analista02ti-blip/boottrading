import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ArrowUpDown, 
  Filter,
  CheckCircle2,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Position, TradeRecord } from '../types/trading';

interface PositionsAndTradesProps {
  activePosition: Position | null;
  tradeHistory: TradeRecord[];
  onClosePosition: () => void;
  onClearHistory: () => void;
}

export const PositionsAndTrades: React.FC<PositionsAndTradesProps> = ({
  activePosition,
  tradeHistory,
  onClosePosition,
  onClearHistory
}) => {
  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Filter trade history based on search query
  const filteredTrades = useMemo(() => {
    if (!searchQuery.trim()) return tradeHistory;
    const query = searchQuery.toLowerCase().trim();

    return tradeHistory.filter((t) => {
      const symbolMatch = t.symbol.toLowerCase().includes(query);
      const sideMatch = (t.side === 'BUY' ? 'compra' : 'venda').includes(query);
      const priceMatch = t.price.toString().includes(query);
      
      let triggerText = '';
      if (t.trigger === 'DIP_BUY') triggerText = 'gatilho de queda compra';
      else if (t.trigger === 'TAKE_PROFIT') triggerText = 'alvo take profit lucro';
      else if (t.trigger === 'STOP_LOSS') triggerText = 'defesa stop loss prejuízo';
      else if (t.trigger === 'MANUAL') triggerText = 'ordem manual mercado';

      const triggerMatch = triggerText.toLowerCase().includes(query);
      const dateMatch = new Date(t.timestamp).toLocaleTimeString().includes(query);

      return symbolMatch || sideMatch || triggerMatch || priceMatch || dateMatch;
    });
  }, [tradeHistory, searchQuery]);

  // Reset page when search changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedTrades = filteredTrades.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      {/* 1. Active Position Section */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Posição Ativa em Aberto
          </h3>
          {activePosition && (
            <span className="text-[10px] font-mono text-slate-400">
              Entrada: {new Date(activePosition.entryTimestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {activePosition ? (
          <div className="mt-3 p-3.5 bg-slate-900/90 border border-slate-700/60 rounded-lg flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs font-mono">
                  COMPRADO (LONG)
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {activePosition.symbol}
                </span>
                <span className="text-xs text-slate-400 font-mono-numbers">
                  {activePosition.quantity.toFixed(4)} unidades (${activePosition.investedUsdt.toFixed(2)} USDT)
                </span>
              </div>

              {/* PnL Display */}
              <div className="flex items-center gap-2 font-mono-numbers">
                <span className="text-xs text-slate-400">Lucro/Prejuízo:</span>
                <span className={`text-sm font-bold ${
                  activePosition.unrealizedPnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {activePosition.unrealizedPnlPercent >= 0 ? '+' : ''}
                  {activePosition.unrealizedPnlPercent.toFixed(2)}% 
                  ({activePosition.unrealizedPnl >= 0 ? '+$' : '-$'}{Math.abs(activePosition.unrealizedPnl).toFixed(2)} USDT)
                </span>
              </div>
            </div>

            {/* Target comparison grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-numbers bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Preço de Entrada</div>
                <div className="font-semibold text-slate-200">${activePosition.entryPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Preço Atual</div>
                <div className="font-semibold text-white">${activePosition.currentPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-400 font-sans">Alvo Take Profit</div>
                <div className="font-semibold text-emerald-300">${activePosition.targetTakeProfitPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-red-400 font-sans">Gatilho Stop Loss</div>
                <div className="font-semibold text-red-300">${activePosition.targetStopLossPrice.toFixed(2)}</div>
              </div>
            </div>

            {/* Progress visual bar towards TP or SL */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers mb-1">
                <span className="text-red-400">Stop Loss: ${activePosition.targetStopLossPrice.toFixed(2)}</span>
                <span className="text-slate-200">Atual: ${activePosition.currentPrice.toFixed(2)}</span>
                <span className="text-emerald-400">Take Profit: ${activePosition.targetTakeProfitPrice.toFixed(2)}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-red-500/40 w-1/2 flex justify-end">
                  {activePosition.unrealizedPnlPercent < 0 && (
                    <div 
                      className="h-full bg-red-500" 
                      style={{ width: `${Math.min(100, Math.abs(activePosition.unrealizedPnlPercent) * 20)}%` }} 
                    />
                  )}
                </div>
                <div className="h-full bg-emerald-500/40 w-1/2 flex justify-start">
                  {activePosition.unrealizedPnlPercent > 0 && (
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${Math.min(100, activePosition.unrealizedPnlPercent * 20)}%` }} 
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClosePosition}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer border border-slate-700"
              >
                Encerrar Posição a Mercado Manualmente
              </button>
            </div>
          </div>
        ) : (
          <div className="py-5 text-center text-xs text-slate-500">
            Nenhuma posição em aberto. O robô está escaneando o mercado aguardando o gatilho de compra na baixa.
          </div>
        )}
      </div>

      {/* 2. Trade History Section with Search & Exact Column Alignment & Pagination */}
      <div className="flex flex-col gap-3">
        {/* Header with Title and Clear Action */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Histórico de Execuções e Ordens</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-normal">
              {filteredTrades.length} {filteredTrades.length === 1 ? 'registro' : 'registros'}
            </span>
          </h3>

          {tradeHistory.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Limpar Histórico
            </button>
          )}
        </div>

        {/* Search Bar */}
        {tradeHistory.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Pesquisar por par (BTC, SOL...), tipo (compra/venda) ou gatilho..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/70 transition-colors font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Table Content */}
        {tradeHistory.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Nenhuma ordem executada nesta sessão. As ordens automáticas aparecerão aqui com o PnL correspondente.
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Nenhuma execução encontrada para a pesquisa "{searchQuery}".
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950/40">
            {/* Table with fixed widths to guarantee 100% exact alignment between header and data rows */}
            <table className="w-full table-fixed text-xs font-mono-numbers">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] text-slate-400 font-sans uppercase tracking-wider">
                  <th className="w-[14%] py-2.5 px-3 text-left font-semibold">Horário</th>
                  <th className="w-[14%] py-2.5 px-3 text-left font-semibold">Par</th>
                  <th className="w-[12%] py-2.5 px-3 text-center font-semibold">Tipo</th>
                  <th className="w-[24%] py-2.5 px-3 text-left font-semibold">Gatilho</th>
                  <th className="w-[13%] py-2.5 px-3 text-right font-semibold">Preço</th>
                  <th className="w-[11%] py-2.5 px-3 text-right font-semibold">Volume</th>
                  <th className="w-[12%] py-2.5 px-3 text-right font-semibold">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {paginatedTrades.map((trade) => {
                  const isBuy = trade.side === 'BUY';
                  return (
                    <tr key={trade.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Horário */}
                      <td className="w-[14%] py-2.5 px-3 text-slate-400 text-[11px] truncate text-left">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </td>

                      {/* Par */}
                      <td className="w-[14%] py-2.5 px-3 font-bold text-white text-left truncate">
                        {trade.symbol}
                      </td>

                      {/* Tipo */}
                      <td className="w-[12%] py-2.5 px-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                          isBuy ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}>
                          {isBuy ? 'COMPRA' : 'VENDA'}
                        </span>
                      </td>

                      {/* Gatilho */}
                      <td className="w-[24%] py-2.5 px-3 text-slate-300 text-[11px] font-sans truncate text-left">
                        {trade.trigger === 'DIP_BUY' && 'Gatilho de Queda'}
                        {trade.trigger === 'TAKE_PROFIT' && 'Alvo Take Profit'}
                        {trade.trigger === 'STOP_LOSS' && 'Defesa Stop Loss'}
                        {trade.trigger === 'MANUAL' && 'Ordem Manual'}
                      </td>

                      {/* Preço */}
                      <td className="w-[13%] py-2.5 px-3 text-right text-slate-200 font-medium">
                        ${trade.price.toFixed(2)}
                      </td>

                      {/* Volume */}
                      <td className="w-[11%] py-2.5 px-3 text-right text-slate-400">
                        ${trade.totalUsdt.toFixed(2)}
                      </td>

                      {/* Resultado */}
                      <td className="w-[12%] py-2.5 px-3 text-right font-bold">
                        {trade.pnlPercent !== undefined ? (
                          <div className={`flex flex-col items-end leading-tight ${
                            trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            <span>
                              {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                            </span>
                            <span className="text-[10px] font-normal opacity-85">
                              ({trade.pnlUsdt && trade.pnlUsdt >= 0 ? '+$' : '-$'}{Math.abs(trade.pnlUsdt || 0).toFixed(2)})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Pagination Controls */}
        {filteredTrades.length > pageSize && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
            <div className="text-slate-400 text-[11px]">
              Mostrando <span className="text-slate-200 font-semibold">{startIndex + 1}</span> a{' '}
              <span className="text-slate-200 font-semibold">{Math.min(startIndex + pageSize, filteredTrades.length)}</span> de{' '}
              <span className="text-slate-200 font-semibold">{filteredTrades.length}</span> ordens
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Página Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Number Chips */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`w-6 h-6 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center ${
                      pageNumber === safeCurrentPage
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Próxima Página"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
