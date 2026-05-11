
import React from 'react';
import { Package, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

interface KPIStatsExtended {
  total: number;
  bueno: number;
  regular: number;
  malo: number;
  enPrestamo: number;
}

interface KPICardsProps {
  stats: KPIStatsExtended;
  onCardClick?: (filter: 'all' | 'bueno' | 'regular' | 'malo' | 'loaned') => void;
}

const KPICards: React.FC<KPICardsProps> = ({ stats, onCardClick }) => {
  const cards = [
    { id: 'all' as const, label: 'Total Instrumentos', value: stats.total, icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-400/10', shadow: 'shadow-indigo-500/10' },
    { id: 'bueno' as const, label: 'Estado: Bueno', value: stats.bueno, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', shadow: 'shadow-emerald-500/10' },
    { id: 'regular' as const, label: 'Estado: Regular', value: stats.regular, icon: HelpCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', shadow: 'shadow-amber-500/10' },
    { id: 'malo' as const, label: 'Estado: Malo', value: stats.malo, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-400/10', shadow: 'shadow-rose-500/10' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <button key={idx} onClick={() => onCardClick?.(card.id)} className={`bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[2rem] shadow-lg ${card.shadow} hover:border-slate-500 transition-all duration-300 group text-left cursor-pointer active:scale-95 overflow-hidden`}>
          <div className="flex items-center gap-3 sm:gap-4 mb-6 min-w-0">
            <div className={`${card.bg} p-3 sm:p-4 rounded-2xl transition-transform group-hover:scale-110 shrink-0`}><card.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${card.color}`} /></div>
            <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.1em] sm:tracking-[0.15em] leading-tight min-w-0 break-words">{card.label}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h4 className="text-4xl font-black text-white tracking-tighter">{card.value}</h4>
            <span className="text-sm text-slate-600 font-bold tracking-tight lowercase">cantidad</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default KPICards;
