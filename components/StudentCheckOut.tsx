
import React, { useState, useMemo } from 'react';
import { Search, User, CheckCircle, ArrowRight, LogOut, LogIn, RotateCcw, Tag, UserCheck, AlertCircle, Music } from 'lucide-react';
import { InventoryItem } from '../types.ts';
import { globalNormalize, isItemLoaned } from '../utils.ts';

interface StudentCheckOutProps {
  inventory: InventoryItem[];
  onConfirm: (id: number, student: string, curso: string, fecha: string) => void;
  onReturn: (id: number, fecha: string) => void;
  onCancel?: () => void;
  isExternalView?: boolean;
  availableStudents?: { name: string; course: string; }[]; // New prop for student list
}

const StudentCheckOut: React.FC<StudentCheckOutProps> = ({ inventory, onConfirm, onReturn, onCancel, isExternalView, availableStudents }) => {
  const [mode, setMode] = useState<'out' | 'in'>('out');
  const [instrumentSearch, setInstrumentSearch] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentCourse, setStudentCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedInstrument, setSelectedInstrument] = useState<InventoryItem | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const normalizeText = (val: any) => (val || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // isItemLoaned is now imported from utils.ts

  /**
   * Genera un sonido de Acorde Premium (Estilo iOS Success Chord)
   * Utiliza síntesis aditiva para crear una textura rica y profesional.
   */
  const playSuccessSound = () => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioContextClass();
      const now = audioCtx.currentTime;

      const playTone = (freq: number, type: OscillatorType, volume: number, duration: number, delay: number = 0) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + delay);

        // Envolvente de volumen (Ataque percusivo iOS)
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(volume, now + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + duration);
      };

      // ACORDE DE ÉXITO (Inspirado en iOS Pay/Success)
      // Capa de cuerpo (Armonía)
      playTone(523.25, 'sine', 0.15, 0.8, 0);     // C5 (Do)
      playTone(659.25, 'sine', 0.12, 0.8, 0.02);  // E5 (Mi)
      playTone(783.99, 'sine', 0.10, 0.8, 0.04);  // G5 (Sol)

      // Capa de Brillo (Cristalino)
      playTone(1046.50, 'triangle', 0.08, 0.4, 0.06); // C6 (Octava arriba)
      playTone(1318.51, 'sine', 0.05, 0.4, 0.08);     // E6 (Brillo final)

      // Mini Click inicial para sensación táctil
      const click = audioCtx.createOscillator();
      const clickGain = audioCtx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(2000, now);
      clickGain.gain.setValueAtTime(0.05, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      click.connect(clickGain);
      clickGain.connect(audioCtx.destination);
      click.start(now);
      click.stop(now + 0.02);

    } catch (e) {
      console.warn("Audio feedback error:", e);
    }
  };

  // List of students who currently have instruments checked out (for Return mode)
  const loanedStudents = useMemo(() => {
    const studentNamesInInventory = new Set(
      inventory
        .filter(item => isItemLoaned(item))
        .map(item => globalNormalize(item.Estudiante))
        .filter(name => name !== '')
    );

    return availableStudents?.filter(s => studentNamesInInventory.has(globalNormalize(s.name))) || [];
  }, [inventory, availableStudents]);
  const searchResults = useMemo(() => {
    const term = normalizeText(instrumentSearch);

    // Si ya seleccionamos el instrumento final, no mostrar nada
    if (selectedInstrument) return [];
    const searchLower = instrumentSearch.toLowerCase().trim();
    if (!searchLower) return [];

    // Filter instruments that match the search
    const filtered = inventory.filter(item => {
      const studentName = (item.Estudiante || '').toLowerCase();
      const instrumentName = (item.Instrumento || '').toLowerCase();
      const serie = (item.Serie || '').toLowerCase();
      
      return studentName.includes(searchLower) || instrumentName.includes(searchLower) || serie.includes(searchLower);
    });

    if (mode === 'in') {
      return filtered.filter(item => isItemLoaned(item)).slice(0, 10);
    }
    return filtered.slice(0, 10);
  }, [instrumentSearch, inventory, mode]);

  const handleStudentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setStudentName(name);
    setValidationError(null); // Reset error on change
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInstrument) {
      if (mode === 'in') {
        const recordName = normalizeText(selectedInstrument.Estudiante);
        const inputName = normalizeText(studentName);

        if (!recordName) {
          setValidationError("Este instrumento figura como prestado pero no tiene un alumno asignado en el sistema.");
          return;
        }

        if (inputName !== recordName) {
          setValidationError(`Error: Registro de ${selectedInstrument.Estudiante}. Por favor, verifique el nombre ingresado.`);
          return;
        }
      }

      if (mode === 'out') onConfirm(selectedInstrument.id, studentName.toUpperCase(), studentCourse.toUpperCase(), selectedDate);
      else onReturn(selectedInstrument.id, selectedDate);

      // Feedback auditivo Premium iOS Chord
      playSuccessSound();

      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-center shadow-2xl">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500"><CheckCircle className="w-10 h-10 text-emerald-500" /></div>
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Registro Exitoso</h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">La información ha sido actualizada</p>
        <button onClick={() => { setIsSubmitted(false); setInstrumentSearch(''); setSelectedInstrument(null); setStudentName(''); setStudentCourse(''); }} className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-white flex items-center justify-center gap-3 uppercase tracking-widest text-xs hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"><RotateCcw className="w-4 h-4" /> Nuevo registro</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4">
      <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-visible backdrop-blur-md">
        <div className="flex p-2 bg-slate-950/50 rounded-t-[2.5rem] border-b border-slate-800/50">
          <button
            type="button"
            onClick={() => { setMode('out'); setSelectedInstrument(null); setInstrumentSearch(''); setStudentName(''); setStudentCourse(''); }}
            className={`flex-1 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${mode === 'out' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <LogOut className="w-4 h-4 inline mr-2" /> Salida
          </button>
          <button
            type="button"
            onClick={() => { setMode('in'); setSelectedInstrument(null); setInstrumentSearch(''); setStudentName(''); setStudentCourse(''); }}
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
                ? 'Busque el instrumento por nombre, serie o estudiante asignado.'
                : 'Solo se muestran instrumentos con SALIDA ACTIVA para procesar el retorno.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Fecha</label>
              <input type="date" className="w-full px-5 py-4 bg-[#020617] border-2 border-slate-800 rounded-2xl text-white font-bold focus:border-indigo-500 outline-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-center">
                {mode === 'out' ? 'BUSCAR INSTRUMENTO' : 'SELECCIONAR RETORNO'}
              </label>
              
              <div className="relative">
                {!selectedInstrument && (
                  <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      autoComplete="off"
                      value={instrumentSearch}
                      onChange={(e) => setInstrumentSearch(e.target.value)}
                      placeholder={mode === 'out' ? "Escriba nombre del instrumento..." : "Buscar alumno o instrumento..."}
                      className="w-full bg-[#020617] border-2 border-slate-900 focus:border-indigo-500 rounded-[2rem] pl-16 pr-8 py-6 text-xl font-bold text-white placeholder:text-slate-700 outline-none transition-all shadow-2xl uppercase"
                      autoFocus
                    />
                  </div>
                )}

                {/* Quick Selection for Returns (Only in 'in' mode and when not searching yet) */}
                {mode === 'in' && !instrumentSearch && !selectedInstrument && loanedStudents.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <p className="col-span-full text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Retornos Pendientes:</p>
                    {loanedStudents.slice(0, 6).map((student, idx) => (
                      <button
                        key={`quick-${idx}`}
                        type="button"
                        onClick={() => setInstrumentSearch(student.name)}
                        className="flex items-center gap-3 p-4 bg-indigo-600/5 border border-indigo-500/10 rounded-2xl hover:bg-indigo-600/20 hover:border-indigo-500/30 transition-all group text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-white truncate uppercase">{student.name}</p>
                          <p className="text-[8px] font-bold text-indigo-500 uppercase">{student.course}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.length > 0 && !selectedInstrument && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/50">
                    {searchResults.map((item: any, idx) => (
                      <button
                        key={item.id || `inst-${idx}`}
                        type="button"
                        onClick={() => {
                          setStudentName(item.Estudiante);
                          const student = availableStudents?.find(s => globalNormalize(s.name) === globalNormalize(item.Estudiante));
                          setStudentCourse(student?.course || '');
                          setSelectedInstrument(item);
                          setInstrumentSearch('');
                        }}
                        className="w-full flex items-center justify-between px-6 py-5 bg-[#0f172a] hover:bg-indigo-600/20 transition-all group text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:border-indigo-500/50 transition-all">
                            <Music className="w-6 h-6 text-indigo-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white uppercase italic tracking-tight group-hover:text-indigo-300 transition-colors">
                              {item.Instrumento}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{item.Estudiante || 'DISPONIBLE'}</span>
                              <span className="text-[8px] text-slate-600">•</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">SERIE: {item.Serie || 'S/N'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border ${isItemLoaned(item) ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                            {isItemLoaned(item) ? 'Fuera' : 'En Sala'}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {instrumentSearch && searchResults.length === 0 && !selectedInstrument && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-slate-800 p-6 rounded-2xl text-center z-50">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      {mode === 'out'
                        ? 'No se encontraron instrumentos disponibles'
                        : 'No se encontraron instrumentos con salida activa'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedInstrument && (
            <div className="p-8 bg-indigo-600/10 border-2 border-indigo-500/30 rounded-[2rem] space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Confirmar Operación</p>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                    {selectedInstrument.Instrumento}
                  </h3>
                  <div className="flex gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Serie: <span className="text-white">{selectedInstrument.Serie || 'S/N'}</span></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Marca: <span className="text-white">{selectedInstrument.Marca || 'S/M'}</span></span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setSelectedInstrument(null); setInstrumentSearch(''); }}
                  className="bg-slate-900 p-2 rounded-full text-slate-500 hover:text-white transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#020617] p-5 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Music className="text-indigo-400 w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumen de Selección:</p>
                    <p className="text-sm font-bold text-white uppercase italic">{selectedInstrument.Instrumento}</p>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">
                      {studentCourse || 'CURSO NO ASIGNADO'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedInstrument || !studentName || (mode === 'out' && !studentCourse)}
            className={`w-full py-7 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter shadow-2xl disabled:opacity-20 text-white transition-all active:scale-95 ${mode === 'out' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'}`}
          >
            {mode === 'out' ? 'Confirmar Salida' : 'Confirmar Retorno'}
          </button>

          {onCancel && !isExternalView && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full text-slate-600 hover:text-white font-black uppercase text-[10px] tracking-[0.3em] py-2 transition-colors text-center"
            >
              Cancelar y volver
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default StudentCheckOut;
