import React from 'react';
import { Users, GraduationCap, ArrowRight } from 'lucide-react';

interface StudentStats {
  total: number;
  basica: number;
  media: number;
  otros: number;
}

interface StudentDashboardStatsProps {
  stats: StudentStats;
  onViewDirectory: () => void;
}

const StudentDashboardStats: React.FC<StudentDashboardStatsProps> = ({ stats, onViewDirectory }) => {
  const basicaPercentage = stats.total > 0 ? Math.round((stats.basica / stats.total) * 100) : 0;
  const mediaPercentage = stats.total > 0 ? Math.round((stats.media / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tight uppercase leading-none">
            Resumen de <span className="text-indigo-400">Estudiantes</span>
          </h3>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">
            Matrícula activa en el sistema de orquesta
          </p>
        </div>
        <button 
          onClick={onViewDirectory}
          className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-white flex items-center gap-2 group transition-colors self-start sm:self-auto"
        >
          Ver Directorio Completo 
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Enseñanza Básica */}
        <div 
          onClick={onViewDirectory}
          className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[2rem] shadow-lg relative overflow-hidden hover:border-orange-500/40 transition-all duration-300 group cursor-pointer active:scale-98"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div className="bg-orange-500/10 p-3 rounded-2xl w-fit transition-transform group-hover:scale-110">
              <GraduationCap className="w-6 h-6 text-orange-400" />
            </div>
            <span className="text-[9px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3.5 py-1 rounded-full uppercase tracking-widest">
              1° a 8° Básico
            </span>
          </div>

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.12em] mb-4">Enseñanza Básica</p>
          <div className="flex items-baseline gap-2 mb-4">
            <h4 className="text-4xl font-black text-white tracking-tighter">{stats.basica}</h4>
            <span className="text-xs text-slate-600 font-bold lowercase">estudiantes</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-500">
              <span>Porcentaje</span>
              <span className="text-orange-400 font-black">{basicaPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full transition-all duration-1000"
                style={{ width: `${basicaPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card Enseñanza Media */}
        <div 
          onClick={onViewDirectory}
          className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[2rem] shadow-lg relative overflow-hidden hover:border-violet-500/40 transition-all duration-300 group cursor-pointer active:scale-98"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-3xl rounded-full"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div className="bg-violet-600/10 p-3 rounded-2xl w-fit transition-transform group-hover:scale-110">
              <GraduationCap className="w-6 h-6 text-violet-400" />
            </div>
            <span className="text-[9px] font-black text-violet-400 bg-violet-600/10 border border-violet-500/20 px-3.5 py-1 rounded-full uppercase tracking-widest">
              I° a IV° Medio
            </span>
          </div>

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.12em] mb-4">Enseñanza Media</p>
          <div className="flex items-baseline gap-2 mb-4">
            <h4 className="text-4xl font-black text-white tracking-tighter">{stats.media}</h4>
            <span className="text-xs text-slate-600 font-bold lowercase">estudiantes</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-500">
              <span>Porcentaje</span>
              <span className="text-violet-400 font-black">{mediaPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-1000"
                style={{ width: `${mediaPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card Resumen / Total */}
        <div 
          onClick={onViewDirectory}
          className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[2rem] shadow-lg relative overflow-hidden hover:border-indigo-500/40 transition-all duration-300 group cursor-pointer active:scale-98"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div className="bg-indigo-500/10 p-3 rounded-2xl w-fit transition-transform group-hover:scale-110">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1 rounded-full uppercase tracking-widest">
              Total Matrícula
            </span>
          </div>

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.12em] mb-4">Músicos Totales</p>
          <div className="flex items-baseline gap-2 mb-4">
            <h4 className="text-4xl font-black text-white tracking-tighter">{stats.total}</h4>
            <span className="text-xs text-slate-600 font-bold lowercase">estudiantes</span>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[10px] font-black uppercase tracking-widest text-slate-500 flex justify-between">
            <span>Otros / Personal:</span>
            <span className="text-indigo-400 font-black">{stats.otros}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardStats;
