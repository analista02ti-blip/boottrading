import React, { useState } from 'react';
import { X, Key, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { BotConfig } from '../types/trading';
import { checkBinanceAccount, checkBinancePing } from '../services/binanceService';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BotConfig;
  onChangeConfig: (newConfig: Partial<BotConfig>) => void;
  onLog: (level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', tag: string, message: string) => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  onLog
}) => {
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [apiSecret, setApiSecret] = useState(config.apiSecret);
  const [useTestnet, setUseTestnet] = useState(config.useTestnet);
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onChangeConfig({
      apiKey,
      apiSecret,
      useTestnet,
      isSimulated: !(apiKey && apiSecret) // If no keys, enforce simulation
    });
    onLog('INFO', 'CONFIG', `Configurações da API Binance salvas com sucesso. Ambiente: ${useTestnet ? 'Testnet' : 'Produção'}`);
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    // First test ping
    const pingRes = await checkBinancePing(useTestnet);
    if (!pingRes.success) {
      setTestResult({
        success: false,
        message: `Falha na conexão de rede com a Binance: ${pingRes.error}`
      });
      setIsTesting(false);
      return;
    }

    // If keys provided, test signed account access
    if (apiKey && apiSecret) {
      const accRes = await checkBinanceAccount(apiKey, apiSecret, useTestnet);
      if (accRes.success) {
        setTestResult({
          success: true,
          message: `Conexão autenticada OK! Latência: ${pingRes.latencyMs}ms. Saldos sincronizados com a Binance.`
        });
        onLog('SUCCESS', 'BINANCE_API', `Autenticação com a Binance bem-sucedida! Latência: ${pingRes.latencyMs}ms`);
      } else {
        setTestResult({
          success: false,
          message: `Erro de autenticação Binance: ${accRes.error}`
        });
        onLog('ERROR', 'BINANCE_API', `Falha de autenticação: ${accRes.error}`);
      }
    } else {
      setTestResult({
        success: true,
        message: `Conexão pública com Binance OK! Latência: ${pingRes.latencyMs}ms. (Sem chaves de ordem real - operando em modo simulação)`
      });
      onLog('INFO', 'BINANCE_API', `Conexão pública com Binance estabelecida (${pingRes.latencyMs}ms)`);
    }

    setIsTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                CONFIGURAÇÃO DA API BINANCE
              </h3>
              <div className="text-[11px] text-slate-400">
                Integração REST com assinatura criptográfica HMAC SHA-256
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Environment Choice */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              Ambiente da Binance
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseTestnet(false)}
                className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer ${
                  !useTestnet
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                Binance Oficial (Produção)
                <div className="text-[10px] text-slate-400 font-normal">api.binance.com</div>
              </button>
              <button
                type="button"
                onClick={() => setUseTestnet(true)}
                className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer ${
                  useTestnet
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                Binance Testnet (Demo)
                <div className="text-[10px] text-slate-400 font-normal">testnet.binance.vision</div>
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Binance API Key
            </label>
            <input
              type="text"
              placeholder="Cole sua Binance API Key aqui..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Secret Key Input */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Binance Secret Key
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="Cole sua Binance Secret Key aqui..."
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Security Tip */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Recomendações de Segurança
            </div>
            <div>
              • Nunca habilite permissão de "Saque" (Withdrawal) na chave de API da Binance.
            </div>
            <div>
              • Habilite apenas "Leitura" (Read) e "Spot Trading" (Negociação à Vista).
            </div>
            <div>
              • Se deixar os campos vazios, o robô opera no <strong>Modo Simulação (Paper Trading)</strong> com dados reais de mercado em tempo real.
            </div>
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/40 border-red-800/60 text-red-300'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3 py-1.5 text-xs rounded border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            Testar Conexão
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded border border-slate-800 text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
