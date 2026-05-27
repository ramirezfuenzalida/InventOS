import React, { useState } from 'react';
import { supabase } from '../supabaseClient.ts';
import { Lock, Mail, AlertCircle, Eye, EyeOff, Loader2, Music } from 'lucide-react';

interface LoginViewProps {
  onSuccess: () => void;
  onClose?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Error de autenticación desconocido.');
      }
    } finally {
      setLoading(false);
    }
  };

  const bgUrl = `${import.meta.env.BASE_URL}orchestra_login_bg.png`;

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${bgUrl})` }}
    >
      {/* Deep Dark/Purple Glassmorphic Overlay on the Background */}
      <div className="absolute inset-0 bg-[#020512]/65 backdrop-blur-[6px] pointer-events-none"></div>

      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-500/20 blur-[130px] rounded-full animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-rose-500/15 blur-[130px] rounded-full animate-pulse pointer-events-none"></div>

      {/* Main Glassmorphic Card */}
      <div className="bg-[#0b0f24]/45 border border-white/[0.12] rounded-[36px] p-8 sm:p-10 max-w-md w-full shadow-[0_32px_128px_rgba(0,0,0,0.85)] relative overflow-hidden backdrop-blur-3xl">
        {/* Subtle interior glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-transparent to-white/[0.04] pointer-events-none"></div>
        
        {/* Decorative dynamic top border highlight */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-500"></div>

        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
          
          {/* Logo Container with glass-back */}
          <div className="w-16 h-16 bg-white/[0.04] border border-white/[0.15] rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-xl group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/25 to-rose-500/25 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
            <Music className="w-7 h-7 text-indigo-400 group-hover:scale-110 group-hover:text-white transition-all duration-500 relative z-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
              Panel <span className="text-indigo-400">OSWT</span>
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] leading-relaxed">
              Control de Inventario y Préstamos
            </p>
          </div>

          {errorMsg && (
            <div className="w-full bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 flex items-start gap-3 text-left animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-300 font-bold uppercase tracking-wide leading-tight">
                {errorMsg === 'Invalid login credentials' ? 'Credenciales de acceso inválidas.' : errorMsg}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="admin@oswt.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:bg-black/60 transition-all uppercase tracking-wide"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:bg-black/60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-4 w-full">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4.5 bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:bg-white/[0.08] hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-4.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
