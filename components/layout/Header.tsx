import React from 'react';
import { Menu, Music, Save } from 'lucide-react';
import { InventoryItem } from '../../types.ts';
import { OverdueBadge } from '../OverdueAlerts.tsx';

interface HeaderProps {
  setIsMobileMenuOpen: (val: boolean) => void;
  viewMode: string;
  data: InventoryItem[];
  setShowOverdueAlerts: (val: boolean) => void;
  setShowInventoryForm: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  setIsMobileMenuOpen,
  viewMode,
  data,
  setShowOverdueAlerts,
  setShowInventoryForm
}) => {
  
  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Inventario.xlsx");
  };

  return (
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
      <div className="flex items-center gap-3">
        {data.length > 0 && <OverdueBadge inventory={data} onClick={() => setShowOverdueAlerts(true)} />}
        {viewMode === 'list' && (
          <button
            onClick={() => setShowInventoryForm(true)}
            className="bg-indigo-600 px-4 py-2 rounded-xl text-[10px] lg:text-xs font-black text-white uppercase flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Music className="w-4 h-4" /> <span className="hidden sm:inline">Añadir Instrumento</span>
          </button>
        )}
        {data.length > 0 && (
          <button
            onClick={handleExport}
            className="bg-emerald-600 px-4 py-2 rounded-xl text-[10px] lg:text-xs font-black text-white uppercase flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Save className="w-4 h-4" /> <span className="hidden sm:inline">Exportar</span>
          </button>
        )}
      </div>
    </header>
  );
};
