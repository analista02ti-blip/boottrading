import React from 'react';
import { Bot, Play, Square, Percent, ShieldAlert, ArrowDownRight, ArrowUpRight, TrendingUp, AlertTriangle, DollarSign, RefreshCw, Zap } from 'lucide-react';
import { BotConfig, CryptoPair, OperationMode, Position } from '../types/trading';

interface BotControlPanelProps {
  config: BotConfig;
  onChangeConfig: (newConfig: Partial<BotConfig>) => void;
  isBotRunning: boolean;
  onToggleBot: () => void;
  currentPrice: number;
  selectedPair: CryptoPair;
  activePosition: Position | null;
  referencePrice: number;
  onManualBuy: () => void;
  onManualSell: () => void;
  onEmergencyStop: () => void;
  onTestAlert?: (type: 'take_profit' | 'stop_loss' | 'buy_dip') => void;
}

export const BotControlPanel: React.FC<BotControlPanelProps> = ({
  config,
  onChangeConfig,
  isBotRunning,
  onToggleBot,
  currentPrice,
  selectedPair,
  activePosition,
  referencePrice,
  onManualBuy,
  onManualSell,
  onEmergencyStop,
  onTestAlert
}) => {
  // Calculations for prices
  const baseRef = activePosition ? activePosition.entryPrice : (referencePrice || currentPrice);
  const targetBuyPrice = baseRef * (1 - config.buyDipPercent / 100);
  const targetTpPrice = baseRef * (1 + config.takeProfitPercent / 100);
  const targetSlPrice = baseRef * (1 - config.stopLossPercent / 100);

  const estimatedProfitUsdt = (config.orderSizeUsdt * (config.takeProfitPercent / 100));
  const estimatedRiskUsdt = (config.orderSizeUsdt * (config.stopLossPercent / 100));

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 lg:p-5 flex flex-col gap-5">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              PARÂMETROS DO ROBÔ DE TRADING
            </h2>
            <div className="text-[11px] text-slate-400">
              Automação inteligente com execução direta via API Binance
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium ${
            isBotRunning 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse' 
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isBotRunning ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {isBotRunning ? 'ROBÔ ATIVO' : 'ROBÔ EM ESPERA'}
          </span>
        </div>
      </div>

      {/* 1. MODO DE OPERAÇÃO */}
      <div>
        <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
          <span>Modo de Operação</span>
          <span className="text-[10px] text-slate-400 font-normal">
            Estratégia de atuação
          </span>
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeConfig({ mode: 'BOTH' })}
            className={`py-2 px-2 text-xs font-medium rounded-md transition-all cursor-pointer text-center ${
              config.mode === 'BOTH'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Compra & Venda
          </button>
          <button
            type="button"
            onClick={() => onChangeConfig({ mode: 'BUY_ONLY' })}
            className={`py-2 px-2 text-xs font-medium rounded-md transition-all cursor-pointer text-center ${
              config.mode === 'BUY_ONLY'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Apenas Compra
          </button>
          <button
            type="button"
            onClick={() => onChangeConfig({ mode: 'SELL_ONLY' })}
            className={`py-2 px-2 text-xs font-medium rounded-md transition-all cursor-pointer text-center ${
              config.mode === 'SELL_ONLY'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Apenas Venda
          </button>
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5">
          {config.mode === 'BOTH' && '• Compra automaticamente nas correções e vende com lucro programado no topo.'}
          {config.mode === 'BUY_ONLY' && '• Acumulação: compra apenas quando a moeda atinge a porcentagem de queda.'}
          {config.mode === 'SELL_ONLY' && '• Saída: encerra posições abertas no lucro ou protege no stop loss.'}
        </div>
      </div>

      {/* 2. PORCENTAGENS DO ROBÔ (QUEDA / LUCRO / STOP LOSS) */}
      <div className="space-y-4 pt-1">
        {/* COMPRA NA BAIXA % */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-3 rounded-lg">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-cyan-400 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5" />
              Gatilho de Compra na Baixa
            </span>
            <span className="font-mono-numbers text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              -{config.buyDipPercent.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.5"
              max="15.0"
              step="0.1"
              value={config.buyDipPercent}
              onChange={(e) => onChangeConfig({ buyDipPercent: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="relative w-20 shrink-0">
              <input
                type="number"
                min="0.1"
                max="50"
                step="0.1"
                value={config.buyDipPercent}
                onChange={(e) => onChangeConfig({ buyDipPercent: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono-numbers text-right text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="absolute right-6 top-1 text-[10px] text-slate-500 pointer-events-none">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono-numbers mt-2 text-slate-400">
            <span>Preço Alvo Compra:</span>
            <span className="text-cyan-400 font-semibold">
              ${targetBuyPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: selectedPair.priceDecimals })}
            </span>
          </div>
        </div>

        {/* TAKE PROFIT % */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-3 rounded-lg">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Alvo de Lucro / Take Profit
            </span>
            <span className="font-mono-numbers text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              +{config.takeProfitPercent.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.5"
              max="25.0"
              step="0.1"
              value={config.takeProfitPercent}
              onChange={(e) => onChangeConfig({ takeProfitPercent: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="relative w-20 shrink-0">
              <input
                type="number"
                min="0.2"
                max="100"
                step="0.1"
                value={config.takeProfitPercent}
                onChange={(e) => onChangeConfig({ takeProfitPercent: Math.max(0.2, parseFloat(e.target.value) || 0.2) })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono-numbers text-right text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-6 top-1 text-[10px] text-slate-500 pointer-events-none">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono-numbers mt-2 text-slate-400">
            <span>Preço Venda Automática:</span>
            <span className="text-emerald-400 font-semibold">
              ${targetTpPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: selectedPair.priceDecimals })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono-numbers text-slate-500 mt-0.5">
            <span>Lucro Estimado:</span>
            <span className="text-emerald-300 font-medium">+${estimatedProfitUsdt.toFixed(2)} USDT</span>
          </div>
        </div>

        {/* STOP LOSS % */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-3 rounded-lg">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Proteção / Stop Loss
            </span>
            <span className="font-mono-numbers text-red-300 font-bold bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
              -{config.stopLossPercent.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.5"
              max="20.0"
              step="0.1"
              value={config.stopLossPercent}
              onChange={(e) => onChangeConfig({ stopLossPercent: parseFloat(e.target.value) })}
              className="w-full accent-red-400 cursor-pointer"
            />
            <div className="relative w-20 shrink-0">
              <input
                type="number"
                min="0.2"
                max="50"
                step="0.1"
                value={config.stopLossPercent}
                onChange={(e) => onChangeConfig({ stopLossPercent: Math.max(0.2, parseFloat(e.target.value) || 0.2) })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono-numbers text-right text-white focus:outline-none focus:border-red-500"
              />
              <span className="absolute right-6 top-1 text-[10px] text-slate-500 pointer-events-none">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono-numbers mt-2 text-slate-400">
            <span>Gatilho Stop Loss:</span>
            <span className="text-red-400 font-semibold">
              ${targetSlPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: selectedPair.priceDecimals })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono-numbers text-slate-500 mt-0.5">
            <span>Risco Máximo:</span>
            <span className="text-red-400 font-medium">-${estimatedRiskUsdt.toFixed(2)} USDT</span>
          </div>
        </div>
      </div>

      {/* 3. TAMANHO DA ORDEM & AMBIENTE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Valor por Ordem (USDT)
          </label>
          <div className="relative">
            <DollarSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min="10"
              max="50000"
              step="10"
              value={config.orderSizeUsdt}
              onChange={(e) => onChangeConfig({ orderSizeUsdt: Math.max(10, parseFloat(e.target.value) || 10) })}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white font-mono-numbers focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Tipo de Execução
          </label>
          <button
            type="button"
            onClick={() => onChangeConfig({ isSimulated: !config.isSimulated })}
            className={`w-full py-1.5 px-3 text-xs font-semibold rounded border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              config.isSimulated
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {config.isSimulated ? 'Simulação (Paper Trading)' : 'API Binance Real'}
          </button>
        </div>
      </div>

      {/* 4. PRIMARY BOT EXECUTION CTA */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onToggleBot}
          className={`w-full py-3 px-4 rounded-lg font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
            isBotRunning
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
          }`}
        >
          {isBotRunning ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              PARAR ROBÔ DE TRADING
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              INICIAR ROBÔ DE TRADING AUTOMATIZADO
            </>
          )}
        </button>
      </div>

      {/* 5. MANUAL OVERRIDES */}
      <div className="border-t border-slate-800/80 pt-3">
        <div className="text-[11px] text-slate-400 mb-2 font-medium">
          Operações Manuais Instantâneas (A Mercado):
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onManualBuy}
            className="py-2 px-3 text-xs font-bold rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer text-center"
          >
            Comprar Agora (${config.orderSizeUsdt})
          </button>
          <button
            type="button"
            onClick={onManualSell}
            disabled={!activePosition}
            className={`py-2 px-3 text-xs font-bold rounded transition-colors text-center ${
              activePosition
                ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 cursor-pointer'
                : 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            Vender Posição
          </button>
        </div>
        {activePosition && (
          <button
            type="button"
            onClick={onEmergencyStop}
            className="w-full mt-2 py-1.5 text-[11px] font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/50 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Pânico / Encerrar a Mercado Imediatamente
          </button>
        )}

        {/* Test Visual Alert Toasts */}
        {onTestAlert && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">Testar Alertas Toast:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onTestAlert('take_profit')}
                className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold cursor-pointer transition-colors"
                title="Disparar alerta visual de Take Profit"
              >
                + Take Profit
              </button>
              <button
                type="button"
                onClick={() => onTestAlert('stop_loss')}
                className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-700/60 text-[10px] font-bold cursor-pointer transition-colors"
                title="Disparar alerta visual de Stop Loss"
              >
                - Stop Loss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
