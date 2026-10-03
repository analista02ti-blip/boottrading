import React, { useEffect, useState } from 'react';
import { 
  Target, 
  ShieldAlert, 
  Zap, 
  Bot, 
  X, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  ExternalLink 
} from 'lucide-react';
import { ToastNotification } from '../types/toast';
import { isSoundEnabled, setSoundEnabled } from '../utils/soundEffects';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  onNavigateToReports?: () => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onNavigateToReports
}) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  if (toasts.length === 0) return null;

  return (
    <aside aria-label="Notificações do Robô" className="fixed top-16 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none sm:max-w-md">
      {/* Sound Mute/Unmute Indicator if any toast is active */}
      <div className="flex justify-end pr-1 pointer-events-auto">
        <button
          onClick={toggleSound}
          className="px-2 py-1 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition-colors shadow-lg"
          title={soundOn ? 'Desativar alertas sonoros' : 'Ativar alertas sonoros'}
        >
          {soundOn ? (
            <>
              <Volume2 className="w-3 h-3 text-emerald-400" />
              <span>Som Ativo</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3 h-3 text-slate-500" />
              <span>Silenciado</span>
            </>
          )}
        </button>
      </div>

      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onNavigateToReports={onNavigateToReports}
        />
      ))}
    </aside>
  );
};

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
  onNavigateToReports?: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({
  toast,
  onDismiss,
  onNavigateToReports
}) => {
  const duration = toast.durationMs || 5500;
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss(toast.id);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration, isPaused, onDismiss, toast.id]);

  const isTakeProfit = toast.type === 'take_profit';
  const isStopLoss = toast.type === 'stop_loss';
  const isBuyDip = toast.type === 'buy_dip';
  const isBotStatus = toast.type === 'bot_status';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-right-8 fade-in ${
        isTakeProfit
          ? 'bg-gradient-to-br from-[#072418]/95 via-[#041910]/95 to-[#0b141a]/95 border-emerald-500/80 shadow-[0_10px_30px_rgba(16,185,129,0.3)]'
          : isStopLoss
          ? 'bg-gradient-to-br from-[#2f0c11]/95 via-[#1a0508]/95 to-[#0b141a]/95 border-red-500/80 shadow-[0_10px_30px_rgba(239,68,68,0.3)]'
          : isBuyDip
          ? 'bg-gradient-to-br from-[#062438]/95 via-[#031420]/95 to-[#0b141a]/95 border-cyan-500/80 shadow-[0_10px_30px_rgba(6,182,212,0.25)]'
          : 'bg-gradient-to-br from-[#1e1b4b]/95 via-[#0f172a]/95 to-[#0b141a]/95 border-blue-500/70 shadow-[0_10px_30px_rgba(59,130,246,0.2)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Event Icon Badge */}
        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
          isTakeProfit
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-bounce'
            : isStopLoss
            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
            : isBuyDip
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
        }`}>
          {isTakeProfit && <Target className="w-5 h-5" />}
          {isStopLoss && <ShieldAlert className="w-5 h-5" />}
          {isBuyDip && <Zap className="w-5 h-5" />}
          {isBotStatus && <Bot className="w-5 h-5" />}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-extrabold tracking-wider uppercase border ${
              isTakeProfit
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                : isStopLoss
                ? 'bg-red-950/80 text-red-300 border-red-600/60'
                : isBuyDip
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60'
                : 'bg-blue-950/80 text-blue-300 border-blue-600/60'
            }`}>
              {toast.symbol || 'SISTEMA'}
            </span>

            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <h4 className="text-xs font-bold text-white mt-1 flex items-center gap-1.5">
            {toast.title}
          </h4>

          {/* High-Impact PnL Value Banner for TP and SL */}
          {(toast.pnlUsdt !== undefined || toast.pnlPercent !== undefined) && (
            <div className={`my-1.5 text-base font-black font-mono-numbers flex items-center gap-2 ${
              isTakeProfit ? 'text-emerald-400' : 'text-red-400'
            }`}>
              <span>
                {toast.pnlUsdt !== undefined && (
                  <>
                    {toast.pnlUsdt >= 0 ? '+' : '-'}${Math.abs(toast.pnlUsdt).toFixed(2)} USDT
                  </>
                )}
              </span>
              {toast.pnlPercent !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold ${
                  toast.pnlPercent >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {toast.pnlPercent >= 0 ? '+' : ''}{toast.pnlPercent.toFixed(2)}%
                </span>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-300 leading-relaxed font-sans mt-0.5">
            {toast.message}
          </p>

          {/* Quick Action Button for Trades */}
          {(isTakeProfit || isStopLoss) && onNavigateToReports && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">Registrado no histórico</span>
              <button
                type="button"
                onClick={() => {
                  onDismiss(toast.id);
                  onNavigateToReports();
                }}
                className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Ver no Relatório</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/60 transition-colors cursor-pointer shrink-0"
          title="Fechar alerta"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Countdown Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 overflow-hidden">
        <div
          className={`h-full transition-all linear duration-75 ${
            isTakeProfit
              ? 'bg-emerald-400'
              : isStopLoss
              ? 'bg-red-400'
              : isBuyDip
              ? 'bg-cyan-400'
              : 'bg-blue-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
