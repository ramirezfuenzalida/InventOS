
import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Music,
  Upload,
  Search,
  FileSpreadsheet,
  LayoutDashboard,
  QrCode,
  UserCheck,
  X,
  Save,
  Trash2,
  Menu,
  AlertTriangle,
  BarChart3,
  FileUp,
  Circle,
  ChevronLeft,
  Home,
  ExternalLink,
  Printer,
  Info,
  ArrowLeft,
  Sparkles,
  Users,
  Image as ImageIcon,
  History,
  Sun,
  Moon
} from 'lucide-react';

// Importaciones locales
import { InventoryItem, MovementRecord, Student } from './types.ts';
import KPICards from './components/KPICards.tsx';
import InventoryTable from './components/InventoryTable.tsx';
import Charts from './components/Charts.tsx';
import MonitorStats from './components/MonitorStats.tsx';
import StudentCheckOut from './components/StudentCheckOut.tsx';
import ReportsView from './components/ReportsView.tsx';
import QRAccessView from './components/QRAccessView.tsx';
import DirectoryView from './components/DirectoryView.tsx';
import InventoryForm from './components/InventoryForm.tsx';
import { supabase } from './supabaseClient.ts';
import { globalNormalize, getEstadoCategoria, inferFamilia, isItemLoaned } from './utils.ts';

/** 
 * ==========================================
 * CONFIGURACIÓN DE MARCA
 * ==========================================
 */
const APP_LOGO_URL = `${import.meta.env.BASE_URL}logo_orquesta_sinfonica_wt.png`;
const HERO_IMAGE_URL = `${import.meta.env.BASE_URL}logo_orquesta_sinfonica_wt.png`;
const APP_NAME = "OSWT";
const APP_SUBTITLE = "Orquesta Sinfónica William Taylor";
const APP_VERSION = "1.0.02";

type ViewMode = 'dashboard' | 'list' | 'student-check' | 'directory' | 'reports' | 'monitor-detail' | 'loaned-detail' | 'repair-detail' | 'qr-access' | 'regular-detail' | 'bueno-detail';


const App: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const isStudentModeUrl = queryParams.get('mode') === 'student';

  const [data, setData] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<MovementRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const isDeletingRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isDeletingRef.current) return;
      try {
        const [invRes, histRes, studRes] = await Promise.all([
          supabase.from('inventory').select('*'),
          supabase.from('history').select('*').order('created_at', { ascending: false }),
          supabase.from('students').select('*').order('name', { ascending: true })
        ]);

        if (invRes.data && !isDeletingRef.current) {
          setData(invRes.data as InventoryItem[]);
        }
        if (histRes.data && !isDeletingRef.current) setHistory(histRes.data as MovementRecord[]);
        if (studRes.data && !isDeletingRef.current) setStudents(studRes.data as Student[]);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();

    // Sincronización en Tiempo Real (Supabase Realtime)
    const inventoryChannel = supabase.channel('realtime:inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, fetchData)
      .subscribe();

    const historyChannel = supabase.channel('realtime:history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, fetchData)
      .subscribe();

    const studentsChannel = supabase.channel('realtime:students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(historyChannel);
      supabase.removeChannel(studentsChannel);
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(isStudentModeUrl ? 'student-check' : 'dashboard');
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("PROCESANDO...");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistoryDeleteConfirm, setShowHistoryDeleteConfirm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.theme = newTheme;
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // isItemLoaned is now imported from utils.ts

  const filteredData = useMemo(() => {
    let base = [...data];
    if (viewMode === 'monitor-detail' && selectedMonitor) {
      base = base.filter(item => globalNormalize(item.Responsable) === globalNormalize(selectedMonitor));
    } else if (viewMode === 'loaned-detail') {
      base = base.filter(item => isItemLoaned(item));
    } else if (viewMode === 'repair-detail') {
      base = base.filter(item => getEstadoCategoria(item.Estado) === 'MALO');
    } else if (viewMode === 'regular-detail') {
      base = base.filter(item => getEstadoCategoria(item.Estado) === 'REGULAR');
    } else if (viewMode === 'bueno-detail') {
      base = base.filter(item => getEstadoCategoria(item.Estado) === 'BUENO');
    }

    const term = globalNormalize(searchTerm);
    if (!term) return base.sort((a, b) => (a.Instrumento || '').localeCompare(b.Instrumento || ''));

    return base.filter(item => {
      const searchString = globalNormalize([
        item.Instrumento, item.Marca, item.Modelo, item.Estudiante, item.Responsable, item.Serie, item.Ubicacion, item.Familia
      ].join(' '));
      return searchString.includes(term);
    }).sort((a, b) => (a.Instrumento || '').localeCompare(b.Instrumento || ''));
  }, [data, searchTerm, viewMode, selectedMonitor]);

  const uniqueStudents = useMemo(() => {
    if (students.length > 0) return students;
    const studentMap = new Map<string, string>();
    data.forEach(item => {
      if (item.Estudiante && String(item.Estudiante).trim() !== '') {
        const studentName = globalNormalize(item.Estudiante);
        if (!studentMap.has(studentName) || studentMap.get(studentName) === 'SIN CURSO') {
          const curso = item.Curso ? item.Curso.toUpperCase() : 'SIN CURSO';
          studentMap.set(studentName, curso);
        }
      }
    });
    return Array.from(studentMap.entries()).map(([name, course]) => ({
      name: name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      course: course,
      id: name
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data, students]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<any>(ws);
        const mappedData: InventoryItem[] = rawData.map((row, index) => {
          const mappedItem: any = { id: String(index) };
          const standardFields: Record<string, string[]> = {
            Instrumento: ['instrumento', 'item', 'descripcion del instrumento', 'nombre del instrumento', 'instrumentos oswt'],
            Familia: ['familia', 'seccion', 'categoria', 'grupo', 'familia de instrumento'],
            Marca: ['marca', 'brand', 'fabricante'],
            Estado: ['estado', 'condicion', 'status'],
            Modelo: ['modelo', 'model'],
            Medida: ['medida', 'talla'],
            Medidas: ['medidas'],
            Serie: ['serie', 'serial', 'nro de serie'],
            TipoCase: ['case', 'estuche'],
            Accesorios: ['accesorios'],
            Soporte: ['soporte'],
            Limpio: ['limpio', 'instrumento limpio'],
            Responsable: ['monitor', 'responsable', 'monitor responsable'],
            Estudiante: ['estudiante', 'alumno', 'nombre del alumno', 'nombre', 'responsable del instrumento', 'estudiante que lo utiliza'],
            Curso: ['curso', 'grado', 'nivel', 'clase', 'ano', 'año', 'periodo', 'seccion', 'sección', 'grupo', 'estamento', 'nivel_escolar', 'aula', 'division', 'división', 'itinerario', 'paralelo', 'nivel academico', 'nivel académico', 'escolaridad', 'curso / grado'],
            Telefono: ['telefono', 'teléfono', 'celular', 'móvil', 'contacto'],
            Email: ['email', 'correo', 'mail', 'correo electrónico'],
            Apoderado: ['apoderado', 'parent', 'tutor', 'nombre apoderado'],
            TelefonoApoderado: ['teléfono apoderado', 'telefono apoderado', 'contacto apoderado', 'celular apoderado'],
            Observaciones: ['observaciones', 'notes', 'observaciones generales'],
            Ubicacion: ['ubicacion', 'sala', 'ubicacion del instrumento'],
            Prestado: ['prestado', 'hogar'],
            FechaSalida: ['fecha de salida'],
            HoraSalida: ['hora de salida'],
            FechaRetorno: ['fecha de retorno']
          };

          const metadata: any = {};
          const excelKeys = Object.keys(row);

          excelKeys.forEach(excelKey => {
            const normExcelKey = globalNormalize(excelKey);
            let matchedField = "";

            // First pass: look for exact matches (highest priority)
            for (const [field, patterns] of Object.entries(standardFields)) {
              if (patterns.some(p => normExcelKey === globalNormalize(p))) {
                matchedField = field;
                break;
              }
            }

            // Second pass: look for partial matches (only if no exact match found)
            if (!matchedField) {
              // Priority list of keywords to check for partial matches
              // We check 'Familia' and other specific ones BEFORE 'Instrumento' to avoid greedy matches
              const priorityOrder = ['Familia', 'Medida', 'Medidas', 'Serie', 'Estado', 'Marca', 'Modelo', 'Estudiante', 'Curso', 'Instrumento'];

              for (const field of priorityOrder) {
                const patterns = standardFields[field];
                if (patterns && patterns.some(p => normExcelKey.includes(globalNormalize(p)))) {
                  if (field === 'Estudiante' && (normExcelKey.includes('estudiante') || normExcelKey.includes('alumno'))) {
                    matchedField = 'Estudiante';
                    break;
                  }
                  matchedField = field;
                  break;
                }
              }
            }

            if (matchedField) {
              const currentVal = mappedItem[matchedField];
              // If it's an exact match of a pattern, it should overwrite any previous fuzzy match
              const isExact = standardFields[matchedField].some(p => normExcelKey === globalNormalize(p));

              if (!currentVal || isExact) {
                mappedItem[matchedField] = row[excelKey];
              } else {
                metadata[excelKey] = row[excelKey];
              }
            } else {
              metadata[excelKey] = row[excelKey];
            }
          });

          return { ...mappedItem, metadata } as InventoryItem;
        }).filter(item => (item.Instrumento || (item.Estudiante && String(item.Estudiante).trim() !== '')) && String(item.Instrumento || '').toLowerCase() !== 'total');

        setData(mappedData);
        setViewMode('dashboard');

        const updateServer = async () => {
          setIsProcessing(true);
          setProcessingMessage("Iniciando carga...");
          isDeletingRef.current = true;

          try {
            // 1. Borrar inventario actual de forma silenciosa pero segura
            setProcessingMessage("Sincronizando base de datos...");
            const { error: delError } = await supabase.from('inventory').delete().neq('id', 'placeholder');
            if (delError) throw delError;

            // 2. Insertar nuevos datos del Excel
            // 2. Insertar nuevos datos del Excel (con de-duplicación por Serie)
            const uniqueMappedData = mappedData.filter((item, index, self) =>
              index === self.findIndex((t) => (
                t.Serie && t.Serie === item.Serie
              )) || !item.Serie
            );

            setProcessingMessage(`Insertando ${uniqueMappedData.length} registros únicos...`);
            const { error: invError } = await supabase.from('inventory').insert(
              uniqueMappedData.map((item, idx) => ({ ...item, id: String(idx + 1) }))
            );
            if (invError) throw invError;

            // 3. Actualizar base de datos de estudiantes
            const uploadStudents = Array.from(new Map(mappedData
              .filter(i => i.Estudiante && String(i.Estudiante).trim() !== '')
              .map(i => {
                const sName = String(i.Estudiante).toUpperCase().trim();
                const sCourse = String(i.Curso || i.metadata?.Curso || i.metadata?.CURSO || 'SIN CURSO').toUpperCase().trim();
                return [globalNormalize(sName), {
                  name: sName,
                  course: sCourse,
                  phone: i.Telefono || '',
                  email: i.Email || '',
                  parent_name: i.Apoderado || '',
                  parent_phone: i.TelefonoApoderado || ''
                }];
              })
            ).values());

            if (uploadStudents.length > 0) {
              setProcessingMessage("Actualizando directorio...");
              const { error: studError } = await supabase.from('students').upsert(uploadStudents, { onConflict: 'name' });
              if (studError) console.warn("Error upserting students:", studError);
            }

            // 4. Sincronizar estados activos desde el Historial (Solo reporte de Mayo)
            setProcessingMessage("Sincronizando reporte de Mayo...");
            const { data: activeLoans } = await supabase
              .from('history')
              .select('*')
              .eq('status', 'en_prestamo')
              .gte('created_at', '2026-05-01');

            // Resetear todos a Sala primero (Garantizar limpieza)
            await supabase.from('inventory').update({ 
              Prestado: 'NO', 
              Ubicacion: 'SALA DE MÚSICA'
            }).not('id', 'is', null);

            if (activeLoans && activeLoans.length > 0) {
              setProcessingMessage(`Restaurando ${activeLoans.length} préstamos de Mayo...`);
              
              for (const loan of activeLoans) {
                if (loan.serie) {
                  await supabase.from('inventory')
                    .update({ 
                      Prestado: 'SÍ', 
                      Ubicacion: 'HOGAR',
                      Estudiante: loan.estudiante,
                      Curso: loan.curso
                    })
                    .eq('Serie', loan.serie);
                } else if (loan.instrumentName && loan.estudiante) {
                  await supabase.from('inventory')
                    .update({ 
                      Prestado: 'SÍ', 
                      Ubicacion: 'HOGAR',
                      Estudiante: loan.estudiante,
                      Curso: loan.curso
                    })
                    .eq('Instrumento', loan.instrumentName)
                    .eq('Estudiante', loan.estudiante);
                }
              }
            }

            // 5. Refrescar datos locales
            const [invRes, histRes, studRes] = await Promise.all([
              supabase.from('inventory').select('*'),
              supabase.from('history').select('*').order('created_at', { ascending: false }),
              supabase.from('students').select('*').order('name', { ascending: true })
            ]);

            if (invRes.data) setData(invRes.data as InventoryItem[]);
            if (histRes.data) setHistory(histRes.data as MovementRecord[]);
            if (studRes.data) setStudents(studRes.data as Student[]);

            alert("Inventario actualizado exitosamente.");
            setViewMode('dashboard');
          } catch (e: any) {
            console.error("Error durante la actualización:", e);
            alert(`Error al sincronizar: ${e.message || 'Fallo desconocido'}`);
          } finally {
            isDeletingRef.current = false;
            setIsProcessing(false);
            setProcessingMessage("PROCESANDO...");
          }
        };
        updateServer();
      } catch (error: any) {
        alert('Error al procesar el archivo Excel: ' + (error.message || ''));
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCheckOut = (id: number, studentName: string, curso: string, fecha: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const [year, month] = fecha.split('-').map(Number);
    const updatedItem = { Estudiante: studentName, Curso: curso, Prestado: 'SÍ', Ubicacion: 'HOGAR', FechaSalida: fecha, HoraSalida: timeStr };
    setData(prev => prev.map(item => item.id.toString() === id.toString() ? { ...item, ...updatedItem } : item));

    const selectedItem = data.find(i => i.id.toString() === id.toString());
    const newHistoryRecord: MovementRecord = {
      id: Math.random().toString(36).substr(2, 9),
      instrumentId: id,
      instrumentName: selectedItem?.Instrumento || '',
      serie: selectedItem?.Serie || '',
      marca: selectedItem?.Marca || '',
      estudiante: studentName,
      curso: curso,
      fechaSalida: fecha,
      horaSalida: timeStr,
      status: 'en_prestamo',
      mes: month - 1,
      anio: year
    };
    setHistory(prev => [newHistoryRecord, ...prev]);

    supabase.from('inventory').update({ ...updatedItem, id: String(id) }).eq('id', String(id)).then(({ error }) => error && console.error(error));
    supabase.from('history').insert({ ...newHistoryRecord, instrumentId: String(id) }).then(({ error }) => error && console.error(error));
    supabase.from('students').upsert({ name: studentName.toUpperCase(), course: curso.toUpperCase() }, { onConflict: 'name' }).then(({ error }) => error && console.error(error));
  };

  const handleReturn = (id: number, fecha: string) => {
    const updatedItem = { Prestado: 'NO', Ubicacion: 'SALA DE MÚSICA', FechaRetorno: fecha, Estudiante: '', Curso: '' };
    setData(prev => prev.map(item => item.id.toString() === id.toString() ? { ...item, ...updatedItem } : item));
    const historyRecord = history.find(rec => rec.instrumentId.toString() === id.toString() && rec.status === 'en_prestamo');
    setHistory(prev => prev.map(rec => (rec.instrumentId.toString() === id.toString() && rec.status === 'en_prestamo') ? { ...rec, fechaRetorno: fecha, status: 'completado' } : rec));

    supabase.from('inventory').update({ ...updatedItem, id: String(id) }).eq('id', String(id)).then(({ error }) => error && console.error(error));
    if (historyRecord && historyRecord.id) {
      supabase.from('history').update({ fechaRetorno: fecha, status: 'completado' }).eq('id', historyRecord.id).then(({ error }) => error && console.error(error));
    }
  };

  const performClearDatabase = async () => {
    setShowDeleteConfirm(false);
    isDeletingRef.current = true;
    setIsProcessing(true);
    setProcessingMessage("Borrando inventario...");

    try {
      const { error } = await supabase.from('inventory').delete().neq('id', 'placeholder');
      if (error) throw error;

      setData([]);
      setProcessingMessage("¡Limpieza completada!");
      await new Promise(r => setTimeout(r, 1000));
      setViewMode('dashboard');
    } catch (e: any) {
      console.error(e);
      alert(`Error al borrar: ${e.message}`);
    } finally {
      isDeletingRef.current = false;
      setIsProcessing(false);
      setProcessingMessage("PROCESANDO...");

      // Recargar datos por seguridad
      const [invRes, histRes, studRes] = await Promise.all([
        supabase.from('inventory').select('*'),
        supabase.from('history').select('*').order('created_at', { ascending: false }),
        supabase.from('students').select('*').order('name', { ascending: true })
      ]);
      if (invRes.data) setData(invRes.data as InventoryItem[]);
      if (histRes.data) setHistory(histRes.data as MovementRecord[]);
      if (studRes.data) setStudents(studRes.data as Student[]);
    }
  };
  const performClearHistory = async () => {
    setIsProcessing(true);
    setProcessingMessage("Eliminando registros históricos...");

    // Safety timeout for Safari/Chrome hangs
    const timeout = setTimeout(() => {
      setIsProcessing(false);
      setProcessingMessage("PROCESANDO...");
      console.warn("La operación de borrado excedió el tiempo límite.");
    }, 10000);

    try {
      // Filtro universal para borrar todo (ID no es nulo)
      const { error } = await supabase.from('history').delete().not('id', 'is', null);

      if (error) throw error;

      setHistory([]);
      setProcessingMessage("¡Limpieza completada!");
      await new Promise(r => setTimeout(r, 1000));
    } catch (e: any) {
      console.error('Error al borrar historial:', e);
      setProcessingMessage(`ERROR: ${e.message || 'Fallo de red'}`);
      await new Promise(r => setTimeout(r, 2000));
    } finally {
      clearTimeout(timeout);
      setIsProcessing(false);
      setProcessingMessage("PROCESANDO...");
    }
  };
  const clearDatabase = (skipConfirm = false) => {
    if (skipConfirm) performClearDatabase();
    else setShowDeleteConfirm(true);
  };

  const stats = useMemo(() => {
    const countBueno = data.filter(i => getEstadoCategoria(i.Estado) === 'BUENO').length;
    const countRegular = data.filter(i => getEstadoCategoria(i.Estado) === 'REGULAR').length;
    const countMalo = data.filter(i => getEstadoCategoria(i.Estado) === 'MALO').length;
    const loanedCount = data.filter(i => isItemLoaned(i)).length;
    const catMap: any = {}; const monMap: any = {};
    data.forEach(item => {
      let familia = item.Familia || inferFamilia(item.Instrumento);
      // Normalización de nombres largos para el gráfico
      if (familia.includes('VIOLINES')) familia = 'VIOLINES Y VIOLAS';
      else if (familia.includes('CELLOS')) familia = 'CELLOS Y CONTR.';
      else if (familia.includes('BRONCE')) familia = 'V. BRONCE';
      else if (familia.includes('MADERA')) familia = 'V. MADERA';
      else if (familia.includes('PERCUSION')) familia = 'PERCUSIÓN';

      catMap[familia] = (catMap[familia] || 0) + 1;
      monMap[item.Responsable || 'SIN MONITOR'] = (monMap[item.Responsable || 'SIN MONITOR'] || 0) + 1;
    });
    return {
      total: data.length, necesitaReparacion: countMalo, bueno: countBueno, regular: countRegular, malo: countMalo, enPrestamo: loanedCount,
      categorias: Object.entries(catMap).map(([name, value]) => ({ name, value })),
      estados: [{ name: 'BUENO', count: countBueno }, { name: 'REGULAR', count: countRegular }, { name: 'MALO', count: countMalo }],
      monitores: Object.entries(monMap).map(([name, count]) => ({ name, count }))
    };
  }, [data]);

  const Logo = () => (
    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setViewMode('dashboard')}>
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative bg-white border border-slate-200 p-1 rounded-xl shadow-xl flex items-center justify-center overflow-hidden w-12 h-12">
          <img src={APP_LOGO_URL} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
        </div>
      </div>
      <div className="flex flex-col -space-y-1">
        <span className="text-2xl font-black italic tracking-tighter text-white">{APP_NAME} <span className="text-indigo-500 not-italic">APP</span></span>
        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500">{APP_SUBTITLE}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex w-full">
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-[#020617]/95 backdrop-blur-3xl flex flex-col items-center justify-center">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full animate-pulse"></div>
            <div className="relative w-24 h-24 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-[0.3em] uppercase italic mb-2 animate-in fade-in slide-in-from-bottom-2">{processingMessage}</h2>
          <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-indigo-600 animate-progress origin-left w-full"></div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-[#020617]/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900/90 border border-white/10 rounded-[40px] p-12 max-w-lg w-full shadow-[0_64px_128px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 blur-3xl rounded-full"></div>
            <div className="flex flex-col items-center text-center space-y-8">
              <div className="w-24 h-24 bg-rose-600/10 rounded-[32px] flex items-center justify-center border border-rose-500/20">
                <AlertTriangle className="w-12 h-12 text-rose-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Reiniciar <span className="text-rose-500">Inventario</span></h3>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                  Se borrarán los instrumentos, pero se <span className="text-emerald-400">conservarán</span> los registros de salida y la base de datos de estudiantes.
                </p>
              </div>
              <div className="flex gap-6 w-full">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-6 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all border border-white/5">Cancelar</button>
                <button onClick={performClearDatabase} className="flex-1 py-6 rounded-3xl font-black text-xs uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/20">Sí, Borrar Todo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-[#020617]/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900/90 border border-white/10 rounded-[40px] p-12 max-w-lg w-full shadow-[0_64px_128px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl rounded-full"></div>
            <div className="flex flex-col items-center text-center space-y-8">
              <div className="w-24 h-24 bg-indigo-600/10 rounded-[32px] flex items-center justify-center border border-indigo-500/20">
                <History className="w-12 h-12 text-indigo-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Borrar <span className="text-indigo-400">Historial</span></h3>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                  ¿Estás seguro de eliminar todos los registros de movimientos? <span className="text-rose-500">Esta acción es irreversible.</span>
                </p>
              </div>
              <div className="flex gap-6 w-full">
                <button onClick={() => setShowHistoryDeleteConfirm(false)} className="flex-1 py-6 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all border border-white/5">Cancelar</button>
                <button
                  onClick={() => { setShowHistoryDeleteConfirm(false); performClearHistory(); }}
                  className="flex-1 py-6 rounded-3xl font-black text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
                >Sí, Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isStudentModeUrl && (
        <>
          {/* Backdrop/Overlay for mobile */}
          <div
            className={`fixed inset-0 bg-black/80 backdrop-blur-md z-[65] lg:hidden transition-all duration-700 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className={`fixed lg:sticky top-0 h-screen w-72 bg-[#020617] border-r border-slate-900 z-[70] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-[20px_0_100px_rgba(0,0,0,0.9)]' : '-translate-x-full'}`}>
            <div className="flex flex-col h-full pt-8">
              <div className="px-8 mb-12 flex justify-between">
                <Logo />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="lg:hidden p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
                <button onClick={() => { setViewMode('dashboard'); setIsMobileMenuOpen(false); }} className={`flex w-full items-center px-5 py-4 text-sm font-semibold rounded-2xl transition-all ${viewMode === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard</button>
                <button onClick={() => { setViewMode('list'); setIsMobileMenuOpen(false); }} className={`flex w-full items-center px-5 py-4 text-sm font-semibold rounded-2xl transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><FileSpreadsheet className="w-5 h-5 mr-3" /> InventarioWT</button>
                <button onClick={() => { setViewMode('reports'); setIsMobileMenuOpen(false); }} className={`flex w-full items-center px-5 py-4 text-sm font-semibold rounded-2xl transition-all ${viewMode === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><BarChart3 className="w-5 h-5 mr-3" /> Reportes</button>
                <div className="pt-10 px-5 mb-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Alumnos</div>
                <button onClick={() => { setViewMode('student-check'); setIsMobileMenuOpen(false); }} className={`flex w-full items-center px-5 py-4 text-sm font-semibold rounded-2xl transition-all ${viewMode === 'student-check' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><UserCheck className="w-5 h-5 mr-3" /> Salida/Retorno</button>
                <button onClick={() => { setViewMode('qr-access'); setIsMobileMenuOpen(false); }} className={`flex w-full items-center px-5 py-4 text-sm font-semibold rounded-2xl transition-all ${viewMode === 'qr-access' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><QrCode className="w-5 h-5 mr-3" /> Acceso QR</button>
                <div className="pt-10 px-5 mb-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Herramientas</div>
                <label className="flex w-full items-center px-5 py-4 text-sm font-semibold rounded-2xl text-indigo-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all"><FileUp className="w-5 h-5 mr-3" /> Actualizar Excel<input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} /></label>
                <button onClick={() => { setShowHistoryDeleteConfirm(true); setIsMobileMenuOpen(false); }} className="flex w-full items-center px-5 py-4 text-sm font-semibold rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all"><Trash2 className="w-5 h-5 mr-3" /> Borrar Reportes</button>
              </nav>

              <div className="px-6 py-4 mt-auto border-t border-slate-900/50">
                <div className="bg-slate-900/40 p-1 rounded-xl flex items-center gap-1">
                  <button
                    onClick={() => { if (theme !== 'light') toggleTheme(); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-600/10' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Claro</span>
                  </button>
                  <button
                    onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Oscuro</span>
                  </button>
                </div>
                <div className="mt-3 text-center">
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em] opacity-50">
                    {APP_VERSION}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        {!isStudentModeUrl && (
          <header className="sticky top-0 z-20 bg-[#020617]/95 backdrop-blur-xl border-b border-slate-900 px-6 py-4 flex justify-between items-center lg:px-8 lg:py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-xl lg:text-2xl font-black uppercase italic tracking-tighter">
                {viewMode === 'directory' ? 'Estudiantes orquesta' : 'InventarioWT'}
              </h1>
            </div>
            {viewMode === 'list' && (
              <button
                onClick={() => setShowInventoryForm(true)}
                className="bg-indigo-600 px-4 py-2 rounded-xl text-[10px] lg:text-xs font-black text-white uppercase flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 mr-2"
              >
                <Music className="w-4 h-4" /> <span className="hidden sm:inline">Añadir Instrumento</span>
              </button>
            )}
            {data.length > 0 && (
              <button
                onClick={() => {
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
                  XLSX.writeFile(wb, "Inventario.xlsx");
                }}
                className="bg-emerald-600 px-4 py-2 rounded-xl text-[10px] lg:text-xs font-black text-white uppercase flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
              >
                <Save className="w-4 h-4" /> <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
          </header>
        )}

        {showInventoryForm && (
          <InventoryForm 
            onClose={() => setShowInventoryForm(false)} 
            onSave={(newItem) => {
              // The Realtime listener will handle the global state update
              // but we can update locally for immediate feedback if desired
              setData(prev => [...prev, newItem]);
            }} 
          />
        )}

        <div className="p-4 sm:p-8 lg:p-12 w-full max-w-[1600px] mx-auto">
          {isStudentModeUrl ? (
            <StudentCheckOut inventory={data} onConfirm={handleCheckOut} onReturn={handleReturn} isExternalView={true} availableStudents={uniqueStudents} />
          ) : data.length === 0 ? (
            <div className="min-h-[85vh] flex flex-col items-center justify-center text-center">
              <div className="relative mb-16 bg-white p-6 rounded-[3rem] shadow-2xl min-w-[200px] min-h-[200px] flex items-center justify-center">
                <img src={APP_LOGO_URL} className="w-32 h-32 object-contain" />
              </div>
              <h2 className="text-6xl font-black mb-12 uppercase italic text-white leading-[0.9]">Inventario<br /><span className="text-indigo-500">WT</span></h2>
              <label className="bg-white text-slate-950 px-16 py-8 rounded-[2.5rem] font-black text-2xl cursor-pointer hover:bg-indigo-50 transition-all shadow-xl">
                <Upload className="w-8 h-8 inline mr-4" /> CARGAR INVENTARIO
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <>
              {viewMode === 'dashboard' && (
                <div className="space-y-12">
                  <KPICards stats={stats as any} onCardClick={(f) => {
                    if (f === 'loaned') setViewMode('loaned-detail');
                    else if (f === 'malo') setViewMode('repair-detail');
                    else if (f === 'regular') setViewMode('regular-detail');
                    else if (f === 'bueno') setViewMode('bueno-detail');
                    else setViewMode('list');
                  }} />
                  <Charts stats={stats as any} />
                  <MonitorStats stats={stats as any} onMonitorClick={(name) => { setSelectedMonitor(name); setViewMode('monitor-detail'); }} />
                </div>
              )}
              {viewMode === 'student-check' && <StudentCheckOut inventory={data} onConfirm={handleCheckOut} onReturn={handleReturn} onCancel={() => setViewMode('dashboard')} availableStudents={uniqueStudents} />}
              {viewMode === 'directory' && <DirectoryView />}
              {viewMode === 'reports' && <ReportsView history={history} onClearHistory={() => setShowHistoryDeleteConfirm(true)} />}
              {viewMode === 'qr-access' && <QRAccessView />}
              {(['list', 'monitor-detail', 'loaned-detail', 'repair-detail', 'regular-detail', 'bueno-detail'].includes(viewMode)) && (
                <div className="bg-slate-900/20 border border-slate-900 rounded-[3rem] overflow-hidden shadow-2xl">
                  <div className="p-10 border-b border-slate-900 flex items-center gap-6">
                    {viewMode !== 'list' && <button onClick={() => setViewMode('dashboard')} className="p-3 bg-slate-950 rounded-full"><ArrowLeft /></button>}
                    <div className="relative flex-1"><Search className="absolute left-6 top-1/2 -translate-y-1/2" /><input type="text" placeholder="Buscar..." className="w-full pl-16 pr-8 py-4 bg-[#020617] border-2 border-slate-900 rounded-full text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                  </div>
                  <InventoryTable data={filteredData} />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
