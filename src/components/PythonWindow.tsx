import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, Play, Square, RefreshCw, FileText, ExternalLink, ShieldCheck, Cpu } from 'lucide-react';
import { BotConfig, CryptoPair, LogEntry, Position } from '../types/trading';
import { PYTHON_SCRIPT_CONTENT } from '../data/pythonScriptContent';

interface PythonWindowProps {
  config: BotConfig;
  onChangeConfig: (newConfig: Partial<BotConfig>) => void;
  isBotRunning: boolean;
  onToggleBot: () => void;
  currentPrice: number;
  selectedPair: CryptoPair;
  activePosition: Position | null;
  logs: LogEntry[];
  onTestConnection: () => void;
  isTestingConnection: boolean;
}

export const PythonWindow: React.FC<PythonWindowProps> = ({
  config,
  onChangeConfig,
  isBotRunning,
  onToggleBot,
  currentPrice,
  selectedPair,
  activePosition,
  logs,
  onTestConnection,
  isTestingConnection
}) => {
  const [activeTab, setActiveTab] = useState<'window' | 'code' | 'instructions'>('window');
  const [copiedCode, setCopiedCode] = useState(false);

  // Target prices
  const basePrice = activePosition ? activePosition.entryPrice : currentPrice;
  const buyTarget = basePrice * (1 - config.buyDipPercent / 100);
  const tpTarget = basePrice * (1 + config.takeProfitPercent / 100);
  const slTarget = basePrice * (1 - config.stopLossPercent / 100);

  const handleDownloadPythonScript = () => {
    const blob = new Blob([PYTHON_SCRIPT_CONTENT], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.download = 'bot_trader_binance.py';
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };

  const handleDownloadLogFile = () => {
    const logContent = logs.map(l => `${l.timestamp} [${l.level}] [${l.tag}] ${l.message}`).join('\n');
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.download = 'trading_bot.log';
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0b0e14] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Top Header of the Python Studio */}
      <div className="bg-[#0f172a] px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              MOTOR PYTHON DE TRADING BINANCE
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                Tkinter Window + trading_bot.log
              </span>
            </h2>
            <div className="text-[11px] text-slate-400">
              Execução nativa desktop em Python 3 com interface gráfica e arquivos de log em disco
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('window')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'window' ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Janela do App (GUI Window)
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'code' ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Código bot_trader_binance.py
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'instructions' ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Como Rodar no Windows/Linux
          </button>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPythonScript}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            Baixar .PY
          </button>
          <button
            onClick={handleDownloadLogFile}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Baixar .LOG
          </button>
        </div>
      </div>

      {/* TAB 1: EMULATED PYTHON DESKTOP GUI WINDOW */}
      {activeTab === 'window' && (
        <div className="p-4 lg:p-6 bg-[#070a0f] flex justify-center">
          {/* Authentic Desktop Window Frame */}
          <div className="w-full max-w-5xl bg-[#121620] border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
            {/* Window Title Bar (Windows/Tkinter style) */}
            <div className="bg-[#18202f] px-3 py-2 border-b border-slate-700 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <span className="text-xs font-bold text-slate-200 font-sans tracking-wide">
                  Binance Crypto Trading Bot v2.4 - [WINDOW ATIVA]
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  isBotRunning ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isBotRunning ? '● LOOP ATIVO OPERANDO' : '● ROBÔ PARADO'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white text-xs">
                  ─
                </button>
                <button className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white text-xs">
                  □
                </button>
                <button className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white text-xs">
                  ✕
                </button>
              </div>
            </div>

            {/* Window Content (Tkinter Layout) */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Form Controls (Tkinter Frames) */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                {/* Frame 1: Par e Modo */}
                <div className="bg-[#171d2b] border border-slate-700/80 rounded p-3">
                  <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                    1. Configurações de Operação
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Par de Cripto:</span>
                      <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {config.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Modo de Operação:</span>
                      <select
                        value={config.mode}
                        onChange={(e) => onChangeConfig({ mode: e.target.value as any })}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none"
                      >
                        <option value="BOTH">COMPRA_E_VENDA</option>
                        <option value="BUY_ONLY">APENAS_COMPRA</option>
                        <option value="SELL_ONLY">APENAS_VENDA</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Frame 2: Triggers */}
                <div className="bg-[#171d2b] border border-slate-700/80 rounded p-3">
                  <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                    2. Porcentagens Automáticas
                  </div>
                  <div className="space-y-2.5 text-xs font-mono-numbers">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-sans">Queda para Compra (%):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={config.buyDipPercent}
                        onChange={(e) => onChangeConfig({ buyDipPercent: parseFloat(e.target.value) || 0.1 })}
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right text-cyan-300 font-bold"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-sans">Lucro para Venda (TP %):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={config.takeProfitPercent}
                        onChange={(e) => onChangeConfig({ takeProfitPercent: parseFloat(e.target.value) || 0.1 })}
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right text-emerald-300 font-bold"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 font-sans">Stop Loss Proteção (%):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={config.stopLossPercent}
                        onChange={(e) => onChangeConfig({ stopLossPercent: parseFloat(e.target.value) || 0.1 })}
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right text-red-300 font-bold"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-sans">Valor Ordem (USDT):</span>
                      <input
                        type="number"
                        step="10"
                        value={config.orderSizeUsdt}
                        onChange={(e) => onChangeConfig({ orderSizeUsdt: parseFloat(e.target.value) || 10 })}
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right text-white font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Frame 3: API Connection & Buttons */}
                <div className="bg-[#171d2b] border border-slate-700/80 rounded p-3">
                  <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                    3. Conexão Binance & Ações
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-300">Modo Simulação:</span>
                    <input
                      type="checkbox"
                      checked={config.isSimulated}
                      onChange={(e) => onChangeConfig({ isSimulated: e.target.checked })}
                      className="w-4 h-4 accent-amber-400 cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onTestConnection}
                    disabled={isTestingConnection}
                    className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-semibold text-blue-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mb-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                    Testar Conexão com Binance API
                  </button>

                  <button
                    type="button"
                    onClick={onToggleBot}
                    className={`w-full py-2 px-3 rounded font-bold text-xs tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      isBotRunning
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isBotRunning ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        PARAR ROBÔ PYTHON
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        INICIAR ROBÔ PYTHON
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Real-time Telemetry & Log Console (trading_bot.log) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                {/* Live Telemetry Display */}
                <div className="bg-[#171d2b] border border-slate-700/80 rounded p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-numbers">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans uppercase">Preço Atual</div>
                      <div className="font-bold text-white text-sm sm:text-base">${currentPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-cyan-400 font-sans uppercase">Gatilho Compra</div>
                      <div className="font-bold text-cyan-300">${buyTarget.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-400 font-sans uppercase">Alvo Lucro (TP)</div>
                      <div className="font-bold text-emerald-300">${tpTarget.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-red-400 font-sans uppercase">Stop Loss</div>
                      <div className="font-bold text-red-300">${slTarget.toFixed(2)}</div>
                    </div>
                  </div>

                  {activePosition ? (
                    <div className="mt-2 pt-2 border-t border-slate-700/60 text-xs font-mono-numbers flex justify-between items-center text-emerald-400">
                      <span>Posição Aberta: {activePosition.quantity.toFixed(4)} {selectedPair.baseAsset}</span>
                      <span>PnL: {activePosition.unrealizedPnlPercent >= 0 ? '+' : ''}{activePosition.unrealizedPnlPercent.toFixed(2)}%</span>
                    </div>
                  ) : (
                    <div className="mt-2 pt-2 border-t border-slate-700/60 text-[11px] text-slate-400">
                      Status: Sem posição aberta. Monitorando mercado para compra com -{config.buyDipPercent}% de queda.
                    </div>
                  )}
                </div>

                {/* Console Log Area (Tkinter ScrolledText widget) */}
                <div className="bg-[#070a0f] border border-slate-700 rounded p-2.5 flex-1 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[11px] font-mono">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      trading_bot.log (Console de Saída)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {logs.length} linhas registradas
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 pr-1 max-h-[320px]">
                    {logs.map((log) => {
                      let color = 'text-slate-300';
                      if (log.level === 'SUCCESS') color = 'text-emerald-400 font-semibold';
                      if (log.level === 'WARNING') color = 'text-amber-400';
                      if (log.level === 'ERROR') color = 'text-red-400 font-semibold';
                      if (log.level === 'DEBUG') color = 'text-slate-500';

                      return (
                        <div key={log.id} className="leading-relaxed">
                          <span className="text-slate-500">{log.timestamp}</span>{' '}
                          <span className="text-slate-400">[{log.level}]</span>{' '}
                          <span className="text-blue-400">[{log.tag}]</span>{' '}
                          <span className={color}>{log.message}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Window Status Bar */}
            <div className="bg-[#18202f] px-3 py-1.5 border-t border-slate-700 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none">
              <div>Python 3.10 | Binance Spot REST API | SSL/TLS Https Verified</div>
              <div className="text-emerald-400 font-medium">Log file synced: trading_bot.log</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PYTHON CODE VIEWER */}
      {activeTab === 'code' && (
        <div className="p-4 lg:p-6 bg-[#070a0f] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300">
              Arquivo: <strong className="text-white">bot_trader_binance.py</strong> (Tkinter GUI + Binance API + Logging)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(PYTHON_SCRIPT_CONTENT);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="px-3 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copiado!' : 'Copiar Código'}
              </button>
              <button
                onClick={handleDownloadPythonScript}
                className="px-3 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Script (.py)
              </button>
            </div>
          </div>

          <pre className="p-4 bg-[#0a0d14] border border-slate-800 rounded-lg text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed max-h-[500px]">
            {PYTHON_SCRIPT_CONTENT}
          </pre>
        </div>
      )}

      {/* TAB 3: STEP-BY-STEP INSTRUCTIONS */}
      {activeTab === 'instructions' && (
        <div className="p-4 lg:p-6 bg-[#070a0f] flex flex-col gap-4 text-xs text-slate-300">
          <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Como Rodar a Aplicação Python no Windows
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
              <li>
                Clique no botão <strong>"Baixar .PY"</strong> no topo desta tela para salvar o arquivo <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">bot_trader_binance.py</code> em seu computador (por exemplo, na pasta Downloads ou em uma pasta de sua escolha).
              </li>
              <li>
                Certifique-se de ter o Python instalado (versão 3.8 ou superior). Você pode baixar em <a href="https://python.org" target="_blank" rel="noreferrer" className="text-blue-400 underline">python.org</a> marcando a opção <em>"Add Python to PATH"</em> no instalador.
              </li>
              <li>
                Abra o <strong>Prompt de Comando (CMD)</strong> ou <strong>PowerShell</strong> na pasta do arquivo e digite:
                <pre className="mt-1.5 p-2.5 bg-black rounded font-mono text-emerald-400">python bot_trader_binance.py</pre>
              </li>
              <li>
                A janela desktop do robô com interface gráfica será aberta instantaneamente.
              </li>
              <li>
                O arquivo <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">trading_bot.log</code> será criado automaticamente na mesma pasta registrando todas as cotações, gatilhos de compra na baixa, take profit e stop loss!
              </li>
            </ol>
          </div>

          <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              Como Rodar no Linux / MacOS
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
              <li>
                Abra o terminal e execute:
                <pre className="mt-1.5 p-2.5 bg-black rounded font-mono text-blue-300">
                  python3 bot_trader_binance.py
                </pre>
              </li>
              <li>
                Caso sua distribuição Linux minimalista não possua o pacote Tkinter instalado, instale com:
                <pre className="mt-1.5 p-2.5 bg-black rounded font-mono text-blue-300">
                  sudo apt-get install python3-tk
                </pre>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
