
import React, { useMemo } from 'react';
import { AlertTriangle, Clock, User, Music, Calendar, X } from 'lucide-react';
import { InventoryItem } from '../types.ts';
import { isItemLoaned } from '../utils.ts';

interface OverdueAlertsProps {
  inventory: InventoryItem[];
  maxDays?: number;
  onClose: () => void;
  onSelectItem?: (item: InventoryItem) => void;
}

interface OverdueItem {
  item: InventoryItem;
  daysOut: number;
  fechaSalida: string;
}

const OverdueAlerts: React.FC<OverdueAlertsProps> = ({ inventory, maxDays = 7, onClose, onSelectItem }) => {
  const overdueItems = useMemo((): OverdueItem[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return inventory
      .filter(item => isItemLoaned(item) && item.FechaSalida)
      .map(item => {
        const salida = new Date(item.FechaSalida);
        salida.setHours(0, 0, 0, 0);
        const diffMs = today.getTime() - salida.getTime();
        const daysOut = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return { item, daysOut, fechaSalida: item.FechaSalida };
      })
      .filter(o => o.daysOut > maxDays)
      .sort((a, b) => b.daysOut - a.daysOut);
  }, [inventory, maxDays]);

  const getSeverity = (days: number): { color: string; label: string } => {
    if (days > 30) return { color: 'rose', label: 'CRÍTICO' };
    if (days > 14) return { color: 'amber', label: 'URGENTE' };
    return { color: 'yellow', label: 'VENCIDO' };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-3xl flex items-start justify-center overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300">
      <div className="bg-slate-900/90 border border-white/10 rounded-[2.5rem] w-full max-w-2xl shadow-[0_64px_128px_rgba(0,0,0,0.8)] relative overflow-hidden my-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] rounded-full" />

        {/* Header */}
        <div className="relative p-8 md:p-12 border-b border-white/5">
          <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-slate-950 rounded-2xl text-slate-500 hover:text-white transition-all shadow-lg">
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-rose-600/10 rounded-[1.5rem] flex items-center justify-center border border-rose-500/20">
              <AlertTriangle className="w-8 h-8 text-rose-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                Préstamos <span className="text-rose-500">Vencidos</span>
              </h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
                {overdueItems.length} instrumento{overdueItems.length !== 1 ? 's' : ''} con más de {maxDays} días fuera
              </p>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="p-6 md:p-8 space-y-4">
          {overdueItems.length === 0 ? (
            <div className="py-20 text-center">
              <Clock className="w-12 h-12 text-emerald-500/30 mx-auto mb-4" />
              <p className="text-emerald-500 font-black uppercase text-xs tracking-[0.3em]">Todo en orden</p>
              <p className="text-slate-700 text-[10px] font-bold uppercase tracking-widest mt-2">
                No hay préstamos vencidos
              </p>
            </div>
          ) : (
            overdueItems.map((overdue) => {
              const severity = getSeverity(overdue.daysOut);
              return (
                <button
                  key={String(overdue.item.id)}
                  onClick={() => onSelectItem?.(overdue.item)}
                  className="w-full bg-slate-900/40 border border-white/5 p-6 rounded-2xl flex items-center gap-5 hover:bg-slate-800/60 hover:border-rose-500/20 transition-all text-left group"
                >
                  <div className={`w-14 h-14 bg-${severity.color}-500/10 rounded-xl flex flex-col items-center justify-center border border-${severity.color}-500/20 flex-shrink-0`}>
                    <span className={`text-lg font-black text-${severity.color}-500 leading-none`}>{overdue.daysOut}</span>
                    <span className={`text-[7px] font-black text-${severity.color}-500/60 uppercase`}>días</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-${severity.color}-500/10 text-${severity.color}-500`}>
                        {severity.label}
                      </span>
                    </div>
                    <p className="text-white font-bold text-sm uppercase truncate">{overdue.item.Estudiante}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{overdue.item.Instrumento}</span>
                      <span className="text-[10px] font-bold text-slate-600">•</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{overdue.item.Marca} {overdue.item.Modelo}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">
                      Salida: {overdue.fechaSalida} • {overdue.item.Curso}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

/** Badge counter for the dashboard */
export const OverdueBadge: React.FC<{ inventory: InventoryItem[]; maxDays?: number; onClick: () => void }> = ({ inventory, maxDays = 7, onClick }) => {
  const count = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inventory.filter(item => {
      if (!isItemLoaned(item) || !item.FechaSalida) return false;
      const salida = new Date(item.FechaSalida);
      salida.setHours(0, 0, 0, 0);
      const days = Math.floor((today.getTime() - salida.getTime()) / (1000 * 60 * 60 * 24));
      return days > maxDays;
    }).length;
  }, [inventory, maxDays]);

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="relative bg-rose-600/10 border border-rose-500/20 px-5 py-3 rounded-2xl flex items-center gap-3 hover:bg-rose-600/20 transition-all group"
    >
      <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
      <span className="text-rose-400 text-[10px] font-black uppercase tracking-widest">
        {count} Vencido{count !== 1 ? 's' : ''}
      </span>
    </button>
  );
};

export default OverdueAlerts;
