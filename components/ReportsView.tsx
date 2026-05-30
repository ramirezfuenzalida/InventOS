import React, { useState, useMemo, useEffect } from 'react';
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
  Trash2,
  Calendar,
  Compass,
  CheckCircle,
  Briefcase,
  Loader2
} from 'lucide-react';
import { MovementRecord } from '../types';
import { supabase } from '../supabaseClient.ts';

interface ReportsViewProps {
  history: MovementRecord[];
  onClearHistory: () => Promise<void>;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface PresentationSession {
  id: string;
  name: string;
  date: string;
  status: 'activa' | 'completada';
  created_at: string;
}

interface PresentationItem {
  id: string;
  session_id: string;
  instrument_name: string;
  marca: string;
  modelo: string;
  serie: string;
  estudiante: string;
  curso: string;
  status: 'fuera' | 'retornado';
  departed_at: string;
  returned_at: string | null;
}

const ReportsView: React.FC<ReportsViewProps> = ({ history, onClearHistory }) => {
  // Pestaña principal: 'hogares' (préstamos tradicionales) o 'presentaciones'
  const [activeTab, setActiveTab] = useState<'hogares' | 'presentaciones'>('hogares');

  // ── ESTADOS DE PRÉSTAMOS A HOGARES ──
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<'all' | 'completado' | 'en_prestamo'>('all');

  const monthlyHistory = useMemo(() => {
    return history.filter(rec => rec.mes === selectedMonth && rec.anio === selectedYear);
  }, [history, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const salidas = monthlyHistory.length;
    const completados = monthlyHistory.filter(r => r.status === 'completado').length;
    const pendientes = salidas - completados;
    return { salidas, completados, pendientes };
  }, [monthlyHistory]);

  const displayedHistory = useMemo(() => {
    if (statusFilter === 'all') return monthlyHistory;
    return monthlyHistory.filter(rec => rec.status === statusFilter);
  }, [monthlyHistory, statusFilter]);

  const handleExportPDF = async () => {
    if (monthlyHistory.length === 0) return;

    const doc = new jsPDF();
    const mesNombre = MESES[selectedMonth].toLowerCase();
    const fileName = `reporte mensual ${mesNombre} ${selectedYear}.pdf`;

    const logoUrl = '/logo_orquesta_sinfonica_wt.png';
    const img = new Image();
    img.src = logoUrl;

    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    let currentY = 22;

    if (img.complete && img.naturalWidth > 0) {
      const ratio = img.naturalWidth / img.naturalHeight;
      const logoWidth = 50;
      const logoHeight = logoWidth / ratio;
      doc.addImage(img, 'PNG', 14, 10, logoWidth, logoHeight);
      currentY = logoHeight + 20;
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

  // ── ESTADOS DE HISTORIAL DE PRESENTACIONES ──
  const [presSessions, setPresSessions] = useState<PresentationSession[]>([]);
  const [selectedPresId, setSelectedPresId] = useState<string>('all');
  const [presItems, setPresItems] = useState<PresentationItem[]>([]);
  const [isLoadingPres, setIsLoadingPres] = useState(false);

  // Cargar las sesiones de presentaciones finalizadas/activas
  const loadPresentationSessions = async () => {
    setIsLoadingPres(true);
    const { data, error } = await supabase
      .from('presentation_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPresSessions(data);
    }
    setIsLoadingPres(false);
  };

  // Cargar items filtrados por presentación
  const loadPresentationItems = async () => {
    setIsLoadingPres(true);
    let query = supabase.from('presentation_items').select('*');
    
    if (selectedPresId !== 'all') {
      query = query.eq('session_id', selectedPresId);
    }
    
    const { data, error } = await query.order('departed_at', { ascending: false });
    
    if (!error && data) {
      setPresItems(data);
    }
    setIsLoadingPres(false);
  };

  useEffect(() => {
    if (activeTab === 'presentaciones') {
      loadPresentationSessions();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'presentaciones') {
      loadPresentationItems();
    }
  }, [activeTab, selectedPresId]);

  // KPIs de la presentación seleccionada
  const presStats = useMemo(() => {
    const total = presItems.length;
    const retornados = presItems.filter(i => i.status === 'retornado').length;
    const pendientes = total - retornados;
    return { total, retornados, pendientes };
  }, [presItems]);

  const handleExportPresPDF = async () => {
    if (presItems.length === 0) return;

    const doc = new jsPDF();
    const activePresSession = presSessions.find(s => s.id === selectedPresId);
    const eventLabel = activePresSession ? activePresSession.name : "TODAS LAS PRESENTACIONES";
    const fileName = `reporte_presentacion_${eventLabel.replace(/\s+/g, '_').toLowerCase()}.pdf`;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 216, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE PRESENTACIÓN EXTERNA', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Evento: ${eventLabel.toUpperCase()}`, 14, 24);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(`Orquesta Sinfónica William Taylor • Generado el ${new Date().toLocaleDateString()}`, 14, 32);

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Resumen de Presentación:`, 14, 50);
    doc.setFontSize(10);
    doc.text(`• Total Instrumentos: ${presStats.total}`, 14, 58);
    doc.text(`• Instrumentos devueltos: ${presStats.retornados}`, 14, 64);
    doc.text(`• Instrumentos pendientes: ${presStats.pendientes}`, 14, 70);

    const tableData = presItems.map(rec => {
      const parentSession = presSessions.find(s => s.id === rec.session_id);
      return [
        parentSession?.date || '—',
        parentSession?.name || '—',
        rec.instrument_name,
        `${rec.marca} ${rec.modelo}`.trim() || '—',
        rec.serie || 'NS',
        rec.estudiante,
        rec.status === 'retornado' ? '✅ RETORNADO' : '❌ PENDIENTE'
      ];
    });

    autoTable(doc, {
      startY: 78,
      head: [['Fecha', 'Presentación', 'Instrumento', 'Marca/Modelo', 'Nº Serie', 'Estudiante', 'Estado']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 2.5 }
    });

    doc.save(fileName);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── BOTONES DE PESTAÑAS SEPARADAS ── */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-900 max-w-md">
        <button
          onClick={() => setActiveTab('hogares')}
          className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            activeTab === 'hogares'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Préstamos a Hogares
        </button>
        <button
          onClick={() => setActiveTab('presentaciones')}
          className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            activeTab === 'presentaciones'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <Compass className="w-4 h-4" /> Historial de Presentaciones
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN 1: PRÉSTAMOS A HOGARES                           */}
      {/* ======================================================== */}
      {activeTab === 'hogares' && (
        <>
          {/* Header Reporte */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800">
            <div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-1 flex items-center gap-3">
                <History className="text-indigo-500 w-8 h-8" /> Reporte de Movimientos
              </h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Resumen detallado de préstamos y retornos en el hogar</p>
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
        </>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN 2: HISTORIAL DE PRESENTACIONES                   */}
      {/* ======================================================== */}
      {activeTab === 'presentaciones' && (
        <>
          {/* Header Reporte */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800">
            <div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-1 flex items-center gap-3">
                <Compass className="text-indigo-500 w-8 h-8" /> Historial de Presentaciones
              </h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Registros e informes de conciertos y salidas grupales</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedPresId}
                onChange={(e) => setSelectedPresId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:border-indigo-500"
              >
                <option value="all">Todas las presentaciones</option>
                {presSessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} ({session.date})
                  </option>
                ))}
              </select>

              <button
                onClick={handleExportPresPDF}
                disabled={presItems.length === 0}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 px-6 py-3.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all text-white shadow-lg shadow-indigo-600/20"
              >
                <FileText className="w-4 h-4" /> Exportar PDF
              </button>
            </div>
          </div>

          {/* KPI Cards de Presentaciones */}
          {isLoadingPres ? (
            <div className="bg-slate-900/20 border border-slate-900 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Consultando base de datos...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2rem]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl"><TrendingUp className="w-6 h-6 text-indigo-400" /></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Sacados</span>
                  </div>
                  <p className="text-4xl font-black text-white">{presStats.total}</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2rem]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl"><CheckCircle className="w-6 h-6 text-emerald-400" /></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Devueltos a Sala</span>
                  </div>
                  <p className="text-4xl font-black text-white">{presStats.retornados}</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2rem]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-rose-500/10 rounded-xl"><ArrowUpRight className="w-6 h-6 text-rose-400" /></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pendientes</span>
                  </div>
                  <p className="text-4xl font-black text-white text-rose-500">{presStats.pendientes}</p>
                </div>
              </div>

              {/* Tabla de Presentaciones */}
              <div className="bg-slate-900/20 border border-slate-900 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-slate-800">
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Fecha</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Presentación</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Instrumento</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Estudiante</th>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/50">
                      {presItems.length > 0 ? presItems.map((rec, i) => {
                        const parentSession = presSessions.find(s => s.id === rec.session_id);
                        return (
                          <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                            <td className="px-8 py-6 text-xs font-bold text-slate-400">
                              {parentSession?.date || '—'}
                            </td>
                            <td className="px-8 py-6 text-xs font-black text-white uppercase truncate max-w-[200px]">
                              {parentSession?.name || '—'}
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-white uppercase italic">{rec.instrument_name}</span>
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{rec.marca} {rec.modelo} - S/N: {rec.serie || 'NS'}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-200 uppercase">{rec.estudiante}</span>
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{rec.curso}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              {rec.status === 'retornado' ? (
                                <span className="inline-flex items-center justify-center text-[9px] font-black text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full leading-none whitespace-nowrap">✅ Retornado</span>
                              ) : (
                                <span className="inline-flex items-center justify-center text-[9px] font-black text-rose-500 uppercase px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full leading-none whitespace-nowrap font-black animate-pulse">🔴 Fuera</span>
                              )}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-20">
                              <FilterX className="w-12 h-12 text-slate-500" />
                              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sin registros de presentaciones</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

    </div>
  );
};

export default ReportsView;
