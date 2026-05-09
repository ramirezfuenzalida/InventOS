
import React, { useState, useMemo } from 'react';
import { Search, User, CheckCircle, ArrowRight, LogOut, LogIn, RotateCcw, Music, X, Calendar, AlertCircle } from 'lucide-react';
import { InventoryItem } from '../types.ts';
import { isItemLoaned } from '../utils.ts';

interface StudentCheckOutProps {
  inventory: InventoryItem[];
  onConfirm: (id: number, student: string, curso: string, fecha: string) => void;
  onReturn: (id: number, fecha: string) => void;
  onCancel?: () => void;
  isExternalView?: boolean;
}

const StudentCheckOut: React.FC<StudentCheckOutProps> = ({ inventory, onConfirm, onReturn, onCancel, isExternalView }) => {
  const [mode, setMode] = useState<'out' | 'in'>('out');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState<InventoryItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const normalize = (val: any) => (val || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const searchResults = useMemo(() => {
    const term = normalize(searchTerm);
    if (!term) {
        if (mode === 'in') return inventory.filter(item => isItemLoaned(item)).slice(0, 10);
        return [];
    }

    return inventory.filter(item => {
      const studentName = normalize(item.Estudiante);
      const instrumentName = normalize(item.Instrumento);
      const serie = normalize(item.Serie);
      
      const match = studentName.includes(term) || instrumentName.includes(term) || serie.includes(term);
      
      if (mode === 'in') return match && isItemLoaned(item);
      return match;
    }).slice(0, 10);
  }, [inventory, searchTerm, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInstrument) {
      if (mode === 'out') {
          onConfirm(Number(selectedInstrument.id), selectedInstrument.Estudiante || '', selectedInstrument.Curso || '', selectedDate);
      } else {
          onReturn(Number(selectedInstrument.id), selectedDate);
      }
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-center shadow-2xl animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8"><CheckCircle className="w-10 h-10 text-emerald-500" /></div>
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Registro Exitoso</h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">La información ha sido sincronizada</p>
        <button onClick={() => { setIsSubmitted(false); setSelectedInstrument(null); setSearchTerm(''); }} className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-white flex items-center justify-center gap-3 uppercase tracking-widest text-xs hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"><RotateCcw className="w-4 h-4" /> Nuevo registro</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4">
      <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-visible backdrop-blur-md">
        {/* Tabs de modo con el diseño de siempre */}
        <div className="flex p-2 bg-slate-950/50 rounded-t-[2.5rem] border-b border-slate-800/50">
          <button
            type="button"
            onClick={() => { setMode('out'); setSelectedInstrument(null); setSearchTerm(''); }}
            className={`flex-1 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${mode === 'out' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <LogOut className="w-4 h-4 inline mr-2" /> Salida
          </button>
          <button
            type="button"
            onClick={() => { setMode('in'); setSelectedInstrument(null); setSearchTerm(''); }}
            className={`flex-1 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${mode === 'in' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <LogIn className="w-4 h-4 inline mr-2" /> Retorno
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-12 space-y-8">
          <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${mode === 'out' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400'}`}>
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
              {mode === 'out'
                ? 'Busque por nombre o instrumento para registrar la salida.'
                : 'Seleccione el instrumento para procesar su retorno a la sala.'}
            </p>
          </div>

          <div className="space-y-6">
            <div className="relative">
              {!selectedInstrument ? (
                <div className="space-y-6">
                  <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      autoComplete="off"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={mode === 'out' ? "Escriba nombre o instrumento..." : "Buscar alumno o instrumento..."}
                      className="w-full bg-[#020617] border-2 border-slate-900 focus:border-indigo-500 rounded-[2rem] pl-16 pr-8 py-6 text-xl font-bold text-white placeholder:text-slate-700 outline-none transition-all shadow-2xl uppercase"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {searchResults.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedInstrument(item)}
                        className="bg-slate-900/60 p-6 rounded-[28px] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isItemLoaned(item) ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-400/10 text-indigo-400'}`}>
                            <Music className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="text-white font-black uppercase italic text-lg">{item.Instrumento}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {item.Estudiante || 'DISPONIBLE'} • SERIE: {item.Serie || 'S/N'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md border ${isItemLoaned(item) ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                            {isItemLoaned(item) ? 'EN HOGAR' : 'EN SALA'}
                          </p>
                          <ArrowRight className="w-5 h-5 text-slate-700 group-hover:text-white mt-2 ml-auto" />
                        </div>
                      </button>
                    ))}
                    {searchTerm && searchResults.length === 0 && (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                        <p className="text-slate-600 font-black uppercase italic tracking-widest">No se encontraron resultados</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="animate-in zoom-in-95 duration-300">
                  <div className="bg-indigo-600/5 p-10 rounded-[3rem] border-2 border-indigo-500/30 space-y-8 relative">
                    <button 
                      type="button" 
                      onClick={() => setSelectedInstrument(null)}
                      className="absolute top-6 right-6 p-3 bg-slate-900 rounded-2xl text-slate-500 hover:text-white transition-all"
                    >
                      <X className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center text-indigo-400">
                        <Music className="w-10 h-10" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Confirmar Movimiento</p>
                        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">{selectedInstrument.Instrumento}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{selectedInstrument.Estudiante} • {selectedInstrument.Curso}</p>
                      </div>
                    </div>

                    <div className="bg-[#020617] p-6 rounded-3xl border border-slate-800 grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Serie</p>
                            <p className="text-white font-bold">{selectedInstrument.Serie}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Marca</p>
                            <p className="text-white font-bold">{selectedInstrument.Marca}</p>
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Fecha</label>
              <div className="relative">
                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <input 
                  type="date" 
                  className="w-full px-14 py-5 bg-[#020617] border-2 border-slate-800 rounded-[2rem] text-white font-bold focus:border-indigo-500 outline-none" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedInstrument}
              className={`md:col-span-2 py-8 rounded-[2rem] font-black text-xl flex items-center justify-center gap-6 transition-all shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-20 text-white ${
                mode === 'out' 
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {mode === 'out' ? <LogOut className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
              {mode === 'out' ? 'CONFIRMAR SALIDA' : 'PROCESAR RETORNO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentCheckOut;
