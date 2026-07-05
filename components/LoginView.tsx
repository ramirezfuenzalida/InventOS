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
      if (error) throw error;
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
      {/* Capa base: oscurecido + tinte índigo para cohesión con la app */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#050818]/85 via-[#020617]/90 to-[#0b0a24]/90 backdrop-blur-[7px] pointer-events-none" />
      {/* Vignette para enfocar el centro */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 90% at 50% 40%, transparent 30%, rgba(2,6,23,0.75) 100%)' }} />

      {/* Halos ambientales */}
      <div className="absolute top-[18%] left-[22%] w-[380px] h-[380px] bg-indigo-500/25 blur-[140px] rounded-full animate-pulse motion-reduce:animate-none pointer-events-none" />
      <div className="absolute bottom-[16%] right-[20%] w-[360px] h-[360px] bg-violet-600/20 blur-[140px] rounded-full animate-pulse motion-reduce:animate-none pointer-events-none" />

      {/* Tarjeta de cristal (gloss) */}
      <div className="relative w-full max-w-md rounded-[34px] overflow-hidden">
        {/* Borde con degradado (marco de cristal) */}
        <div className="absolute inset-0 rounded-[34px] p-[1.5px] bg-gradient-to-b from-white/40 via-white/10 to-white/[0.03] pointer-events-none" />

        <div className="relative rounded-[34px] bg-[#0a0f26]/60 backdrop-blur-2xl px-8 sm:px-10 pt-10 pb-9 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
          {/* Reflejo/gloss superior */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.14] to-transparent pointer-events-none rounded-t-[34px]" />
          {/* Línea de luz superior */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">

            {/* ── Medallón glossy con el logo de la app ── */}
            <div className="relative mb-8">
              {/* Halo */}
              <div className="absolute -inset-6 rounded-[2.2rem] bg-indigo-500/45 blur-2xl animate-pulse motion-reduce:animate-none" />
              {/* Anillo cónico girando (sutil) */}
              <div
                className="absolute -inset-[3px] rounded-[1.9rem] opacity-70 [animation:spin_10s_linear_infinite] motion-reduce:[animation:none]"
                style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(129,140,248,0.95) 80deg, transparent 190deg, rgba(139,92,246,0.75) 300deg, transparent 360deg)' }}
              />
              {/* Tile glossy (estilo app-icon): el logo llena el recuadro y su fondo
                  blanco se funde con el tile, sin costura visible. */}
              <div
                className="relative w-28 h-28 rounded-[1.75rem] overflow-hidden bg-white"
                style={{
                  boxShadow: 'inset 0 -14px 28px rgba(79,70,229,0.22), 0 24px 60px rgba(79,70,229,0.5)'
                }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}logo_orquesta_sinfonica_wt.png`}
                  alt="Logo Orquesta Sinfónica William Taylor"
                  className="absolute inset-0 w-full h-full object-contain scale-[1.18]"
                />
                {/* Reflejo especular (gloss) sobre el logo */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />
                <div className="absolute top-2 left-3 right-9 h-6 rounded-full bg-white/80 blur-md opacity-70 pointer-events-none" />
                {/* Aro interior sutil para definir el borde del ícono */}
                <div className="absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-indigo-500/15 pointer-events-none" />
              </div>
            </div>

            {/* Título */}
            <h1 className="px-2 text-5xl font-black text-white italic tracking-tight uppercase leading-[1.08]">
              Invent<span className="inline-block pr-1.5 bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent">OS</span>
            </h1>
            <p className="mt-3.5 text-slate-400/90 text-[10px] font-black uppercase tracking-[0.3em]">
              Orquesta Sinfónica · William Taylor
            </p>

            {errorMsg && (
              <div className="mt-7 w-full bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 text-left animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-200 font-bold uppercase tracking-wide leading-tight">
                  {errorMsg === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : errorMsg}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 w-full space-y-5">
              <div className="space-y-2 text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3">
                  Correo electrónico
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="tucorreo@cmwt.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#050914]/70 border border-white/[0.10] rounded-2xl text-sm font-semibold text-white placeholder-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/30 focus:bg-[#050914] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3">
                  Contraseña
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-[#050914]/70 border border-white/[0.10] rounded-2xl text-sm font-semibold text-white placeholder-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/30 focus:bg-[#050914] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-3 w-full">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-4 bg-white/[0.04] border border-white/[0.10] text-slate-300 hover:bg-white/[0.09] hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                )}
                {/* Botón glossy */}
                <button
                  type="submit"
                  disabled={loading}
                  className="relative flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white overflow-hidden transition-all shadow-[0_14px_34px_-8px_rgba(79,70,229,0.7)] hover:shadow-[0_18px_44px_-8px_rgba(79,70,229,0.85)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                  style={{ background: 'linear-gradient(180deg, #6366f1 0%, #4f46e5 55%, #4338ca 100%)' }}
                >
                  {/* Sheen superior (gloss) */}
                  <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
                  {/* Línea de brillo inferior */}
                  <span className="absolute inset-x-3 bottom-0 h-px bg-white/20 pointer-events-none" />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Ingresando…
                      </>
                    ) : (
                      'Ingresar'
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
