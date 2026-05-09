
import React, { useState, useMemo } from 'react';
import { Search, Music, User, CheckCircle, ArrowRight, LogOut, LogIn, RotateCcw, X, Calendar, AlertCircle } from 'lucide-react';
import { InventoryItem } from '../types.ts';
import { isItemLoaned } from '../utils.ts';

interface StudentCheckOutProps {
  inventory: InventoryItem[];
  onConfirm: (id: number, student: string, curso: string, fecha: string) => void;
  onReturn: (id: number, fecha: string) => void;
  onCancel?: () => void;
}

const StudentCheckOut: React.FC<StudentCheckOutProps> = ({ inventory, onConfirm, onReturn, onCancel }) => {
  const [mode, setMode] = useState<'out' | 'in'>('out');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Normalización SOLO para la búsqueda, no para los datos
  const searchNormalize = (val: any) => (val || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const searchResults = useMemo(() => {
    const term = searchNormalize(searchTerm);
    if (!term) {
      if (mode === 'in') return inventory.filter(item => isItemLoaned(item)).slice(0, 15);
      return [];
    }

    return inventory.filter(item => {
      const studentMatch = searchNormalize(item.Estudiante).includes(term);
      const instrumentMatch = searchNormalize(item.Instrumento).includes(term);
      const serieMatch = searchNormalize(item.Serie).includes(term);
      const modelMatch = searchNormalize(item.Modelo).includes(term);
      const brandMatch = searchNormalize(item.Marca).includes(term);
      
      const isMatch = studentMatch || instrumentMatch || serieMatch || modelMatch || brandMatch;
      
      if (mode === 'in') return isMatch && isItemLoaned(item);
      return isMatch;
    }).slice(0, 10);
  }, [inventory, searchTerm, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (mode === 'out') {
      // Usar EXACTAMENTE los datos del item del Excel
      onConfirm(
        Number(selectedItem.id), 
        selectedItem.Estudiante || '', 
        selectedItem.Curso || '', 
        selectedDate
      );
    } else {
      onReturn(Number(selectedItem.id), selectedDate);
    }
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-12 rounded-[3rem] text-center shadow-2xl animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-10">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Registro Exitoso</h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-10">La nube ha sido actualizada</p>
        <button 
          onClick={() => { setIsSubmitted(false); setSelectedItem(null); setSearchTerm(''); }}
          className="w-full bg-indigo-600 py-6 rounded-[2rem] font-black text-white flex items-center justify-center gap-4 uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
        >
          <RotateCcw className="w-5 h-5" /> OTRO MOVIMIENTO
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Tabs de modo - Estilo Original */}
        <div className="flex p-2 bg-slate-950/50 border-b border-slate-800/50">
          <button
            type="button"
            onClick={() => { setMode('out'); setSelectedItem(null); setSearchTerm(''); }}
            className={`flex-1 py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-widest transition-all ${mode === 'out' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <LogOut className="w-5 h-5 inline mr-3" /> Salida
          </button>
          <button
            type="button"
            onClick={() => { setMode('in'); setSelectedItem(null); setSearchTerm(''); }}
            className={`flex-1 py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-widest transition-all ${mode === 'in' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <LogIn className="w-5 h-5 inline mr-3" /> Retorno
          </button>
        </div>

        <div className="p-8 md:p-14 space-y-10">
          {!selectedItem ? (
            <div className="space-y-8">
              <div className="relative group">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-8 h-8 text-slate-700 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  className="w-full bg-[#020617] border-2 border-slate-900 focus:border-indigo-500 rounded-[2.5rem] py-8 pl-20 pr-10 text-2xl font-black text-white placeholder:text-slate-800 outline-none transition-all uppercase"
                  placeholder={mode === 'out' ? "Escribe nombre del alumno..." : "Buscar instrumento o alumno..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-4">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="w-full bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all group text-left"
                  >
                    <div className="flex items-center gap-8">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${isItemLoaned(item) ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        <Music className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-white font-black uppercase italic text-xl leading-none mb-2">{item.Estudiante || 'DISPONIBLE'}</p>
                        <div className="flex flex-wrap gap-3">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{item.Instrumento}</span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">|</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.Marca} {item.Modelo}</span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">|</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">S/N: {item.Serie}</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mt-2">{item.Curso || 'SIN CURSO'}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 text-slate-700 group-hover:text-white transition-all" />
                  </button>
                ))}
                
                {searchTerm && searchResults.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                    <p className="text-slate-700 font-black uppercase italic tracking-[0.2em]">No se encontraron coincidencias exactas</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in zoom-in-95 duration-300">
              <div className="bg-indigo-600/5 p-12 rounded-[3.5rem] border-2 border-indigo-500/20 relative">
                <button 
                  type="button" 
                  onClick={() => setSelectedItem(null)} 
                  className="absolute top-8 right-8 p-4 bg-slate-900 rounded-[1.5rem] text-slate-500 hover:text-white transition-all shadow-xl"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="w-28 h-28 bg-slate-900 rounded-[2rem] flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner">
                    <User className="w-14 h-14" />
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.4em] mb-3">RESUMEN DEL REGISTRO</p>
                    <h3 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-6">{selectedItem.Estudiante}</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#020617] p-8 rounded-[2rem] border border-white/5">
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Instrumento y Modelo</p>
                        <p className="text-white font-bold text-sm uppercase">{selectedItem.Instrumento} - {selectedItem.Marca} {selectedItem.Modelo}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Curso</p>
                        <p className="text-white font-bold text-sm uppercase">{selectedItem.Curso}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Número de Serie</p>
                        <p className="text-white font-bold text-sm uppercase">{selectedItem.Serie}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Ubicación Actual</p>
                        <p className={`text-sm font-bold uppercase ${isItemLoaned(selectedItem) ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {selectedItem.Ubicacion}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] ml-6">FECHA</label>
                  <div className="relative">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-700" />
                    <input
                      type="date"
                      className="w-full bg-[#020617] border-2 border-slate-900 rounded-[2rem] py-7 pl-16 pr-8 text-white font-black outline-none focus:border-indigo-500/50 transition-all shadow-xl"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleSubmit}
                  className={`md:col-span-2 py-8 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-6 transition-all shadow-2xl hover:scale-[1.02] active:scale-95 text-white ${mode === 'out' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}
                >
                  {mode === 'out' ? <LogOut className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
                  {mode === 'out' ? 'CONFIRMAR SALIDA' : 'PROCESAR RETORNO'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCheckOut;
