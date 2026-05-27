import React, { useState } from 'react';
import { supabase } from '../supabaseClient.ts';
import { Lock, Mail, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-[150] bg-[#020617]/95 backdrop-blur-2xl flex items-center justify-center p-4">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>

      <div className="bg-slate-900/80 border border-white/10 rounded-[32px] p-8 sm:p-10 max-w-md w-full shadow-[0_32px_64px_rgba(0,0,0,0.6)] relative overflow-hidden backdrop-blur-md">
        {/* Decorative subtle top border highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg shadow-indigo-500/10">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
              Acceso <span className="text-indigo-400">Panel</span>
            </h2>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-relaxed">
              Inicia sesión como director o monitor responsable
            </p>
          </div>

          {errorMsg && (
            <div className="w-full bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-400 font-bold uppercase tracking-wide leading-tight">
                {errorMsg === 'Invalid login credentials' ? 'Credenciales de acceso inválidas.' : errorMsg}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="admin@oswt.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#020617]/60 border border-slate-800 rounded-2xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all uppercase tracking-wide"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-[#020617]/60 border border-slate-800 rounded-2xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
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
                  className="flex-1 py-4 bg-transparent border border-white/5 text-slate-400 hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
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
