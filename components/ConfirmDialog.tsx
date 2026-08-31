import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Reemplazo de window.confirm(): en iOS, cuando la app está agregada a la
 * pantalla de inicio (modo standalone), el diálogo nativo confirm() no se
 * muestra de forma confiable — a veces no aparece en absoluto, y como
 * `if (!confirm(...))` interpreta eso como "cancelado", la acción no se
 * ejecuta sin ningún error visible. Este hook renderiza una modal propia
 * con la misma ergonomía async que confirm().
 */
export function useConfirm(): [(opts: ConfirmOptions | string) => Promise<boolean>, React.ReactNode] {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirmAsync = useCallback((optsOrMessage: ConfirmOptions | string) => {
    const opts = typeof optsOrMessage === 'string' ? { message: optsOrMessage } : optsOrMessage;
    setState(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = (result: boolean) => {
    setState(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  };

  const dialog = state && (
    <div
      className="fixed inset-0 z-[300] bg-[#020617]/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="bg-slate-900/95 border border-white/10 rounded-[2.5rem] p-8 sm:p-10 max-w-md w-full shadow-[0_40px_120px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-rose-600/10 rounded-2xl flex items-center justify-center border border-rose-500/20 shrink-0">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          {state.title && (
            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{state.title}</h3>
          )}
          <p className="text-slate-300 text-sm font-semibold leading-relaxed">{state.message}</p>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all border border-white/10"
            >
              {state.cancelLabel || 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={() => handleClose(true)}
              className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/20"
            >
              {state.confirmLabel || 'Sí, continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return [confirmAsync, dialog];
}
