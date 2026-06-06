import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Search, AlertTriangle, History, ArrowLeft, LogIn } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient.ts';

// Tipos
import { InventoryItem, Student, KPIStats } from './types.ts';
import { globalNormalize, getEstadoCategoria, inferFamilia, isItemLoaned } from './utils.ts';

// Layout
import { Sidebar } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';

// Vistas & Componentes
import KPICards from './components/KPICards.tsx';
import InventoryTable from './components/InventoryTable.tsx';
import Charts from './components/Charts.tsx';
import MonitorStats from './components/MonitorStats.tsx';
import StudentCheckOut from './components/StudentCheckOut.tsx';
import ReportsView from './components/ReportsView.tsx';
import QRAccessView from './components/QRAccessView.tsx';
import DirectoryView from './components/DirectoryView.tsx';
import InventoryForm from './components/InventoryForm.tsx';
import InstrumentDetail from './components/InstrumentDetail.tsx';
import OverdueAlerts from './components/OverdueAlerts.tsx';
import QRScannerView from './components/QRScannerView.tsx';
import { LoginView } from './components/LoginView.tsx';
import PresentationControlView from './components/PresentationControlView.tsx';
import { LandingView } from './components/LandingView.tsx';
import StudentDashboardStats from './components/StudentDashboardStats.tsx';

// Hooks
import { useInventoryData } from './hooks/useInventoryData.ts';
import { useDebounce } from './hooks/useDebounce.ts';

const APP_LOGO_URL = `${import.meta.env.BASE_URL}logo_orquesta_sinfonica_wt.png`;

type ViewMode = 'landing' | 'dashboard' | 'list' | 'student-check' | 'directory' | 'reports' | 'monitor-detail' | 'loaned-detail' | 'repair-detail' | 'qr-access' | 'qr-scanner' | 'regular-detail' | 'bueno-detail' | 'presentation-control';

const App: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const isStudentModeUrl = queryParams.get('mode') === 'student';

  const {
    data,
    history,
    students,
    isProcessing,
    processingMessage,
    handleExcelUpload,
    performCheckout,
    performReturn,
    clearDatabase,
    clearHistory,
    isLoading
  } = useInventoryData();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (isStudentModeUrl) return 'student-check';
    return 'landing';
  });
  const [studentDirectoryFilter, setStudentDirectoryFilter] = useState<'all' | 'basica' | 'media'>('all');

  const setViewMode = (mode: ViewMode) => {
    if (mode !== 'directory') {
      // Si navegamos fuera de directory, también es buena idea dejarlo limpio para el siguiente uso
      setStudentDirectoryFilter('all');
    }
    setViewModeState(mode);
  };
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistoryDeleteConfirm, setShowHistoryDeleteConfirm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<InventoryItem | null>(null);
  const [showOverdueAlerts, setShowOverdueAlerts] = useState(false);

  const handleDownloadBackup = async () => {
    try {
      const [invRes, histRes, studRes] = await Promise.all([
        supabase.from('inventory').select('*'),
        supabase.from('history').select('*'),
        supabase.from('students').select('*')
      ]);

      if (invRes.error) throw invRes.error;
      
      const backupData = {
        backup_date: new Date().toISOString(),
        version: "1.2.03 ExeApp",
        inventory: invRes.data || [],
        history: histRes.data || [],
        students: studRes.data || []
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `OSWT_respaldo_inventario_${dateStr}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert("Copia de seguridad descargada exitosamente.");
    } catch (error: any) {
      alert("Error al descargar la copia de seguridad: " + error.message);
    }
  };

  // Supabase Auth Session
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
      if (session && viewMode === 'landing') {
        setViewMode('dashboard');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthLoading(false);
      if (session && viewMode === 'landing') {
        setViewMode('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [viewMode]);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      localStorage.theme = newTheme;
    } catch (e) {
      console.warn("No se pudo guardar la preferencia de tema en localStorage:", e);
    }
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setViewMode('landing');
  };

  // Determinar si la vista actual requiere login
  const isProtectedView = useMemo(() => {
    const publicViews: ViewMode[] = ['landing', 'student-check', 'qr-scanner', 'qr-access'];
    return !publicViews.includes(viewMode);
  }, [viewMode]);

  // Si requiere login y no hay sesión activa, bloqueamos el panel
  const needsAuth = isProtectedView && !session && !isStudentModeUrl;

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

    const term = globalNormalize(debouncedSearchTerm);
    if (!term) return base.sort((a, b) => (a.Instrumento || '').localeCompare(b.Instrumento || ''));

    return base.filter(item => {
      const searchString = globalNormalize([
        item.Instrumento, item.Marca, item.Modelo, item.Estudiante, item.Responsable, item.Serie, item.Ubicacion, item.Familia
      ].join(' '));
      return searchString.includes(term);
    }).sort((a, b) => (a.Instrumento || '').localeCompare(b.Instrumento || ''));
  }, [data, debouncedSearchTerm, viewMode, selectedMonitor]);

  const uniqueStudents = useMemo((): Student[] => {
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
      id: name,
      name: name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      course: course
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data, students]);

  const stats = useMemo((): KPIStats => {
    const countBueno = data.filter(i => getEstadoCategoria(i.Estado) === 'BUENO').length;
    const countRegular = data.filter(i => getEstadoCategoria(i.Estado) === 'REGULAR').length;
    const countMalo = data.filter(i => getEstadoCategoria(i.Estado) === 'MALO').length;
    const loanedCount = data.filter(i => isItemLoaned(i)).length;
    
    const catMap: Record<string, number> = {}; 
    const monMap: Record<string, number> = {};
    
    data.forEach(item => {
      let familia = item.Familia || inferFamilia(item.Instrumento);
      if (familia.includes('VIOLINES')) familia = 'VIOLINES Y VIOLAS';
      else if (familia.includes('CELLOS')) familia = 'CELLOS Y CONTR.';
      else if (familia.includes('BRONCE')) familia = 'V. BRONCE';
      else if (familia.includes('MADERA')) familia = 'V. MADERA';
      else if (familia.includes('PERCUSION')) familia = 'PERCUSIÓN';

      catMap[familia] = (catMap[familia] || 0) + 1;
      monMap[item.Responsable || 'SIN MONITOR'] = (monMap[item.Responsable || 'SIN MONITOR'] || 0) + 1;
    });

    return {
      total: data.length,
      necesitaReparacion: countMalo,
      bueno: countBueno,
      regular: countRegular,
      malo: countMalo,
      enPrestamo: loanedCount,
      categorias: Object.entries(catMap).map(([name, value]) => ({ name, value })),
      estados: [{ name: 'BUENO', count: countBueno }, { name: 'REGULAR', count: countRegular }, { name: 'MALO', count: countMalo }],
      monitores: Object.entries(monMap).map(([name, count]) => ({ name, count }))
    };
  }, [data]);

  const studentStats = useMemo(() => {
    const list = students.length > 0 ? students : uniqueStudents;
    let basicaCount = 0;
    let mediaCount = 0;
    
    list.forEach(student => {
      const courseUpper = (student.course || '').toUpperCase();
      if (courseUpper.includes('BÁSICO') || courseUpper.includes('BASICO')) {
        basicaCount++;
      } else if (courseUpper.includes('MEDIO')) {
        mediaCount++;
      }
    });
    
    return {
      total: list.length,
      basica: basicaCount,
      media: mediaCount,
      otros: list.length - basicaCount - mediaCount
    };
  }, [students, uniqueStudents]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full animate-pulse"></div>
          <div className="w-16 h-16 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Iniciando InventOS...</p>
      </div>
    );
  }

  if (viewMode === 'landing' && !isStudentModeUrl) {
    return (
      <LandingView onLoginClick={() => setViewMode('dashboard')} />
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex w-full max-w-full overflow-x-hidden relative">
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-[#020617]/95 backdrop-blur-3xl flex flex-col items-center justify-center">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full animate-pulse"></div>
            <div className="relative w-24 h-24 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-[0.3em] uppercase italic mb-2">{processingMessage}</h2>
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
                  Se borrarán los instrumentos, pero se conservarán los registros de salida.
                </p>
              </div>
              <div className="flex gap-6 w-full">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-6 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all border border-white/5">Cancelar</button>
                <button onClick={() => clearDatabase(() => { setShowDeleteConfirm(false); setViewMode('dashboard'); })} className="flex-1 py-6 rounded-3xl font-black text-xs uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/20">Sí, Borrar Todo</button>
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
                  onClick={() => { setShowHistoryDeleteConfirm(false); clearHistory(); }}
                  className="flex-1 py-6 rounded-3xl font-black text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
                >Sí, Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER LOGIN PROMPT IF NEEDED */}
      {needsAuth && (
        <LoginView 
          onSuccess={() => setShowLoginPrompt(false)} 
          onClose={() => setViewMode('landing')}
        />
      )}

      {!isStudentModeUrl && (
        <Sidebar
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          viewMode={viewMode}
          setViewMode={setViewMode}
          handleFileUpload={(e) => {
            const file = e.target.files?.[0];
            if (file) handleExcelUpload(file, () => setViewMode('dashboard'));
          }}
          setShowHistoryDeleteConfirm={setShowHistoryDeleteConfirm}
          theme={theme}
          toggleTheme={toggleTheme}
          isAuthenticated={!!session}
          onSignOut={handleSignOut}
          onDownloadBackup={handleDownloadBackup}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        {!isStudentModeUrl && (
          <Header 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            viewMode={viewMode}
            data={data}
            setShowOverdueAlerts={setShowOverdueAlerts}
            setShowInventoryForm={setShowInventoryForm}
          />
        )}

        {showInventoryForm && (
          <InventoryForm 
            onClose={() => setShowInventoryForm(false)} 
            onSave={() => {
              setShowInventoryForm(false);
            }} 
          />
        )}

        {selectedInstrument && (
          <InstrumentDetail
            item={selectedInstrument}
            history={history}
            onClose={() => setSelectedInstrument(null)}
          />
        )}

        {showOverdueAlerts && (
          <OverdueAlerts
            inventory={data}
            onClose={() => setShowOverdueAlerts(false)}
            onSelectItem={(item) => { setShowOverdueAlerts(false); setSelectedInstrument(item); }}
          />
        )}

        <div className="p-4 sm:p-8 lg:p-12 w-full max-w-[1600px] mx-auto">
          {isStudentModeUrl ? (
            <StudentCheckOut inventory={data} onConfirm={performCheckout} onReturn={performReturn} isExternalView={true} availableStudents={uniqueStudents} />
          ) : data.length === 0 ? (
            <div className="min-h-[85vh] flex flex-col items-center justify-center text-center">
              <div className="relative mb-16 bg-white p-6 rounded-[3rem] shadow-2xl min-w-[200px] min-h-[200px] flex items-center justify-center">
                <img src={APP_LOGO_URL} className="w-32 h-32 object-contain" alt="Logo" />
              </div>
              <h2 className="text-6xl font-black mb-12 uppercase italic text-white leading-[0.9]">Inventario<br /><span className="text-indigo-500">WT</span></h2>
              
              {!session ? (
                <button 
                  onClick={() => setViewMode('dashboard')}
                  className="bg-indigo-600 text-white px-16 py-8 rounded-[2.5rem] font-black text-2xl hover:bg-indigo-500 transition-all shadow-xl flex items-center gap-4 mx-auto"
                >
                  <LogIn className="w-8 h-8" /> ACCEDER AL SISTEMA
                </button>
              ) : (
                <label className="bg-white text-slate-950 px-16 py-8 rounded-[2.5rem] font-black text-2xl cursor-pointer hover:bg-indigo-50 transition-all shadow-xl inline-block">
                  <Upload className="w-8 h-8 inline mr-4" /> CARGAR INVENTARIO
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleExcelUpload(file, () => setViewMode('dashboard'));
                  }} />
                </label>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'dashboard' && (
                <div className="space-y-12">
                  <KPICards stats={stats} onCardClick={(f) => {
                    if (f === 'loaned') setViewMode('loaned-detail');
                    else if (f === 'malo') setViewMode('repair-detail');
                    else if (f === 'regular') setViewMode('regular-detail');
                    else if (f === 'bueno') setViewMode('bueno-detail');
                    else setViewMode('list');
                  }} />
                  <StudentDashboardStats 
                    stats={studentStats} 
                    onViewDirectory={(filter) => {
                      setStudentDirectoryFilter(filter);
                      setViewModeState('directory');
                    }} 
                  />
                  <Charts stats={stats} />
                  <MonitorStats stats={stats} onMonitorClick={(name) => { setSelectedMonitor(name); setViewMode('monitor-detail'); }} />
                </div>
              )}
              {viewMode === 'student-check' && <StudentCheckOut inventory={data} onConfirm={performCheckout} onReturn={performReturn} onCancel={() => setViewMode('dashboard')} availableStudents={uniqueStudents} />}
              {viewMode === 'directory' && (
                <DirectoryView 
                  initialFilter={studentDirectoryFilter} 
                  onBackToDashboard={() => setViewMode('dashboard')}
                />
              )}
              {viewMode === 'reports' && <ReportsView history={history} onClearHistory={() => setShowHistoryDeleteConfirm(true)} />}
              {viewMode === 'qr-access' && <QRAccessView />}
              {viewMode === 'qr-scanner' && <QRScannerView inventory={data} onViewInstrument={(item) => setSelectedInstrument(item)} />}
              {viewMode === 'presentation-control' && <PresentationControlView inventory={data} onViewInstrument={(item) => setSelectedInstrument(item)} />}
              {(['list', 'monitor-detail', 'loaned-detail', 'repair-detail', 'regular-detail', 'bueno-detail'].includes(viewMode)) && (
                <div className="bg-slate-900/20 border border-slate-900 rounded-[3rem] overflow-hidden shadow-2xl">
                  <div className="p-10 border-b border-slate-900 flex items-center gap-6">
                    {viewMode !== 'list' && <button onClick={() => setViewMode('dashboard')} className="p-3 bg-slate-950 rounded-full"><ArrowLeft /></button>}
                    <div className="relative flex-1"><Search className="absolute left-6 top-1/2 -translate-y-1/2" /><input type="text" placeholder="Buscar..." className="w-full pl-16 pr-8 py-4 bg-[#020617] border-2 border-slate-900 rounded-full text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                  </div>
                  <InventoryTable data={filteredData} onItemClick={(item) => setSelectedInstrument(item)} />
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
