import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  RotateCcw,
  Layers,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TradeRecord } from '../types/trading';
import { SUPPORTED_PAIRS } from '../data/cryptoPairs';

interface BotPerformanceReportProps {
  trades: TradeRecord[];
}

export const BotPerformanceReport: React.FC<BotPerformanceReportProps> = ({ trades }) => {
  // Filters State
  const [selectedPair, setSelectedPair] = useState<string>('ALL');
  const [selectedTrigger, setSelectedTrigger] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'today' | '7d' | '14d' | '30d' | 'all' | 'custom'>('14d');
  
  // Custom Date range
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultTo = now.toISOString().split('T')[0];
  const [customFrom, setCustomFrom] = useState<string>(defaultFrom);
  const [customTo, setCustomTo] = useState<string>(defaultTo);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Handle Preset Clicks
  const handlePreset = (preset: 'today' | '7d' | '14d' | '30d' | 'all') => {
    setDatePreset(preset);
    const currentDate = new Date();
    const toStr = currentDate.toISOString().split('T')[0];
    setCustomTo(toStr);

    if (preset === 'today') {
      setCustomFrom(toStr);
    } else if (preset === '7d') {
      const from = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      setCustomFrom(from.toISOString().split('T')[0]);
    } else if (preset === '14d') {
      const from = new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000);
      setCustomFrom(from.toISOString().split('T')[0]);
    } else if (preset === '30d') {
      const from = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      setCustomFrom(from.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setCustomFrom('2025-01-01');
    }
  };

  // Filter Trades
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      // 1. Pair filter
      if (selectedPair !== 'ALL' && trade.symbol !== selectedPair) {
        return false;
      }

      // 2. Trigger filter
      if (selectedTrigger !== 'ALL') {
        if (selectedTrigger === 'PROFIT' && trade.trigger !== 'TAKE_PROFIT') return false;
        if (selectedTrigger === 'STOP' && trade.trigger !== 'STOP_LOSS') return false;
        if (selectedTrigger === 'BUY' && trade.side !== 'BUY') return false;
      }

      // 3. Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchId = (trade.orderId || trade.id).toLowerCase().includes(term);
        const matchSymbol = trade.symbol.toLowerCase().includes(term);
        if (!matchId && !matchSymbol) return false;
      }

      // 4. Date filter
      const tradeDate = new Date(trade.timestamp).toISOString().split('T')[0];
      if (customFrom && tradeDate < customFrom) return false;
      if (customTo && tradeDate > customTo) return false;

      return true;
    });
  }, [trades, selectedPair, selectedTrigger, searchTerm, customFrom, customTo]);

  // Performance Metrics Calculations
  const stats = useMemo(() => {
    let totalPnl = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let winCount = 0;
    let lossCount = 0;
    let totalVolume = 0;
    let buyCount = 0;
    let sellCount = 0;

    // Running balance calculation array
    // We sort trades ascending by timestamp to calculate chronological equity
    const sortedAsc = [...filteredTrades].sort((a, b) => a.timestamp - b.timestamp);
    let runningBalance = 0;
    const equityCurve: { time: number; balance: number }[] = [];

    sortedAsc.forEach((t) => {
      totalVolume += t.totalUsdt;
      if (t.side === 'BUY') {
        buyCount++;
      } else {
        sellCount++;
      }

      if (t.pnlUsdt !== undefined) {
        totalPnl += t.pnlUsdt;
        runningBalance += t.pnlUsdt;
        equityCurve.push({ time: t.timestamp, balance: runningBalance });

        if (t.pnlUsdt > 0) {
          grossProfit += t.pnlUsdt;
          winCount++;
        } else if (t.pnlUsdt < 0) {
          grossLoss += Math.abs(t.pnlUsdt);
          lossCount++;
        }
      }
    });

    const totalClosedTrades = winCount + lossCount;
    const winRate = totalClosedTrades > 0 ? (winCount / totalClosedTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    const avgTradePnl = totalClosedTrades > 0 ? totalPnl / totalClosedTrades : 0;

    return {
      totalPnl,
      grossProfit,
      grossLoss,
      winCount,
      lossCount,
      totalClosedTrades,
      winRate,
      profitFactor,
      avgTradePnl,
      totalVolume,
      buyCount,
      sellCount,
      equityCurve
    };
  }, [filteredTrades]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'ID Ordem',
      'Data/Hora',
      'Par',
      'Operacao',
      'Gatilho',
      'Preco (USD)',
      'Quantidade',
      'Total (USDT)',
      'Lucro/Prejuizo (USDT)',
      'Retorno (%)'
    ];

    const rows = filteredTrades.map((t) => [
      t.orderId || t.id,
      new Date(t.timestamp).toLocaleString(),
      t.symbol,
      t.side === 'BUY' ? 'COMPRA' : 'VENDA',
      t.trigger,
      t.price.toFixed(4),
      t.quantity.toFixed(4),
      t.totalUsdt.toFixed(2),
      t.pnlUsdt !== undefined ? t.pnlUsdt.toFixed(2) : '0.00',
      t.pnlPercent !== undefined ? `${t.pnlPercent.toFixed(2)}%` : '0.00%'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_desempenho_bot_${customFrom}_${customTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF Handler using jsPDF and autoTable
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Dark Header Banner
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, 297, 24, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('BINANCE ALGO TRADER - RELATORIO DE DESEMPENHO DO ROBO', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // #94a3b8
    const generationDate = new Date().toLocaleString();
    doc.text(`Gerado em: ${generationDate} | Periodo: ${customFrom} ate ${customTo} | Par: ${selectedPair === 'ALL' ? 'Todos os Pares' : selectedPair} | Gatilho: ${selectedTrigger}`, 14, 18);

    // KPI Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 28, 269, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 28, 269, 18, 'S');

    // Saldo Final
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('SALDO FINAL DO RELATORIO:', 18, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    if (stats.totalPnl >= 0) {
      doc.setTextColor(16, 185, 129); // green
      doc.text(`+$${stats.totalPnl.toFixed(2)} USDT`, 18, 42);
    } else {
      doc.setTextColor(239, 68, 68); // red
      doc.text(`-$${Math.abs(stats.totalPnl).toFixed(2)} USDT`, 18, 42);
    }

    // Win Rate
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('TAXA DE ACERTO (WIN RATE):', 85, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${stats.winRate.toFixed(1)}% (${stats.winCount} Venceu / ${stats.lossCount} Stop)`, 85, 42);

    // Fator de Lucro
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('FATOR DE LUCRO:', 165, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${stats.profitFactor.toFixed(2)}`, 165, 42);

    // Volume Total
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('VOLUME TOTAL NEGOCIADO:', 225, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`$${stats.totalVolume.toFixed(2)} USDT`, 225, 42);

    // Table Data
    const tableHeaders = [
      ['ID Ordem', 'Data e Hora', 'Par', 'Operacao', 'Gatilho', 'Preco ($)', 'Qtd', 'Total ($)', 'PnL ($)', 'Retorno %']
    ];

    const tableRows = filteredTrades.map((t) => [
      t.orderId || t.id.slice(0, 10),
      new Date(t.timestamp).toLocaleString(),
      t.symbol,
      t.side === 'BUY' ? 'COMPRA' : 'VENDA',
      t.trigger === 'DIP_BUY' ? 'Gatilho de Queda' : t.trigger === 'TAKE_PROFIT' ? 'Take Profit' : t.trigger === 'STOP_LOSS' ? 'Stop Loss' : 'Manual',
      `$${t.price.toFixed(2)}`,
      t.quantity.toFixed(4),
      `$${t.totalUsdt.toFixed(2)}`,
      t.pnlUsdt !== undefined ? `${t.pnlUsdt >= 0 ? '+' : '-'}$${Math.abs(t.pnlUsdt).toFixed(2)}` : '-',
      t.pnlPercent !== undefined ? `${t.pnlPercent >= 0 ? '+' : ''}${t.pnlPercent.toFixed(2)}%` : '-'
    ]);

    // Footer row with total volume and balance
    const footerRow = [
      'TOTAL',
      `${filteredTrades.length} ordens`,
      '-',
      '-',
      '-',
      '-',
      '-',
      `$${stats.totalVolume.toFixed(2)}`,
      `${stats.totalPnl >= 0 ? '+' : '-'}$${Math.abs(stats.totalPnl).toFixed(2)} USDT`,
      '-'
    ];

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      foot: [footerRow],
      startY: 50,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240]
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: function(data) {
        // Highlight PnL column
        if (data.section === 'body' && data.column.index === 8) {
          const val = String(data.cell.raw || '');
          if (val.startsWith('+')) {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else if (val.startsWith('-')) {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`relatorio_desempenho_bot_${customFrom}_${customTo}.pdf`);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header & Title Banner */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 lg:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              RELATÓRIO DE DESEMPENHO DO ROBÔ DE TRADING
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                Auditoria de Resultados
              </span>
            </h2>
            <div className="text-xs text-slate-400">
              Análise detalhada de ordens, assertividade, gatilhos de lucros/stops e saldo consolidado do robô
            </div>
          </div>
        </div>

        {/* Export Buttons: PDF and CSV/Excel */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-200 border border-red-700/60 flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            title="Exportar relatório completo em arquivo PDF"
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            Exportar PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            title="Exportar relatório em formato CSV / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Exportar CSV / Excel
          </button>
        </div>
      </div>

      {/* 2. Filtros de Data, Par e Gatilhos */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            Filtros do Relatório
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Exibindo {filteredTrades.length} de {trades.length} operações
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Quick Date Presets */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-300">
              Período de Análise:
            </label>
            <div className="grid grid-cols-5 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => handlePreset('today')}
                className={`py-1.5 rounded font-medium transition-colors cursor-pointer text-center ${
                  datePreset === 'today' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => handlePreset('7d')}
                className={`py-1.5 rounded font-medium transition-colors cursor-pointer text-center ${
                  datePreset === '7d' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Dias
              </button>
              <button
                type="button"
                onClick={() => handlePreset('14d')}
                className={`py-1.5 rounded font-medium transition-colors cursor-pointer text-center ${
                  datePreset === '14d' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                14 Dias
              </button>
              <button
                type="button"
                onClick={() => handlePreset('30d')}
                className={`py-1.5 rounded font-medium transition-colors cursor-pointer text-center ${
                  datePreset === '30d' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                30 Dias
              </button>
              <button
                type="button"
                onClick={() => handlePreset('all')}
                className={`py-1.5 rounded font-medium transition-colors cursor-pointer text-center ${
                  datePreset === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tudo
              </button>
            </div>
          </div>

          {/* Date Picker Range (De / Até) */}
          <div className="md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-300">
              Intervalo de Datas:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-500 text-xs">até</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Par de Criptomoeda */}
          <div className="md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-300">
              Filtrar Par de Cripto:
            </label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Todos os Pares ({SUPPORTED_PAIRS.length})</option>
              {SUPPORTED_PAIRS.map((p) => (
                <option key={p.symbol} value={p.symbol}>
                  {p.symbol} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Gatilho */}
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-300">
              Tipo / Gatilho:
            </label>
            <select
              value={selectedTrigger}
              onChange={(e) => setSelectedTrigger(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="PROFIT">Take Profit (Lucro)</option>
              <option value="STOP">Stop Loss (Proteção)</option>
              <option value="BUY">Compras (Dips)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Painel de Análise e Resumo do Saldo (Destaque Principal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SALDO FINAL DO RELATÓRIO */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          stats.totalPnl >= 0 
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
            : 'bg-red-950/20 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center justify-between text-xs uppercase tracking-wider font-semibold">
            <span>Saldo Líquido do Relatório</span>
            {stats.totalPnl >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
          </div>
          <div className="my-2">
            <div className={`text-2xl lg:text-3xl font-bold font-mono-numbers ${
              stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {stats.totalPnl >= 0 ? '+' : '-'}${Math.abs(stats.totalPnl).toFixed(2)} USDT
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Resultado final acumulado de todas as operações filtradas
            </div>
          </div>
          <div className="text-[11px] font-mono font-medium pt-2 border-t border-slate-800 flex justify-between">
            <span>Média por Trade:</span>
            <span className={stats.avgTradePnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {stats.avgTradePnl >= 0 ? '+' : ''}${stats.avgTradePnl.toFixed(2)} USDT
            </span>
          </div>
        </div>

        {/* TAXA DE ACERTO (WIN RATE) */}
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider font-semibold text-slate-300">
            <span>Taxa de Assertividade</span>
            <Percent className="w-4 h-4 text-blue-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl lg:text-3xl font-bold font-mono-numbers text-white">
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats.winCount} Operações com Lucro · {stats.lossCount} Stop Loss
            </div>
          </div>
          {/* Win / Loss Bar */}
          <div className="pt-2 border-t border-slate-800">
            <div className="w-full h-2 bg-red-950 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${Math.max(0, Math.min(100, stats.winRate))}%` }} 
              />
            </div>
          </div>
        </div>

        {/* FATOR DE LUCRO (PROFIT FACTOR) */}
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider font-semibold text-slate-300">
            <span>Fator de Lucro</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl lg:text-3xl font-bold font-mono-numbers text-amber-300">
              {stats.profitFactor.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Relação Lucro Bruto vs Perda Bruta
            </div>
          </div>
          <div className="text-[11px] font-mono pt-2 border-t border-slate-800 flex justify-between text-slate-400">
            <span className="text-emerald-400">+${stats.grossProfit.toFixed(1)}</span>
            <span>vs</span>
            <span className="text-red-400">-${stats.grossLoss.toFixed(1)}</span>
          </div>
        </div>

        {/* VOLUME TOTAL MOVIMENTADO */}
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider font-semibold text-slate-300">
            <span>Volume Movimentado</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl lg:text-3xl font-bold font-mono-numbers text-cyan-300">
              ${stats.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats.buyCount} Compras · {stats.sellCount} Vendas no período
            </div>
          </div>
          <div className="text-[11px] font-mono pt-2 border-t border-slate-800 flex justify-between text-slate-400">
            <span>Total de Ordens:</span>
            <span className="text-slate-200 font-bold">{filteredTrades.length}</span>
          </div>
        </div>
      </div>

      {/* 4. Lista Grid Interativa de Desempenho do Robô */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-800 bg-[#121622] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>Tabela Analítica de Ordens e Desempenho</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {filteredTrades.length} registros
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por ID ou Par..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Nenhuma operação encontrada com os filtros selecionados. Tente alterar o período ou o par de criptomoeda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-numbers">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-[10px] text-slate-400 font-sans uppercase">
                  <th className="py-3 px-3">Ordem / ID</th>
                  <th className="py-3 px-3">Data e Horário</th>
                  <th className="py-3 px-3">Par de Cripto</th>
                  <th className="py-3 px-3">Operação</th>
                  <th className="py-3 px-3">Gatilho do Robô</th>
                  <th className="py-3 px-3 text-right">Preço Executado</th>
                  <th className="py-3 px-3 text-right">Qtd</th>
                  <th className="py-3 px-3 text-right">Total (USDT)</th>
                  <th className="py-3 px-3 text-right">Lucro / Prejuízo</th>
                  <th className="py-3 px-3 text-right">Retorno %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredTrades.map((t) => {
                  const isBuy = t.side === 'BUY';
                  const isProfit = t.pnlUsdt !== undefined && t.pnlUsdt > 0;
                  const isLoss = t.pnlUsdt !== undefined && t.pnlUsdt < 0;

                  return (
                    <tr 
                      key={t.id} 
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isProfit ? 'hover:bg-emerald-950/10' : isLoss ? 'hover:bg-red-950/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {t.orderId || t.id.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                        {new Date(t.timestamp).toLocaleDateString()}{' '}
                        <span className="text-slate-500">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white">
                          {t.symbol}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {isBuy ? 'COMPRA' : 'VENDA'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-[11px]">
                        {t.trigger === 'DIP_BUY' && (
                          <span className="text-cyan-400 flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3" />
                            Gatilho de Queda
                          </span>
                        )}
                        {t.trigger === 'TAKE_PROFIT' && (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Take Profit (+Lucro)
                          </span>
                        )}
                        {t.trigger === 'STOP_LOSS' && (
                          <span className="text-red-400 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            Stop Loss (Defesa)
                          </span>
                        )}
                        {t.trigger === 'MANUAL' && (
                          <span className="text-slate-400">
                            Ordem Manual
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-200">
                        ${t.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {t.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        ${t.totalUsdt.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {t.pnlUsdt !== undefined ? (
                          <span className={t.pnlUsdt >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {t.pnlUsdt >= 0 ? '+' : '-'}${Math.abs(t.pnlUsdt).toFixed(2)} USDT
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {t.pnlPercent !== undefined ? (
                          <span className={t.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* RODAPÉ COM O SALDO FINAL DO RELATÓRIO */}
              <tfoot>
                <tr className="bg-[#121622] border-t-2 border-slate-700 text-xs font-bold">
                  <td colSpan={5} className="py-3 px-3 text-slate-300 font-sans uppercase">
                    Balanço Consolidado do Período ({filteredTrades.length} ordens)
                  </td>
                  <td colSpan={3} className="py-3 px-3 text-right text-slate-300">
                    Volume Total: <span className="text-white">${stats.totalVolume.toFixed(2)} USDT</span>
                  </td>
                  <td colSpan={2} className={`py-3 px-3 text-right text-sm ${
                    stats.totalPnl >= 0 ? 'text-emerald-400 bg-emerald-950/30' : 'text-red-400 bg-red-950/30'
                  }`}>
                    SALDO FINAL: {stats.totalPnl >= 0 ? '+' : '-'}${Math.abs(stats.totalPnl).toFixed(2)} USDT
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
