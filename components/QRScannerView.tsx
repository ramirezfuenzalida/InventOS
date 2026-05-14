
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Scan, CheckCircle, XCircle, AlertTriangle, Music, User, RotateCcw, Printer, X, Camera, List, Search, Package, Save, FolderOpen, Trash2, Clock, Calendar, Cloud, CloudOff, Loader2, FileDown } from 'lucide-react';
import QRCodeLib from 'qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem } from '../types.ts';
import { globalNormalize, getEstadoCategoria, isItemLoaned } from '../utils.ts';
import { supabase } from '../supabaseClient.ts';

/** Reproduce un sonido de beep usando Web Audio API */
const playScanSound = (success: boolean) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      // Beep agudo corto — éxito
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } else {
      // Buzz grave — error
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // Web Audio API no disponible — silencioso
  }
};

interface QRScannerViewProps {
  inventory: InventoryItem[];
  onViewInstrument?: (item: InventoryItem) => void;
}

type ScanTab = 'scanner' | 'generate' | 'control';

/** Genera el texto del QR para un instrumento */
const buildQRText = (item: InventoryItem): string => {
  return `OSWT|${item.id}|${item.Serie || 'NS'}|${item.Instrumento}`;
};

/** Parsea un QR escaneado */
const parseQRText = (text: string): { id: string; serie: string; instrumento: string } | null => {
  // Formato: OSWT|id|serie|instrumento
  const parts = text.split('|');
  if (parts.length >= 3 && parts[0] === 'OSWT') {
    return { id: parts[1], serie: parts[2], instrumento: parts[3] || '' };
  }
  // Fallback: si no tiene formato OSWT, buscar por texto directo (serie o nombre)
  return { id: '', serie: text.trim(), instrumento: text.trim() };
};

const STORAGE_KEY = 'oswt_active_session';

interface ScanSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  scannedIds: string[];
  totalAtCreation: number;
}

const QRScannerView: React.FC<QRScannerViewProps> = ({ inventory, onViewInstrument }) => {
  const [activeTab, setActiveTab] = useState<ScanTab>('scanner');
  const [scanResult, setScanResult] = useState<{ found: boolean; item?: InventoryItem; raw: string } | null>(null);
  const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── SESIONES PERSISTENTES EN SUPABASE ──
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [controlListFilter, setControlListFilter] = useState<'missing' | 'scanned'>('missing');
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar sesiones desde Supabase al montar
  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoadingSessions(true);
      const { data, error } = await supabase
        .from('scan_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        const mapped: ScanSession[] = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          scannedIds: row.scanned_ids || [],
          totalAtCreation: row.total_at_creation || 0,
        }));
        setSessions(mapped);

        // Restaurar sesión activa desde localStorage (solo el ID activo se guarda local)
        const lastActive = localStorage.getItem(STORAGE_KEY);
        if (lastActive) {
          const session = mapped.find(s => s.id === lastActive);
          if (session) {
            setActiveSessionId(session.id);
            setScannedIds(new Set(session.scannedIds));
          }
        }
      }
      setIsLoadingSessions(false);
    };
    fetchSessions();
  }, []);

  // Auto-guardar en Supabase con debounce de 1s
  useEffect(() => {
    if (!activeSessionId || scannedIds.size === 0) return;

    // Actualizar estado local inmediatamente
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, scannedIds: Array.from(scannedIds), updatedAt: new Date().toISOString() };
      }
      return s;
    }));

    // Debounce la escritura a Supabase
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      await supabase
        .from('scan_sessions')
        .update({
          scanned_ids: Array.from(scannedIds),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeSessionId);
      setIsSaving(false);
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [scannedIds, activeSessionId]);

  const createSession = async (name?: string) => {
    const now = new Date();
    const sessionId = `session_${now.getTime()}`;
    const sessionLabel = name || `Inventario ${now.toLocaleDateString('es-CL')}`;

    const { error } = await supabase.from('scan_sessions').insert({
      id: sessionId,
      name: sessionLabel,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      scanned_ids: [],
      total_at_creation: inventory.length,
    });

    if (!error) {
      const newSession: ScanSession = {
        id: sessionId,
        name: sessionLabel,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        scannedIds: [],
        totalAtCreation: inventory.length,
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(sessionId);
      setScannedIds(new Set());
      localStorage.setItem(STORAGE_KEY, sessionId);
      setShowSessionManager(false);
      setSessionName('');
    }
  };

  const resumeSession = async (session: ScanSession) => {
    // Recargar datos frescos de Supabase para tener la última versión
    const { data } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('id', session.id)
      .single();

    if (data) {
      const freshIds = data.scanned_ids || [];
      setActiveSessionId(session.id);
      setScannedIds(new Set(freshIds));
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, scannedIds: freshIds, updatedAt: data.updated_at } : s));
    } else {
      setActiveSessionId(session.id);
      setScannedIds(new Set(session.scannedIds));
    }
    localStorage.setItem(STORAGE_KEY, session.id);
    setShowSessionManager(false);
  };

  const deleteSession = async (sessionId: string) => {
    await supabase.from('scan_sessions').delete().eq('id', sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setScannedIds(new Set());
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // ── ESCÁNER con html5-qrcode ──
  const startScanner = useCallback(async () => {
    setCameraError(null);
    setScanResult(null);
    setIsScanning(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      // Limpiar instancia anterior
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch(e) {}
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          // QR detectado
          handleScanResult(decodedText);
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          setIsScanning(false);
        },
        () => {} // error silencioso por cada frame sin QR
      );
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.message || 'No se pudo acceder a la cámara');
      setIsScanning(false);
    }
  }, [inventory]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch(e) {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleScanResult = (rawText: string) => {
    const parsed = parseQRText(rawText);
    if (!parsed) {
      setScanResult({ found: false, raw: rawText });
      return;
    }

    // Buscar en inventario por ID, Serie, o nombre
    const found = inventory.find(item => {
      if (parsed.id && String(item.id) === parsed.id) return true;
      if (parsed.serie && parsed.serie !== 'NS') {
        if (globalNormalize(item.Serie) === globalNormalize(parsed.serie)) return true;
      }
      if (parsed.instrumento && globalNormalize(item.Instrumento) === globalNormalize(parsed.instrumento)) return true;
      return false;
    });

    if (found) {
      setScanResult({ found: true, item: found, raw: rawText });
      setScannedIds(prev => new Set(prev).add(String(found.id)));
      playScanSound(true);
    } else {
      setScanResult({ found: false, raw: rawText });
      playScanSound(false);
    }
  };

  /** Genera PDF del inventario completado */
  const generateInventoryPDF = () => {
    const doc = new jsPDF('p', 'mm', 'letter');
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    // ── Encabezado ──
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 216, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INVENTARIO FÍSICO — OSWT', 15, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Orquesta Sinfónica William Taylor`, 15, 26);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(9);
    doc.text(`Fecha: ${dateStr} • Hora: ${timeStr}`, 15, 34);
    if (activeSession) {
      doc.text(`Sesión: ${activeSession.name}`, 130, 34);
    }

    // ── Resumen ──
    const yStart = 50;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN', 15, yStart);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Total instrumentos: ${controlStats.total}`, 15, yStart + 8);
    doc.text(`Verificados (presentes): ${controlStats.scanned.length}`, 15, yStart + 14);
    doc.text(`No verificados: ${controlStats.missing.length}`, 15, yStart + 20);

    const percent = controlStats.total > 0 ? Math.round((controlStats.scanned.length / controlStats.total) * 100) : 0;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(percent === 100 ? 34 : 220, percent === 100 ? 197 : 38, percent === 100 ? 94 : 38);
    doc.text(`Completado: ${percent}%`, 130, yStart + 8);

    // ── Tabla de instrumentos verificados ──
    const tableY = yStart + 30;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTRUMENTOS VERIFICADOS EN SALA', 15, tableY);

    const tableData = controlStats.scanned.map((item, idx) => [
      String(idx + 1),
      item.Instrumento || '—',
      item.Marca || '—',
      item.Modelo || '—',
      item.Serie || '—',
      item.Estado || '—',
      item.Estudiante ? `${item.Estudiante} ${item.Curso ? `(${item.Curso})` : ''}` : 'Sin asignar',
    ]);

    autoTable(doc, {
      startY: tableY + 4,
      head: [['#', 'Instrumento', 'Marca', 'Modelo', 'Serie', 'Estado', 'Estudiante']],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 30 },
        4: { cellWidth: 25 },
      },
      margin: { left: 15, right: 15 },
    });

    // ── Si hay faltantes, agregar tabla ──
    if (controlStats.missing.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      if (finalY > 240) doc.addPage();
      const missingY = finalY > 240 ? 20 : finalY + 12;

      doc.setTextColor(220, 38, 38);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`INSTRUMENTOS NO VERIFICADOS (${controlStats.missing.length})`, 15, missingY);

      const missingData = controlStats.missing.map((item, idx) => [
        String(idx + 1),
        item.Instrumento || '—',
        item.Marca || '—',
        item.Modelo || '—',
        item.Serie || '—',
        item.Estudiante ? `${item.Estudiante} ${item.Curso ? `(${item.Curso})` : ''}` : 'Sin asignar',
        isItemLoaned(item) ? 'HOGAR' : 'SALA',
      ]);

      autoTable(doc, {
        startY: missingY + 4,
        head: [['#', 'Instrumento', 'Marca', 'Modelo', 'Serie', 'Estudiante', 'Ubic.']],
        body: missingData,
        styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 30 },
        },
        margin: { left: 15, right: 15 },
      });
    }

    // ── Pie de página ──
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`OSWT App — Inventario Físico — Página ${i}/${pageCount}`, 15, 272);
      doc.text(`Generado: ${dateStr} ${timeStr}`, 150, 272);
    }

    doc.save(`Inventario_OSWT_${now.toISOString().slice(0, 10)}.pdf`);
  };

  // ── GENERADOR DE QR ──
  const [qrImages, setQrImages] = useState<Map<string, string>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQRCodes = async () => {
    setIsGenerating(true);
    const newImages = new Map<string, string>();

    for (const item of inventory) {
      try {
        const text = buildQRText(item);
        const dataUrl = await QRCodeLib.toDataURL(text, {
          width: 200,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
        newImages.set(String(item.id), dataUrl);
      } catch (err) {
        console.error('QR generation error for', item.id, err);
      }
    }

    setQrImages(newImages);
    setIsGenerating(false);
  };

  const printQRCodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labels = inventory.map(item => {
      const qrSrc = qrImages.get(String(item.id)) || '';
      return `
        <div style="display:inline-block;width:180px;padding:8px;margin:4px;border:1px solid #ccc;text-align:center;page-break-inside:avoid;font-family:system-ui">
          ${qrSrc ? `<img src="${qrSrc}" style="width:120px;height:120px" />` : '<div style="width:120px;height:120px;background:#eee;margin:0 auto"></div>'}
          <div style="font-size:9px;font-weight:900;text-transform:uppercase;margin-top:4px;line-height:1.2">
            ${item.Instrumento || 'S/N'}
          </div>
          <div style="font-size:7px;color:#666;text-transform:uppercase">${item.Marca || ''} ${item.Modelo || ''}</div>
          <div style="font-size:7px;color:#999">S/N: ${item.Serie || '—'}</div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html><head><title>Etiquetas QR - OSWT</title>
      <style>@media print { body { margin: 0; } }</style></head>
      <body style="padding:10px">${labels}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // ── CONTROL DE PRESENCIA ──
  const controlStats = useMemo(() => {
    const scanned = inventory.filter(i => scannedIds.has(String(i.id)));
    const missing = inventory.filter(i => !scannedIds.has(String(i.id)));
    return { scanned, missing, total: inventory.length };
  }, [inventory, scannedIds]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8 animate-in fade-in duration-700">
      {/* Tabs */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl sm:rounded-[2rem] p-1.5 sm:p-2 flex gap-1.5 sm:gap-2">
        {[
          { id: 'scanner' as ScanTab, label: 'Escáner', icon: Scan },
          { id: 'control' as ScanTab, label: 'Control', icon: Package, badge: scannedIds.size > 0 ? `${scannedIds.size}/${inventory.length}` : undefined },
          { id: 'generate' as ScanTab, label: 'Etiquetas', icon: Printer },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id !== 'scanner') stopScanner(); }}
            className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && (
              <span className="bg-white/20 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Banner de sesión activa */}
      {activeSession && (
        <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${isSaving ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
            {isSaving
              ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-spin" />
              : <Cloud className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold uppercase truncate">{activeSession.name}</p>
            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">
              {controlStats.scanned.length}/{controlStats.total} • {isSaving ? 'Guardando...' : '☁️ Sincronizado'}
            </p>
          </div>
          <button
            onClick={() => setShowSessionManager(true)}
            className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 px-3 py-2 rounded-xl hover:bg-indigo-600/10 transition-all flex-shrink-0"
          >
            Sesiones
          </button>
        </div>
      )}

      {/* Cargando sesiones */}
      {isLoadingSessions && !activeSession && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl sm:rounded-[3rem] p-8 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Cargando sesiones...</p>
        </div>
      )}

      {/* Si no hay sesión activa, mostrar selector */}
      {!activeSession && !isLoadingSessions && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl sm:rounded-[3rem] p-5 sm:p-8 md:p-12 space-y-5 sm:space-y-6">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tighter mb-2">
              Iniciar <span className="text-indigo-500">Sesión de Control</span>
            </h2>
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
              Crea una sesión nueva o continúa una anterior
            </p>
          </div>

          {/* Crear nueva */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder={`Inventario ${new Date().toLocaleDateString('es-CL')}`}
              className="flex-1 bg-[#020617] border-2 border-slate-900 focus:border-indigo-500 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-white font-bold text-sm outline-none transition-all"
            />
            <button
              onClick={() => createSession(sessionName || undefined)}
              className="bg-indigo-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs text-white uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Nueva Sesión
            </button>
          </div>

          {/* Sesiones guardadas */}
          {sessions.length > 0 && (
            <div className="space-y-3">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Sesiones guardadas</p>
              {sessions.map(session => (
                <div
                  key={session.id}
                  className="bg-[#020617] border border-white/5 p-4 sm:p-5 rounded-xl sm:rounded-2xl space-y-3 hover:border-indigo-500/20 transition-all group"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600/10 rounded-lg sm:rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-base sm:text-lg font-black text-indigo-400 leading-none">{session.scannedIds.length}</span>
                      <span className="text-[7px] font-black text-indigo-600">/{session.totalAtCreation}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs sm:text-sm font-bold uppercase truncate">{session.name}</p>
                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" /> {formatDate(session.createdAt)}
                      </span>
                    </div>
                  </div>
                  {/* Mini barra de progreso */}
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full"
                      style={{ width: `${session.totalAtCreation > 0 ? (session.scannedIds.length / session.totalAtCreation) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resumeSession(session)}
                      className="flex-1 bg-emerald-600 px-4 py-2.5 rounded-lg sm:rounded-xl font-black text-[9px] text-white uppercase tracking-widest hover:bg-emerald-500 transition-all text-center"
                    >
                      Continuar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar sesión "${session.name}"? Esta acción no se puede deshacer.`)) {
                          deleteSession(session.id);
                        }
                      }}
                      className="px-4 py-2.5 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ESCÁNER ── */}
      {activeTab === 'scanner' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl sm:rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="p-5 sm:p-8 md:p-12 space-y-5 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tighter mb-2">
                Verificar <span className="text-indigo-500">Instrumento</span>
              </h2>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
                Escanea el código QR pegado en el instrumento
              </p>
            </div>

            {/* Visor de cámara */}
            <div className="relative rounded-xl sm:rounded-[2rem] overflow-hidden bg-slate-950 border-2 border-slate-800">
              <div id="qr-reader" className="w-full" style={{ minHeight: '260px' }} />

              {!isScanning && !scanResult && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                  <div className="w-24 h-24 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center border border-indigo-500/20">
                    <Camera className="w-12 h-12 text-indigo-500" />
                  </div>
                  <button
                    onClick={startScanner}
                    className="bg-indigo-600 px-10 py-5 rounded-[2rem] font-black text-sm text-white uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
                  >
                    <Scan className="w-5 h-5" /> INICIAR ESCÁNER
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90">
                  <AlertTriangle className="w-10 h-10 text-rose-500" />
                  <p className="text-rose-400 text-xs font-bold uppercase text-center px-8">{cameraError}</p>
                  <button
                    onClick={startScanner}
                    className="bg-indigo-600 px-8 py-3 rounded-xl font-black text-xs text-white uppercase tracking-widest"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>

            {/* Resultado del escaneo */}
            {scanResult && (
              <div className={`p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border-2 animate-in zoom-in-95 duration-300 ${
                scanResult.found
                  ? 'bg-emerald-600/5 border-emerald-500/20'
                  : 'bg-rose-600/5 border-rose-500/20'
              }`}>
                <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center flex-shrink-0 ${
                    scanResult.found ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                  }`}>
                    {scanResult.found
                      ? <CheckCircle className="w-8 h-8 text-emerald-500" />
                      : <XCircle className="w-8 h-8 text-rose-500" />
                    }
                  </div>
                  <div>
                    <h3 className={`text-lg sm:text-2xl font-black uppercase italic tracking-tighter ${
                      scanResult.found ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {scanResult.found ? '✅ EN INVENTARIO' : '❌ NO ENCONTRADO'}
                    </h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                      {scanResult.found ? 'Este instrumento está registrado' : 'Este código no coincide con ningún instrumento'}
                    </p>
                  </div>
                </div>

                {scanResult.found && scanResult.item && (
                  <div className="bg-[#020617] p-4 sm:p-6 rounded-xl sm:rounded-[2rem] border border-white/5 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Instrumento</p>
                        <p className="text-white font-bold text-sm uppercase">{scanResult.item.Instrumento}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Marca / Modelo</p>
                        <p className="text-white font-bold text-sm uppercase">{scanResult.item.Marca} {scanResult.item.Modelo}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Estudiante</p>
                        <p className="text-white font-bold text-sm uppercase">{scanResult.item.Estudiante || 'SIN ASIGNAR'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Estado</p>
                        <p className={`font-bold text-sm uppercase ${
                          getEstadoCategoria(scanResult.item.Estado) === 'BUENO' ? 'text-emerald-500' :
                          getEstadoCategoria(scanResult.item.Estado) === 'REGULAR' ? 'text-amber-500' : 'text-rose-500'
                        }`}>{scanResult.item.Estado}</p>
                      </div>
                    </div>

                    {onViewInstrument && (
                      <button
                        onClick={() => onViewInstrument(scanResult.item!)}
                        className="w-full mt-4 bg-indigo-600/10 border border-indigo-500/20 py-3 rounded-xl text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600/20 transition-all"
                      >
                        Ver Ficha Completa →
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => { setScanResult(null); startScanner(); }}
                    className="flex-1 py-4 sm:py-5 rounded-xl sm:rounded-[2rem] font-black text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <Scan className="w-4 h-4" /> ESCANEAR OTRO
                  </button>
                </div>
              </div>
            )}

            {/* Input manual como fallback */}
            <div className="border-t border-slate-800 pt-6">
              <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.3em] text-center mb-4">
                O ingresa el número de serie manualmente
              </p>
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-700" />
                <input
                  type="text"
                  className="w-full bg-[#020617] border-2 border-slate-900 focus:border-indigo-500 rounded-[2rem] py-5 pl-14 pr-6 text-white font-bold uppercase outline-none transition-all"
                  placeholder="Serie, marca o nombre..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleScanResult((e.target as HTMLInputElement).value);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: CONTROL DE PRESENCIA ── */}
      {activeTab === 'control' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl sm:rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="p-5 sm:p-8 md:p-12 space-y-5 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tighter mb-2">
                Control de <span className="text-indigo-500">Presencia</span>
              </h2>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
                Escanea instrumentos para verificar cuáles están presentes
              </p>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-[#020617] p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-white/5 text-center">
                <p className="text-2xl sm:text-3xl font-black text-white">{controlStats.total}</p>
                <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest">Total</p>
              </div>
              <div className="bg-emerald-600/5 p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-emerald-500/20 text-center">
                <p className="text-2xl sm:text-3xl font-black text-emerald-500">{controlStats.scanned.length}</p>
                <p className="text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase tracking-widest">Verificados</p>
              </div>
              <div className="bg-rose-600/5 p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-rose-500/20 text-center">
                <p className="text-2xl sm:text-3xl font-black text-rose-500">{controlStats.missing.length}</p>
                <p className="text-[8px] sm:text-[9px] font-black text-rose-600 uppercase tracking-widest">Faltan</p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="bg-[#020617] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progreso</span>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  {controlStats.total > 0 ? Math.round((controlStats.scanned.length / controlStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${controlStats.total > 0 ? (controlStats.scanned.length / controlStats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => { setActiveTab('scanner'); startScanner(); }}
                className="flex-1 py-4 sm:py-5 rounded-xl sm:rounded-[2rem] font-black text-[10px] sm:text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <Scan className="w-4 h-4" /> Escanear
              </button>
              <button
                onClick={() => setShowSessionManager(true)}
                className="py-4 sm:py-5 px-4 sm:px-6 rounded-xl sm:rounded-[2rem] font-black text-[10px] sm:text-xs uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all border border-white/5 flex items-center gap-1.5 sm:gap-2"
              >
                <FolderOpen className="w-4 h-4" /> <span className="hidden sm:inline">Sesiones</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('¿Reiniciar esta sesión? Se perderán todos los escaneos de esta sesión.')) {
                    setScannedIds(new Set());
                  }
                }}
                className="py-4 sm:py-5 px-4 sm:px-6 rounded-xl sm:rounded-[2rem] font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all border border-white/5 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Botón Exportar PDF — visible siempre, activo al finalizar */}
            <button
              onClick={generateInventoryPDF}
              disabled={controlStats.missing.length > 0 || controlStats.total === 0}
              className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-[2rem] font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                controlStats.missing.length === 0 && controlStats.total > 0
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 animate-pulse'
                  : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <FileDown className="w-4 h-4" />
              {controlStats.missing.length === 0 && controlStats.total > 0
                ? `✅ Inventario Completo — Exportar PDF (${controlStats.total}/${controlStats.total})`
                : `Exportar PDF (Faltan ${controlStats.missing.length})`
              }
            </button>

            {/* Listas de Instrumentos */}
            {controlStats.total > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex bg-[#020617] p-1 rounded-xl sm:rounded-2xl border border-white/5">
                  <button
                    onClick={() => setControlListFilter('missing')}
                    className={`flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                      controlListFilter === 'missing'
                        ? 'bg-rose-500/10 text-rose-500 shadow-lg'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Faltan ({controlStats.missing.length})
                  </button>
                  <button
                    onClick={() => setControlListFilter('scanned')}
                    className={`flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                      controlListFilter === 'scanned'
                        ? 'bg-emerald-500/10 text-emerald-500 shadow-lg'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Verificados ({controlStats.scanned.length})
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-2 custom-scrollbar">
                  {(controlListFilter === 'missing' ? controlStats.missing : controlStats.scanned).map(item => (
                    <div
                      key={String(item.id)}
                      className={`bg-slate-900/60 border p-3 sm:p-4 rounded-lg sm:rounded-xl flex items-center gap-3 sm:gap-4 cursor-pointer transition-all ${
                        controlListFilter === 'missing'
                          ? 'border-rose-500/10 hover:bg-rose-500/5'
                          : 'border-emerald-500/10 hover:bg-emerald-500/5'
                      }`}
                      onClick={() => onViewInstrument?.(item)}
                    >
                      {controlListFilter === 'missing' 
                        ? <AlertTriangle className="w-5 h-5 text-rose-500/50 flex-shrink-0" />
                        : <CheckCircle className="w-5 h-5 text-emerald-500/50 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-black uppercase truncate tracking-tight">{item.Instrumento} — {item.Marca} {item.Modelo}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${item.Estudiante ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                            <User className="w-2.5 h-2.5" />
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              {item.Estudiante ? `${item.Estudiante} ${item.Curso ? `(${item.Curso})` : ''}` : 'SALA / DISPONIBLE'}
                            </span>
                          </div>
                          <span className="text-slate-800 text-[10px]">•</span>
                          <span className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">
                            S/N: {item.Serie || '—'}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                        isItemLoaned(item) ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isItemLoaned(item) ? 'HOGAR' : 'SALA'}
                      </span>
                    </div>
                  ))}
                  
                  {controlListFilter === 'missing' && controlStats.missing.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-emerald-500/20 mx-auto mb-3" />
                      <p className="text-emerald-500/50 text-xs font-black uppercase tracking-widest">¡Inventario completo!</p>
                    </div>
                  )}
                  {controlListFilter === 'scanned' && controlStats.scanned.length === 0 && (
                    <div className="text-center py-8">
                      <Scan className="w-12 h-12 text-slate-500/20 mx-auto mb-3" />
                      <p className="text-slate-500/50 text-xs font-black uppercase tracking-widest">Aún no hay escaneos</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: GENERAR ETIQUETAS QR ── */}
      {activeTab === 'generate' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl sm:rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="p-5 sm:p-8 md:p-12 space-y-5 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tighter mb-2">
                Etiquetas <span className="text-indigo-500">QR</span>
              </h2>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
                Genera e imprime QR para pegar en cada instrumento
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={generateQRCodes}
                disabled={isGenerating}
                className="flex-1 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <><span className="animate-spin">⏳</span> Generando...</>
                ) : (
                  <><Scan className="w-4 h-4" /> Generar {inventory.length} QR</>
                )}
              </button>
              {qrImages.size > 0 && (
                <button
                  onClick={printQRCodes}
                  className="py-5 px-8 rounded-[2rem] font-black text-xs uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              )}
            </div>

            {/* Preview de QR generados */}
            {qrImages.size > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                {inventory.map(item => {
                  const qrSrc = qrImages.get(String(item.id));
                  if (!qrSrc) return null;
                  return (
                    <div key={String(item.id)} className="bg-white p-3 rounded-xl text-center">
                      <img src={qrSrc} alt={`QR ${item.Instrumento}`} className="w-full aspect-square object-contain" />
                      <p className="text-[9px] font-black text-slate-900 uppercase mt-1 truncate">{item.Instrumento}</p>
                      <p className="text-[7px] font-bold text-slate-500 uppercase truncate">{item.Marca} {item.Modelo}</p>
                      <p className="text-[7px] text-slate-400">S/N: {item.Serie || '—'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScannerView;
