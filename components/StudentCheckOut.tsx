
import React, { useState, useMemo, useEffect } from 'react';
import { Search, User, CheckCircle, ArrowRight, LogOut, LogIn, RotateCcw, Music, X, Calendar, AlertCircle } from 'lucide-react';
import { InventoryItem, Student } from '../types.ts';
import { isItemLoaned, globalNormalize } from '../utils.ts';
import { supabase } from '../supabaseClient';

interface StudentCheckOutProps {
  inventory: InventoryItem[];
  onConfirm: (id: number, student: string, curso: string, fecha: string) => void;
  onReturn: (id: number, fecha: string) => void;
  onCancel?: () => void;
  isExternalView?: boolean;
  availableStudents?: Student[];
}

const StudentCheckOut: React.FC<StudentCheckOutProps> = ({ inventory, onConfirm, onReturn, onCancel, isExternalView, availableStudents: propsStudents }) => {
  const [mode, setMode] = useState<'out' | 'in'>('out');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState<InventoryItem | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [students, setStudents] = useState<Student[]>(propsStudents || []);

  useEffect(() => {
    if (!propsStudents || propsStudents.length === 0) {
      const fetchStudents = async () => {
        const { data } = await supabase.from('students').select('*');
        if (data) setStudents(data);
      };
      fetchStudents();
    }
  }, [propsStudents]);

  const normalize = (val: any) => (val || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const results = useMemo(() => {
    const term = normalize(searchTerm);
    
    // Si estamos en retorno y no hay búsqueda, mostramos los instrumentos ya prestados
    if (mode === 'in' && !term) {
      return inventory.filter(item => isItemLoaned(item)).map(item => ({ type: 'item', data: item })).slice(0, 10);
    }
    
    if (!term) return [];

    // Buscar en inventario (por instrumento, serie o estudiante asignado)
    const itemMatches = inventory.filter(item => {
      const match = normalize(item.Instrumento).includes(term) || 
                    normalize(item.Serie).includes(term) || 
                    normalize(item.Estudiante).includes(term);
      if (mode === 'in') return match && isItemLoaned(item);
      return match;
    }).map(item => ({ type: 'item', data: item }));

    // Buscar en estudiantes (por nombre) - Solo en modo salida
    let studentMatches: any[] = [];
    if (mode === 'out') {
      studentMatches = students.filter(s => normalize(s.name).includes(term))
        .map(s => ({ type: 'student', data: s }));
    }

    return [...itemMatches, ...studentMatches].slice(0, 10);
  }, [inventory, students, searchTerm, mode]);

  const handleSelect = (result: any) => {
    if (result.type === 'item') {
      const item = result.data;
      setSelectedInstrument(item);
      // Si el item ya tiene estudiante, lo pre-cargamos
      const student = students.find(s => normalize(s.name) === normalize(item.Estudiante));
      if (student) setSelectedStudent(student);
      else setSelectedStudent({ id: 'temp', name: item.Estudiante || '', course: item.Curso || '', instrument: item.Instrumento || '' });
    } else {
      const student = result.data;
      setSelectedStudent(student);
      // Buscar un instrumento disponible que coincida con lo que toca el alumno
      const item = inventory.find(i => !isItemLoaned(i) && normalize(i.Instrumento).includes(normalize(student.instrument)));
      if (item) setSelectedInstrument(item);
    }
    setSearchTerm('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInstrument && selectedStudent) {
      if (mode === 'out') {
        onConfirm(Number(selectedInstrument.id), selectedStudent.name, selectedStudent.course, selectedDate);
      } else {
        onReturn(Number(selectedInstrument.id), selectedDate);
      }
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-center shadow-2xl">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8"><CheckCircle className="w-10 h-10 text-emerald-500" /></div>
        <h2 className="text-3xl font-black text-white uppercase italic mb-4">Registro Exitoso</h2>
        <button onClick={() => { setIsSubmitted(false); setSelectedInstrument(null); setSelectedStudent(null); setSearchTerm(''); }} className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-white uppercase tracking-widest text-xs hover:bg-indigo-500 transition-colors"><RotateCcw className="w-4 h-4 inline mr-2" /> Nuevo registro</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 animate-in fade-in duration-500">
      <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="flex p-2 bg-slate-950/50 border-b border-slate-800/50">
          <button onClick={() => { setMode('out'); setSelectedInstrument(null); setSelectedStudent(null); }} className={`flex-1 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${mode === 'out' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>
            <LogOut className="w-4 h-4 inline mr-2" /> Salida
          </button>
          <button onClick={() => { setMode('in'); setSelectedInstrument(null); setSelectedStudent(null); }} className={`flex-1 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${mode === 'in' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
            <LogIn className="w-4 h-4 inline mr-2" /> Retorno
          </button>
        </div>

        <div className="p-6 sm:p-12 space-y-8">
          {!selectedInstrument ? (
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={mode === 'out' ? "Escribe nombre del alumno..." : "Buscar instrumento prestado..."}
                  className="w-full bg-[#020617] border-2 border-slate-900 focus:border-indigo-500 rounded-[2rem] pl-16 pr-8 py-6 text-xl font-bold text-white uppercase outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {results.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(res)}
                    className="bg-slate-900/60 p-5 rounded-[2rem] border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${res.type === 'student' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {res.type === 'student' ? <User className="w-6 h-6" /> : <Music className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="text-white font-black uppercase italic text-base">
                          {res.type === 'student' ? res.data.name : res.data.Instrumento}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {res.type === 'student' ? `${res.data.instrument} • ${res.data.course}` : `${res.data.Estudiante || 'DISPONIBLE'} • ${res.data.Serie}`}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in zoom-in-95 duration-300">
              <div className="bg-indigo-600/5 p-10 rounded-[3rem] border-2 border-indigo-500/30 relative">
                <button type="button" onClick={() => { setSelectedInstrument(null); setSelectedStudent(null); }} className="absolute top-6 right-6 p-3 bg-slate-900 rounded-2xl text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center text-indigo-400"><Music className="w-10 h-10" /></div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Confirmar Operación</p>
                    <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">{selectedStudent?.name || 'ALUMNO'}</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">{selectedInstrument.Instrumento} • {selectedInstrument.Serie}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4 block mb-2">Fecha</label>
                  <input type="date" className="w-full px-6 py-5 bg-[#020617] border-2 border-slate-800 rounded-[2rem] text-white font-bold outline-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
                <button onClick={handleSubmit} className={`md:col-span-2 py-8 rounded-[2rem] font-black text-xl text-white shadow-2xl transition-all active:scale-95 ${mode === 'out' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}>
                  {mode === 'out' ? 'CONFIRMAR SALIDA' : 'CONFIRMAR RETORNO'}
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
