import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Building2, Home, Tag, User, Monitor, Search, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { InventoryItem } from '../types.ts';
import { globalNormalize, getEstadoCategoria, inferFamilia, isItemLoaned } from '../utils.ts';

interface InventoryTableProps {
  data: InventoryItem[];
  onItemClick?: (item: InventoryItem) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ data, onItemClick }) => {
  const safeUpperCase = (val: string | null | undefined): string => val ? String(val).toUpperCase().trim() : "";
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Altura estimada de cada fila
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
    : 0;

  return (
    <div ref={parentRef} className="overflow-x-auto custom-scrollbar" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
      <table className="min-w-full relative">
        <thead className="bg-[#020617] sticky top-0 z-10">
          <tr className="border-b border-slate-900/50">
            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] w-16">#</th>
            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] w-[20%]">Instrumento</th>
            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] w-[20%]">Marca / Modelo</th>
            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] w-[20%]">Usuario</th>
            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] w-[15%]">Monitor</th>
            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] w-[15%]">Ubicación</th>
            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] w-[10%]">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900/30 bg-[#020617]">
          {data.length > 0 ? (
            <>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={7} />
                </tr>
              )}
              {virtualItems.map((virtualRow) => {
                const item = data[virtualRow.index];
                const categoria = getEstadoCategoria(item.Estado);
                const loaned = isItemLoaned(item);
                return (
                  <tr 
                    key={virtualRow.index}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="group transition-all hover:bg-slate-900/40 border-b border-slate-900/10 cursor-pointer h-[120px]" 
                    onClick={() => onItemClick?.(item)}
                  >
                    <td className="px-8 py-8 whitespace-nowrap"><span className="text-[11px] font-black text-slate-700 tracking-widest">{virtualRow.index + 1}</span></td>

                    <td className="px-8 py-8 whitespace-nowrap">
                      <div className="flex flex-col min-w-[200px]">
                        <span className="text-[15px] font-black text-white tracking-tight uppercase group-hover:text-indigo-400 transition-colors">
                          {safeUpperCase(item.Instrumento) || 'SIN NOMBRE'}
                        </span>
                        <span className="text-[9px] font-black text-slate-600 tracking-[0.18em] uppercase">
                          {safeUpperCase(item.Familia || inferFamilia(item.Instrumento)) || 'SIN CATEGORÍA'}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-8 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-[13px] font-black text-slate-200 uppercase tracking-tight">
                            {safeUpperCase(item.Marca) || 'GENÉRICO'}
                          </span>
                        </div>
                        {item.Modelo && (
                          <span className="text-[10px] font-bold text-slate-500 uppercase italic ml-5">
                            MOD: {safeUpperCase(item.Modelo)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-8 py-8 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2.5 mb-1">
                          <User className={`w-3.5 h-3.5 ${item.Estudiante ? 'text-indigo-400' : 'text-slate-800'}`} />
                          <span className={`text-[12px] font-black tracking-wide uppercase ${item.Estudiante ? 'text-slate-200' : 'text-slate-800 italic'}`}>
                            {safeUpperCase(item.Estudiante) || 'SIN ASIGNAR'}
                          </span>
                        </div>
                        {item.Curso && <span className="text-[9px] font-black text-slate-600 tracking-widest uppercase ml-6">{safeUpperCase(item.Curso)}</span>}
                      </div>
                    </td>

                    <td className="px-8 py-8 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Monitor className="w-3.5 h-3.5 text-indigo-500 opacity-60" />
                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-tight">
                          {safeUpperCase(item.Responsable) || 'SIN MONITOR'}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-8 whitespace-nowrap">
                      {loaned ? (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5">
                          <Home className="w-3.5 h-3.5" /> HOGAR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-slate-950 text-slate-500 border border-slate-800">
                          <Building2 className="w-3.5 h-3.5 opacity-60" /> SALA DE MÚSICA
                        </span>
                      )}
                    </td>

                    <td className="px-8 py-8 whitespace-nowrap">
                      {categoria === 'BUENO' ? (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> BUENO
                        </span>
                      ) : categoria === 'REGULAR' ? (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <HelpCircle className="w-3 h-3" /> REGULAR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          <AlertCircle className="w-3 h-3" /> MALO
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={7} />
                </tr>
              )}
            </>
          ) : (
            <tr>
              <td colSpan={7} className="px-10 py-48 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Search className="w-12 h-12 text-slate-900" />
                  <p className="text-slate-800 font-black uppercase tracking-[0.5em] text-xs opacity-50">No hay coincidencias</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
