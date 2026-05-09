
import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  History,
  FileText,
  FilterX,
  Trash2
} from 'lucide-react';
import { MovementRecord } from '../types';

interface ReportsViewProps {
  history: MovementRecord[];
  onClearHistory: () => Promise<void>;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const ReportsView: React.FC<ReportsViewProps> = ({ history, onClearHistory }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<'all' | 'completado' | 'en_prestamo'>('all');

  // Filtrado base por fecha
  const monthlyHistory = useMemo(() => {
    return history.filter(rec => rec.mes === selectedMonth && rec.anio === selectedYear);
  }, [history, selectedMonth, selectedYear]);

  // Cálculos de KPI basados en el mes seleccionado
  const stats = useMemo(() => {
    const salidas = monthlyHistory.length;
    const completados = monthlyHistory.filter(r => r.status === 'completado').length;
    const pendientes = salidas - completados;
    return { salidas, completados, pendientes };
  }, [monthlyHistory]);

  // Filtrado final para la tabla basado en el KPI seleccionado
  const displayedHistory = useMemo(() => {
    if (statusFilter === 'all') return monthlyHistory;
    return monthlyHistory.filter(rec => rec.status === statusFilter);
  }, [monthlyHistory, statusFilter]);

  const handleExportPDF = async () => {
    if (monthlyHistory.length === 0) return;

    const doc = new jsPDF();
    const mesNombre = MESES[selectedMonth].toLowerCase();
    const fileName = `reporte mensual ${mesNombre} ${selectedYear}.pdf`;

    // Cargar logotipo
    const logoUrl = '/logo_orquesta_sinfonica_wt.png';
    const img = new Image();
    img.src = logoUrl;

    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // Continuar aunque falle el logo
    });

    let currentY = 22;

    if (img.complete && img.naturalWidth > 0) {
      // Agregar Logo en el lado izquierdo (proporcional)
      const ratio = img.naturalWidth / img.naturalHeight;
      const logoWidth = 50;
      const logoHeight = logoWidth / ratio;
      doc.addImage(img, 'PNG', 14, 10, logoWidth, logoHeight);
      currentY = logoHeight + 20; // Ajustar posición para el texto
    }

    doc.setFontSize(20);
    doc.setTextColor(40, 44, 52);
    doc.text(`Reporte de Movimientos - ${MESES[selectedMonth]} ${selectedYear}`, 14, currentY);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado por Symphony OS el ${new Date().toLocaleDateString()}`, 14, currentY + 8);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, currentY + 13, 196, currentY + 13);

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Resumen Ejecutivo:`, 14, currentY + 23);
    doc.setFontSize(10);
    doc.text(`• Total Salidas registradas: ${stats.salidas}`, 14, currentY + 30);
    doc.text(`• Retornos completados: ${stats.completados}`, 14, currentY + 36);
    doc.text(`• Instrumentos pendientes: ${stats.pendientes}`, 14, currentY + 42);

    const tableData = monthlyHistory.map(rec => [
      rec.fechaSalida,
      `${rec.estudiante} (${rec.curso})`,
      rec.instrumentName,
      `${rec.marca} - ${rec.serie}`,
      rec.horaSalida,
      rec.fechaRetorno || "PENDIENTE",
      rec.status === 'completado' ? 'COMPLETADO' : 'EN HOGAR'
    ]);

    autoTable(doc, {
      startY: currentY + 53,
      head: [['Fecha', 'Estudiante', 'Instrumento', 'Marca/Serie', 'Salida', 'Retorno', 'Estado']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 6: { fontStyle: 'bold' } }
    });

    doc.save(fileName);
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Reporte */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-1 flex items-center gap-3">
            <History className="text-indigo-500 w-8 h-8" /> Reporte de Movimientos
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Resumen detallado de préstamos y retornos</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => { setSelectedMonth(prev => prev === 0 ? 11 : prev - 1); setStatusFilter('all'); }}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
            ><ChevronLeft className="w-5 h-5" /></button>
            <span className="px-4 text-xs font-black uppercase w-28 text-center">{MESES[selectedMonth]}</span>
            <button
              onClick={() => { setSelectedMonth(prev => prev === 11 ? 0 : prev + 1); setStatusFilter('all'); }}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
            ><ChevronRight className="w-5 h-5" /></button>
          </div>

          {/* Fix: Added missing logic for year selection and finished the component */}
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(Number(e.target.value)); setStatusFilter('all'); }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-black uppercase outline-none focus:border-indigo-500"
          >
            {[2023, 2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            onClick={handleExportPDF}
            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all text-white shadow-lg shadow-indigo-600/20"
          >
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onClearHistory();
            }}
            className="p-3 bg-red-600/10 hover:bg-red-600 group rounded-xl transition-all border border-red-500/20 hover:border-red-500 cursor-pointer flex items-center justify-center"
            title="Borrar todo el historial"
          >
            <Trash2 className="w-5 h-5 text-red-500 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {/* KPI Cards del Mes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`bg-slate-900/40 border p-8 rounded-[2rem] text-left transition-all ${statusFilter === 'all' ? 'border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10' : 'border-slate-800 hover:border-slate-700'}`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl"><TrendingUp className="w-6 h-6 text-indigo-400" /></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Salidas</span>
          </div>
          <p className="text-4xl font-black text-white">{stats.salidas}</p>
        </button>

        <button
          onClick={() => setStatusFilter('completado')}
          className={`bg-slate-900/40 border p-8 rounded-[2rem] text-left transition-all ${statusFilter === 'completado' ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10' : 'border-slate-800 hover:border-slate-700'}`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl"><ArrowDownLeft className="w-6 h-6 text-emerald-400" /></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Retornos</span>
          </div>
          <p className="text-4xl font-black text-white">{stats.completados}</p>
        </button>

        <button
          onClick={() => setStatusFilter('en_prestamo')}
          className={`bg-slate-900/40 border p-8 rounded-[2rem] text-left transition-all ${statusFilter === 'en_prestamo' ? 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10' : 'border-slate-800 hover:border-slate-700'}`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl"><ArrowUpRight className="w-6 h-6 text-amber-400" /></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">En Hogar</span>
          </div>
          <p className="text-4xl font-black text-white">{stats.pendientes}</p>
        </button>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-slate-900/20 border border-slate-900 rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Fecha</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Detalle Item</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Estudiante</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Estado</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50">
              {displayedHistory.length > 0 ? displayedHistory.map((rec, i) => (
                <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-8 py-6 text-xs font-bold text-slate-400">{rec.fechaSalida}</td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white uppercase italic">{rec.instrumentName}</span>
                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{rec.marca} - {rec.serie}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-200 uppercase">{rec.estudiante}</span>
                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{rec.curso}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {rec.status === 'completado' ? (
                      <span className="inline-flex items-center justify-center text-[9px] font-black text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full leading-none whitespace-nowrap">Completado</span>
                    ) : (
                      <span className="inline-flex items-center justify-center text-[9px] font-black text-amber-500 uppercase px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full leading-none whitespace-nowrap">En Hogar</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-[10px] font-black text-slate-500">{rec.horaSalida}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <FilterX className="w-12 h-12 text-slate-500" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sin movimientos registrados</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
