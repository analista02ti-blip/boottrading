import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, 
  Bot, 
  ShieldCheck, 
  Terminal, 
  FileCode2, 
  Play, 
  Square, 
  Settings, 
  Wifi, 
  ChevronDown, 
  BarChart3, 
  FileSpreadsheet,
  TrendingUp,
  LogOut,
  User
} from 'lucide-react';
import { CryptoPair } from '../types/trading';

interface HeaderProps {
  currentTab: 'terminal' | 'bot' | 'python_window' | 'logs' | 'reports' | 'docs';
  setCurrentTab: (tab: 'terminal' | 'bot' | 'python_window' | 'logs' | 'reports' | 'docs') => void;
  isBotRunning: boolean;
  onToggleBot: () => void;
  onOpenSettings: () => void;
  selectedPair: CryptoPair;
  isSimulated: boolean;
  pingLatency: number | null;
  onOpenPythonWindow: () => void;
  user?: { email: string; name: string; role: string } | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  isBotRunning,
  onToggleBot,
  onOpenSettings,
  isSimulated,
  pingLatency,
  onOpenPythonWindow,
  user,
  onLogout
}) => {
  const [isReportsDropdownOpen, setIsReportsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsReportsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-[#0b0e14] px-4 lg:px-6 py-3 shrink-0 sticky top-0 z-40">
      <div className="flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm tracking-wider">
            BN
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              BINANCE ALGO TRADER
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal border border-slate-700">
                v2.4
              </span>
            </h1>
          </div>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-medium">
          <button
            onClick={() => setCurrentTab('terminal')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'terminal'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Terminal de Trading
          </button>

          <button
            onClick={() => setCurrentTab('bot')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'bot'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            Configuração do Robô
          </button>

          <button
            onClick={() => {
              setCurrentTab('python_window');
              onOpenPythonWindow();
            }}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer border ${
              currentTab === 'python_window'
                ? 'bg-blue-950/60 border-blue-500/50 text-blue-200 font-semibold'
                : 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            Aplicação Python (Window & Logs)
          </button>

          <button
            onClick={() => setCurrentTab('logs')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'logs'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
            trading_bot.log
          </button>

          {/* MENU RELATÓRIOS COM SUBMENU DESEMPENHO BOOT */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsReportsDropdownOpen(!isReportsDropdownOpen)}
              onMouseEnter={() => setIsReportsDropdownOpen(true)}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer border ${
                currentTab === 'reports'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-semibold shadow-xs'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Relatórios</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isReportsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isReportsDropdownOpen && (
              <div 
                className="absolute left-0 top-full mt-1 w-64 bg-[#0f172a] border border-slate-700/90 rounded-lg shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsReportsDropdownOpen(false)}
              >
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 tracking-wider">
                  Relatórios do Sistema
                </div>

                {/* Submenu Item: Desempenho Boot */}
                <button
                  onClick={() => {
                    setCurrentTab('reports');
                    setIsReportsDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left flex items-start gap-2.5 hover:bg-slate-800/80 transition-colors cursor-pointer ${
                    currentTab === 'reports' ? 'bg-slate-800/90 text-emerald-300' : 'text-slate-200'
                  }`}
                >
                  <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 text-white">
                      Desempenho Boot
                      <span className="text-[9px] font-mono px-1 py-0.2 bg-emerald-900/60 text-emerald-300 rounded border border-emerald-700/50">
                        Novo
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                      Filtros de data, moedas, lista grid e saldo consolidado
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Status & Latency */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono-numbers px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-slate-300">
            <Wifi className={`w-3 h-3 ${pingLatency !== null ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>Binance API:</span>
            <span className="text-slate-200 font-semibold">
              {pingLatency !== null ? `${pingLatency}ms` : '45ms'}
            </span>
            <span className="text-slate-600">·</span>
            <span className={isSimulated ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}>
              {isSimulated ? 'Simulação' : 'API Real'}
            </span>
          </div>

          {/* Quick API Key Settings */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors cursor-pointer border border-slate-800"
            title="Configurações de Conexão e Chaves da Binance"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Start/Stop Bot CTA */}
          <button
            onClick={onToggleBot}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isBotRunning
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isBotRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">PARAR ROBÔ</span>
                <span className="sm:hidden">PARAR</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">INICIAR ROBÔ</span>
                <span className="sm:hidden">INICIAR</span>
              </>
            )}
          </button>

          {/* User Profile Badge & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden xl:flex flex-col text-right text-[11px] leading-tight font-mono">
                <span className="font-bold text-white truncate max-w-[130px]">{user.name}</span>
                <span className="text-[10px] text-amber-400 font-semibold truncate max-w-[130px]">{user.role}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors cursor-pointer border border-slate-800"
                title="Sair da Conta (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
