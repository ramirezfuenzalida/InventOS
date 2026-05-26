import React, { useState, useMemo } from 'react';
import { Upload, Search, AlertTriangle, History, ArrowLeft } from 'lucide-react';

// Tipos
import { InventoryItem } from './types.ts';
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

// Hooks
import { useInventoryData } from './hooks/useInventoryData.ts';
import { useDebounce } from './hooks/useDebounce.ts';

const APP_LOGO_URL = `${import.meta.env.BASE_URL}logo_orquesta_sinfonica_wt.png`;

type ViewMode = 'dashboard' | 'list' | 'student-check' | 'directory' | 'reports' | 'monitor-detail' | 'loaned-detail' | 'repair-detail' | 'qr-access' | 'qr-scanner' | 'regular-detail' | 'bueno-detail';

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
    clearHistory
  } = useInventoryData();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [viewMode, setViewMode] = useState<ViewMode>(isStudentModeUrl ? 'student-check' : 'dashboard');
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistoryDeleteConfirm, setShowHistoryDeleteConfirm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<InventoryItem | null>(null);
  const [showOverdueAlerts, setShowOverdueAlerts] = useState(false);

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

  const stats = useMemo(() => {
    const countBueno = data.filter(i => getEstadoCategoria(i.Estado) === 'BUENO').length;
    const countRegular = data.filter(i => getEstadoCategoria(i.Estado) === 'REGULAR').length;
    const countMalo = data.filter(i => getEstadoCategoria(i.Estado) === 'MALO').length;
    const loanedCount = data.filter(i => isItemLoaned(i)).length;
    const catMap: any = {}; const monMap: any = {};
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
      total: data.length, necesitaReparacion: countMalo, bueno: countBueno, regular: countRegular, malo: countMalo, enPrestamo: loanedCount,
      categorias: Object.entries(catMap).map(([name, value]) => ({ name, value })),
      estados: [{ name: 'BUENO', count: countBueno }, { name: 'REGULAR', count: countRegular }, { name: 'MALO', count: countMalo }],
      monitores: Object.entries(monMap).map(([name, count]) => ({ name, count }))
    };
  }, [data]);

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
        />
      )}

      <main className="flex-1 flex flex-col min-w-0">
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
            onSave={(newItem) => {
              // React Query Realtime maneja esto, pero podemos ser optimistas
              // No requerimos setData manual ya que Realtime invalidará y actualizará
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
              <label className="bg-white text-slate-950 px-16 py-8 rounded-[2.5rem] font-black text-2xl cursor-pointer hover:bg-indigo-50 transition-all shadow-xl">
                <Upload className="w-8 h-8 inline mr-4" /> CARGAR INVENTARIO
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleExcelUpload(file, () => setViewMode('dashboard'));
                }} />
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
              {viewMode === 'student-check' && <StudentCheckOut inventory={data} onConfirm={performCheckout} onReturn={performReturn} onCancel={() => setViewMode('dashboard')} availableStudents={uniqueStudents} />}
              {viewMode === 'directory' && <DirectoryView />}
              {viewMode === 'reports' && <ReportsView history={history} onClearHistory={() => setShowHistoryDeleteConfirm(true)} />}
              {viewMode === 'qr-access' && <QRAccessView />}
              {viewMode === 'qr-scanner' && <QRScannerView inventory={data} onViewInstrument={(item) => setSelectedInstrument(item)} />}
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
