import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  BarChart3,
  UserCheck,
  QrCode,
  Scan,
  FileUp,
  Trash2,
  X,
  Sun,
  Moon
} from 'lucide-react';

const APP_LOGO_URL = `${import.meta.env.BASE_URL}logo_orquesta_sinfonica_wt.png`;
const APP_NAME = "OSWT";
const APP_SUBTITLE = "Orquesta Sinfónica William Taylor";
const APP_VERSION = "1.1.01 ExeApp";

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  viewMode: string;
  setViewMode: (mode: any) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowHistoryDeleteConfirm: (val: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Logo = ({ setViewMode }: { setViewMode: (mode: any) => void }) => (
  <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setViewMode('dashboard')}>
    <div className="relative">
      <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative bg-white border border-slate-200 p-1 rounded-xl shadow-xl flex items-center justify-center overflow-hidden w-12 h-12">
        <img src={APP_LOGO_URL} alt="Logo" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
      </div>
    </div>
    <div className="flex flex-col -space-y-1">
      <span className="text-2xl font-black italic tracking-tighter text-white">{APP_NAME} <span className="text-indigo-500 not-italic">APP</span></span>
      <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500">{APP_SUBTITLE}</span>
    </div>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  viewMode,
  setViewMode,
  handleFileUpload,
  setShowHistoryDeleteConfirm,
  theme,
  toggleTheme
}) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-md z-[65] lg:hidden transition-all duration-700 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside className={`fixed lg:sticky top-0 h-screen w-72 bg-[#020617] border-r border-slate-900 z-[70] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-[20px_0_100px_rgba(0,0,0,0.9)]' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full pt-8">
          <div className="px-8 mb-12 flex justify-between">
            <Logo setViewMode={setViewMode} />
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
            <button onClick={() => { setViewMode('qr-scanner'); setIsMobileMenuOpen(false); }} className={`flex w-full items-center px-5 py-4 text-sm font-semibold rounded-2xl transition-all ${viewMode === 'qr-scanner' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Scan className="w-5 h-5 mr-3" /> Escáner QR</button>
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
  );
};
