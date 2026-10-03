import React, { useState } from 'react';
import { Search, Download, Trash2, Filter, FileText, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { LogEntry } from '../types/trading';

interface LogViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClearLogs }) => {
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.tag.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const handleDownload = () => {
    const content = logs
      .map((l) => `${l.timestamp} [${l.level}] [${l.tag}] ${l.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trading_bot.log';
    link.click();
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              ARQUIVO DE LOGS: trading_bot.log
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                {logs.length} eventos
              </span>
            </h2>
            <div className="text-[11px] text-slate-400">
              Registro contínuo em disco com formato oficial Python logging
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearLogs}
            className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar Tela
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar trading_bot.log
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar mensagens, gatilhos ou pares no log..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px]">
          {['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer font-mono font-medium ${
                selectedLevel === lvl
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl === 'ALL' ? 'TODOS' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Scrolled Log Terminal */}
      <div className="bg-[#05070a] border border-slate-800 rounded-lg p-3 max-h-[460px] overflow-y-auto font-mono text-xs space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-600">
            Nenhum evento corresponde ao filtro atual.
          </div>
        ) : (
          filteredLogs.map((log) => {
            let badgeColor = 'text-slate-400';
            let msgColor = 'text-slate-300';
            let Icon = Info;

            if (log.level === 'SUCCESS') {
              badgeColor = 'text-emerald-400 font-bold';
              msgColor = 'text-emerald-300 font-medium';
              Icon = CheckCircle2;
            } else if (log.level === 'WARNING') {
              badgeColor = 'text-amber-400 font-bold';
              msgColor = 'text-amber-200';
              Icon = AlertTriangle;
            } else if (log.level === 'ERROR') {
              badgeColor = 'text-red-400 font-bold';
              msgColor = 'text-red-300 font-semibold';
              Icon = AlertCircle;
            } else if (log.level === 'DEBUG') {
              badgeColor = 'text-slate-500';
              msgColor = 'text-slate-500';
            }

            return (
              <div
                key={log.id}
                className="flex items-start gap-2 py-0.5 hover:bg-slate-900/60 px-1.5 rounded transition-colors leading-relaxed"
              >
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${badgeColor}`} />
                <span className="text-slate-500 shrink-0 select-none">
                  {log.timestamp}
                </span>
                <span className={`shrink-0 ${badgeColor}`}>
                  [{log.level}]
                </span>
                <span className="text-blue-400 shrink-0">
                  [{log.tag}]
                </span>
                <span className={`break-all ${msgColor}`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
