import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Cpu, 
  Fingerprint, 
  Zap,
  Globe2,
  TrendingUp,
  Activity
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: { email: string; name: string; role: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [show2FA, setShow2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Quick Demo Accounts Fill
  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha institucional.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);

    // Simulate secure TLS authentication
    setTimeout(() => {
      setIsLoading(false);
      const name = email.split('@')[0].toUpperCase();
      onLoginSuccess({
        email,
        name,
        role: email.includes('vip') ? 'Trader VIP Pro' : 'Operador Quantitativo'
      });
    }, 650);
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Background Lighting & Horizon Atmosphere (Fixed, no jitter) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/4 -right-40 w-[550px] h-[550px] bg-cyan-500/15 rounded-full blur-[160px]" />
        <div className="absolute -bottom-32 left-1/4 w-[650px] h-[650px] bg-blue-600/10 rounded-full blur-[170px]" />
        
        {/* Subtle Static Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* TOP BAR: Institutional Exchange Header with Live Market Ticker */}
      <header className="relative z-20 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-[#0b0e14] rounded-[7px] flex items-center justify-center text-amber-400 font-extrabold text-sm tracking-wider">
              BN
            </div>
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-wider text-white flex items-center gap-2">
              BINANCE INSTITUTIONAL
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                PRO DESK
              </span>
            </div>
          </div>
        </div>

        {/* Live Exchange Ticker Strip */}
        <div className="hidden md:flex items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">BTC/USDT:</span>
            <span className="text-emerald-400 font-bold">$84,374.50</span>
            <span className="text-[10px] text-emerald-500 font-semibold">+1.84%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">ETH/USDT:</span>
            <span className="text-emerald-400 font-bold">$2,642.10</span>
            <span className="text-[10px] text-emerald-500 font-semibold">+2.15%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">SOL/USDT:</span>
            <span className="text-emerald-400 font-bold">$154.20</span>
            <span className="text-[10px] text-emerald-500 font-semibold">+3.90%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">BNB/USDT:</span>
            <span className="text-emerald-400 font-bold">$588.60</span>
            <span className="text-[10px] text-emerald-500 font-semibold">+0.75%</span>
          </div>
        </div>

        {/* Security Status Badge */}
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800/40">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Gateway Seguro TLS 1.3</span>
          <span className="sm:hidden">Seguro</span>
        </div>
      </header>

      {/* MAIN CONTAINER: Centered Fixed Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md bg-gradient-to-b from-[#131926] via-[#0e1420] to-[#090d16] border border-slate-700/90 rounded-2xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-xl relative">
          
          {/* Top Accent Golden Rim */}
          <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20 shrink-0">
                <div className="w-full h-full bg-[#0b0e14] rounded-[11px] flex items-center justify-center text-amber-400 font-extrabold text-sm tracking-wider">
                  BN
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  Acesso Institucional
                </h2>
                <div className="text-xs text-slate-400">
                  Terminal Protegido de Criptomoedas
                </div>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800/70 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* E-mail / Trader ID */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>E-mail / Trader ID</span>
                    <span className="text-[10px] text-slate-500 font-mono">SSL 256-Bit</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@binance-algo.com"
                      className="w-full bg-[#070a10] border border-slate-700/80 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono transition-colors shadow-inner"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>Senha de Acesso</span>
                    <button
                      type="button"
                      onClick={() => fillDemoAccount('trader.vip@binance-algo.com', 'trader2026@vip')}
                      className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                    >
                      Preencher Demo VIP
                    </button>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#070a10] border border-slate-700/80 rounded-lg pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono transition-colors shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 2FA Toggle / Optional Authenticator */}
                {show2FA ? (
                  <div className="pt-1 animate-in fade-in duration-200">
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                      <span className="text-cyan-400 flex items-center gap-1.5">
                        <Fingerprint className="w-3.5 h-3.5" />
                        Código 2FA Authenticator (6 dígitos)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShow2FA(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-300"
                      >
                        Ocultar
                      </button>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 849201"
                      className="w-full bg-[#070a10] border border-cyan-800/80 rounded-lg px-3.5 py-2 text-center text-sm font-mono tracking-widest text-cyan-300 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={() => setShow2FA(true)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      Inserir Token 2FA (Opcional)
                    </button>
                  </div>
                )}

                {/* Remember & Security Checkbox */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                    />
                    <span>Lembrar este terminal</span>
                  </label>
                  <span className="text-slate-500 font-mono text-[11px]">Enclave Ativo</span>
                </div>

                {/* Submit 3D Glowing Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all duration-200 shadow-[0_10px_25px_-5px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2 font-mono">
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        Autenticando na Rede...
                      </span>
                    ) : (
                      <>
                        <span>ACESSAR TERMINAL DE TRADING</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* DEMO ACCOUNTS QUICK-FILL BAR */}
              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mb-2 text-center">
                  Contas de Teste Prontas para Login Imediato:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('trader.vip@binance-algo.com', 'trader2026@vip')}
                    className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/80 text-left transition-colors cursor-pointer group"
                  >
                    <div className="text-[11px] font-bold text-amber-300 group-hover:text-amber-200 truncate">
                      Trader VIP Pro
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 truncate">
                      trader.vip@binance-algo.com
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoAccount('quant@binance-algo.com', 'quant#matrix99')}
                    className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/80 text-left transition-colors cursor-pointer group"
                  >
                    <div className="text-[11px] font-bold text-cyan-300 group-hover:text-cyan-200 truncate">
                      Operador Quant
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 truncate">
                      quant@binance-algo.com
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </main>

      {/* FOOTER: Exibe exatamente as informações do segundo anexo (HMAC Criptográfico e 2FA Anti-Hijacking) */}
      <footer className="relative z-20 border-t border-slate-900 bg-[#070a10]/95 px-4 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* INFORMAÇÕES DO SEGUNDO ANEXO (HMAC Criptográfico & 2FA Anti-Hijacking) */}
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          {/* Badge 1: HMAC Criptográfico */}
          <div className="px-5 py-2.5 rounded-lg bg-[#0d131f] border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-3 text-xs font-mono text-slate-300 shadow-sm">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-semibold tracking-wide">HMAC Criptográfico</span>
          </div>

          {/* Badge 2: 2FA Anti-Hijacking */}
          <div className="px-5 py-2.5 rounded-lg bg-[#0d131f] border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-3 text-xs font-mono text-slate-300 shadow-sm">
            <Fingerprint className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold tracking-wide">2FA Anti-Hijacking</span>
          </div>
        </div>

        {/* Server & Copyright */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 text-center md:text-right">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Globe2 className="w-3 h-3 text-blue-400" />
            Cluster: AWS us-east-1 · TLS 1.3
          </span>
          <span className="hidden sm:inline">·</span>
          <span>© 2026 Binance Algo Trader</span>
        </div>
      </footer>
    </div>
  );
};
