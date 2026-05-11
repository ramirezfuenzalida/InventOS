
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
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card, idx) => (
        <button key={idx} onClick={() => onCardClick?.(card.id)} className={`bg-slate-900 border border-slate-800 p-5 sm:p-7 rounded-[1.5rem] sm:rounded-[2rem] shadow-lg ${card.shadow} hover:border-slate-500 transition-all duration-300 group text-left cursor-pointer active:scale-95`}>
          <div className={`${card.bg} p-3 rounded-xl sm:rounded-2xl w-fit transition-transform group-hover:scale-110 mb-3 sm:mb-4`}>
            <card.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${card.color}`} />
          </div>
          <p className="text-[9px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.08em] sm:tracking-[0.12em] leading-snug mb-4 sm:mb-6">{card.label}</p>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <h4 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">{card.value}</h4>
            <span className="text-xs sm:text-sm text-slate-600 font-bold tracking-tight lowercase">cantidad</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default KPICards;
