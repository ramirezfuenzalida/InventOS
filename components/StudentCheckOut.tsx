
import React, { useState, useMemo } from 'react';
import { Search, Music, User, CheckCircle, ArrowRight, LogOut, LogIn, RotateCcw, X, Calendar, AlertCircle, ChevronDown, PenTool } from 'lucide-react';
import { InventoryItem, Student } from '../types.ts';
import { isItemLoaned, globalNormalize } from '../utils.ts';

interface StudentCheckOutProps {
  inventory: InventoryItem[];
  onConfirm: (id: number, student: string, curso: string, fecha: string) => void;
  onReturn: (id: number, fecha: string) => void;
  onCancel?: () => void;
  isExternalView?: boolean;
  availableStudents?: Student[];
}

/** Estructura agrupada: un estudiante con todos sus instrumentos */
interface StudentGroup {
  studentName: string;
  course: string;
  instruments: InventoryItem[];
}

const StudentCheckOut: React.FC<StudentCheckOutProps> = ({ inventory, onConfirm, onReturn, onCancel, isExternalView, availableStudents }) => {
  const [mode, setMode] = useState<'out' | 'in'>('out');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentGroup | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [instrumentSearchTerm, setInstrumentSearchTerm] = useState('');

  // Normalización segura para búsqueda
  const safeNorm = (val: any): string => {
    if (val === null || val === undefined) return '';
    return val.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  };

  /**
   * Agrupa instrumentos por estudiante.
   * Un mismo estudiante con 2 instrumentos aparece una sola vez con ambos instrumentos listados.
   */
  const studentGroups = useMemo((): StudentGroup[] => {
    const groupMap = new Map<string, StudentGroup>();

    inventory.forEach(item => {
      const rawName = (item.Estudiante || '').toString().trim();
      if (!rawName) return;

      const key = safeNorm(rawName);
      if (!key) return;

      const existing = groupMap.get(key);
      if (existing) {
        // Evitar duplicados del mismo instrumento (mismo id)
        const alreadyHas = existing.instruments.some(i => String(i.id) === String(item.id));
        if (!alreadyHas) {
          existing.instruments.push(item);
        }
        // Actualizar curso si estaba vacío
        if (!existing.course && item.Curso) {
          existing.course = item.Curso;
        }
      } else {
        groupMap.set(key, {
          studentName: rawName.toUpperCase(),
          course: (item.Curso || '').toString().toUpperCase().trim() || 'SIN CURSO',
          instruments: [item]
        });
      }
    });

    // Luego añadir los de availableStudents que no estén en groupMap
    if (availableStudents) {
      availableStudents.forEach(student => {
        const rawName = (student.name || '').toString().trim();
        if (!rawName) return;
        const key = safeNorm(rawName);
        if (!key) return;

        if (!groupMap.has(key)) {
          groupMap.set(key, {
            studentName: rawName.toUpperCase(),
            course: (student.course || '').toString().toUpperCase().trim() || 'SIN CURSO',
            instruments: [] // Estudiante sin instrumento asignado aún
          });
        }
      });
    }

    return Array.from(groupMap.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [inventory]);

  /**
   * Resultados de búsqueda agrupados por estudiante.
   * En modo SALIDA: busca por nombre/apellido del estudiante.
   * En modo RETORNO: muestra solo instrumentos prestados, buscando por nombre/apellido.
   */
  const searchResults = useMemo((): StudentGroup[] => {
    const term = safeNorm(searchTerm);

    if (mode === 'in') {
      // RETORNO: solo instrumentos prestados
      const loanedItems = inventory.filter(item => isItemLoaned(item));
      const loanedMap = new Map<string, StudentGroup>();

      loanedItems.forEach(item => {
        const rawName = (item.Estudiante || '').toString().trim();
        if (!rawName) return;
        const key = safeNorm(rawName);
        if (!key) return;

        const existing = loanedMap.get(key);
        if (existing) {
          if (!existing.instruments.some(i => String(i.id) === String(item.id))) {
            existing.instruments.push(item);
          }
        } else {
          loanedMap.set(key, {
            studentName: rawName.toUpperCase(),
            course: (item.Curso || 'SIN CURSO').toString().toUpperCase().trim(),
            instruments: [item]
          });
        }
      });

      const loanedGroups = Array.from(loanedMap.values());

      if (!term) return loanedGroups.slice(0, 20);

      return loanedGroups.filter(g => {
        const nameMatch = safeNorm(g.studentName).includes(term);
        const instrMatch = g.instruments.some(i =>
          safeNorm(i.Instrumento).includes(term) ||
          safeNorm(i.Marca).includes(term) ||
          safeNorm(i.Serie).includes(term)
        );
        return nameMatch || instrMatch;
      }).slice(0, 20);
    }

    // SALIDA: busca por nombre/apellido del estudiante
    if (!term) return [];

    return studentGroups.filter(g => {
      const nameNorm = safeNorm(g.studentName);
      // Buscar cada palabra del término en el nombre
      const termWords = term.split(/\s+/).filter(Boolean);
      const nameMatches = termWords.every(w => nameNorm.includes(w));
      // También permitir búsqueda parcial con una sola palabra
      const partialMatch = nameNorm.includes(term);
      return nameMatches || partialMatch;
    }).slice(0, 20);
  }, [inventory, searchTerm, mode, studentGroups]);

  const handleSelectStudent = (group: StudentGroup) => {
    setSelectedStudent(group);
    setSelectedItem(null);
  };

  const handleSelectInstrument = (item: InventoryItem) => {
    setSelectedItem(item);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedItem) return;

    if (mode === 'out') {
      const studentName = selectedStudent?.studentName || selectedItem.Estudiante || '';
      const curso = selectedStudent?.course || selectedItem.Curso || '';
      onConfirm(Number(selectedItem.id), studentName, curso, selectedDate);
    } else {
      onReturn(Number(selectedItem.id), selectedDate);
    }
    setIsSubmitted(true);
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setSelectedItem(null);
    setSelectedStudent(null);
    setSearchTerm('');
  };

  // ── PANTALLA DE ÉXITO ──
  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-12 rounded-[3rem] text-center shadow-2xl animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-10">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Registro Exitoso</h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-10">La nube ha sido actualizada</p>
        <button
          onClick={resetForm}
          className="w-full bg-indigo-600 py-6 rounded-[2rem] font-black text-white flex items-center justify-center gap-4 uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
        >
          <RotateCcw className="w-5 h-5" /> OTRO MOVIMIENTO
        </button>
      </div>
    );
  }

  // ── PANTALLA PRINCIPAL ──
  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Tabs de modo */}
        <div className="flex p-2 bg-slate-950/50 border-b border-slate-800/50">
          <button
            type="button"
            onClick={() => { setMode('out'); resetForm(); }}
            className={`flex-1 py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-widest transition-all ${mode === 'out' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <LogOut className="w-5 h-5 inline mr-3" /> Salida
          </button>
          <button
            type="button"
            onClick={() => { setMode('in'); resetForm(); }}
            className={`flex-1 py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-widest transition-all ${mode === 'in' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <LogIn className="w-5 h-5 inline mr-3" /> Retorno
          </button>
        </div>

        <div className="p-8 md:p-14 space-y-10">

          {/* ── PASO 1: Buscar estudiante ── */}
          {!selectedStudent && !selectedItem && (
            <div className="space-y-8">
              <div className="relative group">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-8 h-8 text-slate-700 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  className="w-full bg-[#020617] border-2 border-slate-900 focus:border-indigo-500 rounded-[2.5rem] py-8 pl-20 pr-10 text-2xl font-black text-white placeholder:text-slate-800 outline-none transition-all uppercase"
                  placeholder="Ingresa nombre o apellido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Hint de búsqueda */}
              {!searchTerm && mode === 'out' && (
                <div className="py-10 text-center">
                  <User className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-700 font-black uppercase text-xs tracking-[0.3em]">
                    Escribe el nombre o apellido del estudiante
                  </p>
                </div>
              )}

              {/* Lista de resultados agrupados por estudiante */}
              <div className="space-y-3 md:space-y-4">
                {searchResults.map((group) => (
                  <button
                    key={group.studentName}
                    type="button"
                    onClick={() => handleSelectStudent(group)}
                    className="w-full bg-slate-900/40 border border-white/5 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-between hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all group/card text-left"
                  >
                    <div className="flex items-center gap-4 md:gap-8 min-w-0 flex-1">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.5rem] flex items-center justify-center bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                        <User className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-black uppercase italic text-lg md:text-xl leading-none mb-1 md:mb-2 truncate">
                          {group.studentName}
                        </p>
                        <p className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 md:mb-2">
                          {group.course}
                        </p>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          {group.instruments.map((inst) => (
                            <span
                              key={String(inst.id)}
                              className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest px-2 md:px-3 py-1 rounded-full border ${
                                isItemLoaned(inst)
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              }`}
                            >
                              {inst.Instrumento} {inst.Marca} {inst.Modelo}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 ml-2 md:ml-4">
                      {group.instruments.length > 1 && (
                        <span className="text-[8px] md:text-[9px] font-black bg-indigo-600 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-full">
                          {group.instruments.length} INST.
                        </span>
                      )}
                      <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-slate-700 group-hover/card:text-white transition-all" />
                    </div>
                  </button>
                ))}

                {searchTerm && searchResults.length === 0 && (
                  <div className="py-12 md:py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] md:rounded-[3rem]">
                    <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-slate-700 mx-auto mb-3 md:mb-4" />
                    <p className="text-slate-700 font-black uppercase italic tracking-[0.2em] mb-2 text-sm md:text-base">
                      Sin resultados para "{searchTerm}"
                    </p>
                    <p className="text-slate-800 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                      Verifica el nombre o apellido e intenta de nuevo
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PASO 2: Seleccionar instrumento (si tiene múltiples) ── */}
          {selectedStudent && !selectedItem && (
            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="p-3 md:p-4 bg-slate-950 rounded-[1rem] md:rounded-[1.5rem] text-slate-500 hover:text-white transition-all shadow-xl"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div>
                  <p className="text-indigo-400 font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] md:tracking-[0.4em]">ESTUDIANTE SELECCIONADO</p>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">
                    {selectedStudent.studentName}
                  </h3>
                  <p className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">{selectedStudent.course}</p>
                </div>
              </div>

              <p className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-center">
                {mode === 'out' ? 'Selecciona el instrumento a retirar' : 'Selecciona el instrumento a devolver'}
              </p>

              <div className="space-y-3 md:space-y-4">
                {selectedStudent.instruments
                  .filter(inst => mode === 'in' ? isItemLoaned(inst) : true)
                  .map((inst) => (
                  <button
                    key={String(inst.id)}
                    type="button"
                    onClick={() => handleSelectInstrument(inst)}
                    className="w-full bg-slate-900/40 border border-white/5 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-between hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all group/inst text-left"
                  >
                    <div className="flex items-center gap-4 md:gap-8 min-w-0">
                      <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.5rem] flex items-center justify-center flex-shrink-0 ${isItemLoaned(inst) ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        <Music className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-black uppercase italic text-lg md:text-xl leading-none mb-1 md:mb-2 truncate">{inst.Instrumento}</p>
                        <div className="flex flex-wrap gap-1.5 md:gap-3">
                          <span className="text-[8px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest">{inst.Marca}</span>
                          <span className="text-[8px] md:text-[10px] font-bold text-slate-600 hidden sm:inline">|</span>
                          <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">{inst.Modelo}</span>
                          {inst.Serie && (
                            <>
                              <span className="text-[8px] md:text-[10px] font-bold text-slate-600 hidden sm:inline">|</span>
                              <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest block sm:inline w-full sm:w-auto">S/N: {inst.Serie}</span>
                            </>
                          )}
                        </div>
                        <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1 md:mt-2 ${isItemLoaned(inst) ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {isItemLoaned(inst) ? '📍 EN HOGAR' : '📍 EN SALA'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 ml-2 text-slate-700 group-hover/inst:text-white transition-all" />
                  </button>
                ))}

                {mode === 'out' && selectedStudent.instruments.length === 0 && (
                  <div className="space-y-4 md:space-y-6">
                    <div className="py-6 md:py-8 text-center border-2 border-dashed border-white/5 rounded-[2rem] md:rounded-[3rem] px-4">
                      <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-amber-500 mx-auto mb-3 md:mb-4" />
                      <p className="text-slate-300 font-black uppercase italic tracking-[0.2em] mb-1 md:mb-2 text-sm md:text-base">
                        Estudiante sin instrumento
                      </p>
                      <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                        Busca y selecciona un instrumento disponible:
                      </p>
                    </div>

                    <div className="relative group">
                      <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-700 group-focus-within:text-indigo-500 transition-colors" />
                      <input
                        type="text"
                        className="w-full bg-[#020617] border-2 border-slate-900 focus:border-indigo-500 rounded-[1.5rem] md:rounded-[2rem] py-4 md:py-5 pl-12 md:pl-16 pr-6 md:pr-8 text-sm md:text-lg font-black text-white placeholder:text-slate-800 outline-none transition-all uppercase shadow-inner"
                        placeholder="Buscar por nombre, marca o serie..."
                        value={instrumentSearchTerm}
                        onChange={(e) => setInstrumentSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="space-y-3 md:space-y-4 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {instrumentSearchTerm.length > 1 ? (
                        inventory
                          .filter(inst => !isItemLoaned(inst))
                          .filter(inst => 
                            safeNorm(inst.Instrumento).includes(safeNorm(instrumentSearchTerm)) ||
                            safeNorm(inst.Marca).includes(safeNorm(instrumentSearchTerm)) ||
                            safeNorm(inst.Serie).includes(safeNorm(instrumentSearchTerm))
                          )
                          .slice(0, 15)
                          .map((inst) => (
                            <button
                              key={String(inst.id)}
                              type="button"
                              onClick={() => handleSelectInstrument(inst)}
                              className="w-full bg-slate-900/40 border border-white/5 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-between hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all group/newinst text-left"
                            >
                              <div className="flex items-center gap-4 md:gap-6 min-w-0">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-[0.8rem] md:rounded-[1rem] flex items-center justify-center bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                                  <Music className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-black uppercase italic text-base md:text-lg leading-none mb-1 truncate">{inst.Instrumento}</p>
                                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                                    <span className="text-[8px] md:text-[9px] font-black text-indigo-500 uppercase tracking-widest">{inst.Marca}</span>
                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-600 hidden sm:inline">|</span>
                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">{inst.Modelo}</span>
                                    {inst.Serie && (
                                      <>
                                        <span className="text-[8px] md:text-[9px] font-bold text-slate-600 hidden sm:inline">|</span>
                                        <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest block sm:inline w-full sm:w-auto">S/N: {inst.Serie}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-slate-700 group-hover/newinst:text-white flex-shrink-0 ml-2 transition-all" />
                            </button>
                          ))
                      ) : (
                        <p className="text-center text-slate-600 text-xs font-bold uppercase tracking-widest mt-4">Escribe al menos 2 letras para buscar un instrumento.</p>
                      )}
                    </div>
                  </div>
                )}

                {mode === 'in' && selectedStudent.instruments.filter(i => isItemLoaned(i)).length === 0 && (
                  <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                    <AlertCircle className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-700 font-black uppercase italic tracking-[0.2em]">
                      Este estudiante no tiene instrumentos prestados
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PASO 3: Confirmar operación ── */}
          {selectedItem && (
            <div className="space-y-6 md:space-y-10 animate-in zoom-in-95 duration-300">
              <div className="bg-indigo-600/5 p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-indigo-500/20 relative">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    // Si tiene múltiples instrumentos, volver a la selección
                    if (selectedStudent && selectedStudent.instruments.length > 1) {
                      // mantener selectedStudent
                    } else {
                      setSelectedStudent(null);
                    }
                  }}
                  className="absolute top-4 right-4 md:top-8 md:right-8 p-3 md:p-4 bg-slate-900 rounded-[1.2rem] md:rounded-[1.5rem] text-slate-500 hover:text-white transition-all shadow-xl z-10"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 mt-4 md:mt-0">
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner flex-shrink-0">
                    <User className="w-10 h-10 md:w-14 md:h-14" />
                  </div>
                  <div className="text-center md:text-left flex-1 w-full min-w-0">
                    <p className="text-indigo-400 font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] md:tracking-[0.4em] mb-2 md:mb-3">RESUMEN DEL REGISTRO</p>
                    <h3 className="text-2xl sm:text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-tight md:leading-none mb-6 break-words">
                      {selectedStudent?.studentName || selectedItem.Estudiante || 'DISPONIBLE'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 bg-[#020617] p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 text-left w-full">
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Instrumento</p>
                        <p className="text-white font-bold text-xs md:text-sm uppercase">{selectedItem.Instrumento}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Marca y Modelo</p>
                        <p className="text-white font-bold text-xs md:text-sm uppercase">{selectedItem.Marca} {selectedItem.Modelo}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Curso</p>
                        <p className="text-white font-bold text-xs md:text-sm uppercase truncate">{selectedStudent?.course || selectedItem.Curso || 'SIN CURSO'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Número de Serie</p>
                        <p className="text-white font-bold text-xs md:text-sm uppercase break-all">{selectedItem.Serie || 'S/N'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Ubicación Actual</p>
                        <p className={`text-xs md:text-sm font-bold uppercase ${isItemLoaned(selectedItem) ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {selectedItem.Ubicacion || 'SALA DE MÚSICA'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                <div className="md:col-span-1 space-y-2 md:space-y-3">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] md:tracking-[0.4em] ml-4 md:ml-6">FECHA</label>
                  <div className="relative">
                    <Calendar className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-700" />
                    <input
                      type="date"
                      className="w-full bg-[#020617] border-2 border-slate-900 rounded-[1.5rem] md:rounded-[2rem] py-5 md:py-7 pl-14 md:pl-16 pr-6 md:pr-8 text-white font-black outline-none focus:border-indigo-500/50 transition-all shadow-xl text-sm md:text-base"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className={`md:col-span-2 py-8 rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl hover:scale-[1.02] active:scale-95 text-white ${mode === 'out' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}
                >
                  {mode === 'out' ? <PenTool className="w-7 h-7" /> : <LogIn className="w-7 h-7" />}
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
