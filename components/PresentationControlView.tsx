import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Scan, CheckCircle, XCircle, AlertTriangle, Calendar, Save, Trash2, 
  Loader2, Camera, Search, FileDown, ArrowLeft, Plus, History, 
  MapPin, User, Compass, ArrowLeftRight, Check, AlertCircle, Edit3, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem } from '../types.ts';
import { globalNormalize } from '../utils.ts';
import { supabase } from '../supabaseClient.ts';

// Web Audio API beep sound
const playScanSound = (success: boolean) => {
  try {
    const ctx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
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
    // Audio Context no disponible
  }
};

interface PresentationControlViewProps {
  inventory: InventoryItem[];
  onViewInstrument?: (item: InventoryItem) => void;
}

interface PresentationSession {
  id: string;
  name: string;
  date: string;
  lugar?: string;
  status: 'activa' | 'completada';
  created_at: string;
  updated_at: string;
}

interface PresentationItem {
  id: string;
  session_id: string;
  instrument_id: string;
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

const parseQRText = (text: string): { id: string; serie: string; instrumento: string } | null => {
  const parts = text.split('|');
  if (parts.length >= 3 && parts[0] === 'OSWT') {
    return { id: parts[1], serie: parts[2], instrumento: parts[3] || '' };
  }
  return { id: '', serie: text.trim(), instrumento: text.trim() };
};

// Clasificador de instrumentos en base a Nombre y Familia
const getInstrumentCategory = (itemName: string, familyName: string): string => {
  const s = globalNormalize(itemName);
  const fam = globalNormalize(familyName);
  
  if (s.includes('violin') || fam.includes('violin')) return 'VIOLINES';
  if (s.includes('viola') || fam.includes('viola')) return 'VIOLAS';
  if (s.includes('cello') || s.includes('violonchel') || fam.includes('cello')) return 'CELLOS';
  if (s.includes('contrabajo') || fam.includes('contrabajo')) return 'CONTRABAJOS';
  
  if (s.includes('corno') || s.includes('trompeta') || s.includes('trombon') || s.includes('tuba') || s.includes('eufonio') || fam.includes('bronce') || fam.includes('metal')) {
    return 'VIENTOS METALES';
  }
  
  if (s.includes('clarinete') || s.includes('flauta') || s.includes('oboe') || s.includes('fagot') || s.includes('piccolo') || s.includes('saxo') || fam.includes('madera')) {
    return 'VIENTOS MADERAS';
  }
  
  if (s.includes('percusion') || s.includes('timpani') || s.includes('bateria') || s.includes('bombo') || s.includes('tambor') || s.includes('platillo') || fam.includes('percusion')) {
    return 'PERCUSIÓN';
  }
  
  return 'OTROS';
};

const PresentationControlView: React.FC<PresentationControlViewProps> = ({ inventory, onViewInstrument }) => {
  const [sessions, setSessions] = useState<PresentationSession[]>([]);
  const [activeSession, setActiveSession] = useState<PresentationSession | null>(null);
  const [sessionItems, setSessionItems] = useState<PresentationItem[]>([]);
  
  // Control States
  const [scanMode, setScanMode] = useState<'salida' | 'retorno'>('salida');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ found: boolean; success: boolean; message: string; item?: any } | null>(null);
  
  // Modales/UI
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventLugar, setNewEventLugar] = useState('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [manualInput, setManualInput] = useState('');

  // Estados de edición del estudiante responsable
  const [editingItem, setEditingItem] = useState<PresentationItem | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editCurso, setEditCurso] = useState('');

  // Filtro por Familias
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('TODOS');

  const scannerRef = useRef<any>(null);

  // Cargar sesiones
  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    const { data, error } = await supabase
      .from('presentation_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSessions(data);
    }
    setIsLoadingSessions(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Cargar items de la sesión activa
  const fetchSessionItems = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('presentation_items')
      .select('*')
      .eq('session_id', sessionId)
      .order('departed_at', { ascending: false });

    if (!error && data) {
      setSessionItems(data);
    }
  };

  useEffect(() => {
    if (activeSession) {
      fetchSessionItems(activeSession.id);
      
      // Suscribirse a cambios en tiempo real para presentation_items
      const itemsChannel = supabase.channel(`realtime:presentation_items:${activeSession.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'presentation_items', 
          filter: `session_id=eq.${activeSession.id}` 
        }, () => {
          fetchSessionItems(activeSession.id);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(itemsChannel);
      };
    } else {
      setSessionItems([]);
    }
  }, [activeSession]);

  // Helper para obtener la categoría/familia de un item
  const getItemFamily = useCallback((item: PresentationItem) => {
    const invMatch = inventory.find(i => String(i.id) === String(item.instrument_id));
    return getInstrumentCategory(item.instrument_name, invMatch?.Familia || '');
  }, [inventory]);

  // Listas filtradas en base a la pestaña de familia activa
  const pendingItems = useMemo(() => {
    const base = sessionItems.filter(i => i.status === 'fuera');
    if (selectedFamilyFilter === 'TODOS') return base;
    return base.filter(i => getItemFamily(i) === selectedFamilyFilter);
  }, [sessionItems, selectedFamilyFilter, getItemFamily]);

  const returnedItems = useMemo(() => {
    const base = sessionItems.filter(i => i.status === 'retornado');
    if (selectedFamilyFilter === 'TODOS') return base;
    return base.filter(i => getItemFamily(i) === selectedFamilyFilter);
  }, [sessionItems, selectedFamilyFilter, getItemFamily]);

  // Cantidad total e instrumentos por familia para las pestañas de filtro
  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {
      TODOS: sessionItems.length,
      VIOLINES: 0,
      VIOLAS: 0,
      CELLOS: 0,
      CONTRABAJOS: 0,
      'VIENTOS METALES': 0,
      'VIENTOS MADERAS': 0,
      'PERCUSIÓN': 0,
      OTROS: 0
    };
    sessionItems.forEach(item => {
      const cat = getItemFamily(item);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts.OTROS++;
      }
    });
    return counts;
  }, [sessionItems, getItemFamily]);

  // Crear nueva sesión
  const handleCreateSession = async () => {
    if (!newEventName.trim()) {
      alert("Por favor ingresa un nombre para la presentación.");
      return;
    }
    
    setIsProcessingAction(true);
    const newSessionId = `pres_${Date.now()}`;
    const newSession = {
      id: newSessionId,
      name: newEventName.trim(),
      date: newEventDate,
      lugar: newEventLugar.trim() || 'No especificado',
      status: 'activa' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('presentation_sessions')
      .insert(newSession);

    setIsProcessingAction(false);
    if (!error) {
      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession);
      setShowCreateModal(false);
      setNewEventName('');
      setNewEventLugar('');
    } else {
      alert(`Error al crear la sesión: ${error.message}`);
    }
  };

  // Finalizar / Completar Sesión
  const handleCompleteSession = async () => {
    if (!activeSession) return;
    
    const pendingCount = sessionItems.filter(i => i.status === 'fuera').length;
    if (pendingCount > 0) {
      alert(`¡No puedes cerrar la presentación aún! Faltan ${pendingCount} instrumentos por retornar. Búscalos e infórmales a sus responsables.`);
      return;
    }

    if (!confirm("¿Estás seguro de finalizar esta presentación? Se marcará como completada y los instrumentos volverán a su flujo normal.")) {
      return;
    }

    setIsProcessingAction(true);
    const { error } = await supabase
      .from('presentation_sessions')
      .update({ status: 'completada', updated_at: new Date().toISOString() })
      .eq('id', activeSession.id);

    setIsProcessingAction(false);
    if (!error) {
      setActiveSession(prev => prev ? { ...prev, status: 'completada' } : null);
      fetchSessions();
    } else {
      alert(`Error al guardar: ${error.message}`);
    }
  };

  // Eliminar Sesión
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar esta presentación? Se borrarán todos los registros asociados de salida y retorno de esta fecha. Esta acción no se puede deshacer.")) {
      return;
    }

    setIsProcessingAction(true);
    
    // Primero restaurar ubicación de instrumentos que estuvieran fuera en esta presentación
    const { data: items } = await supabase
      .from('presentation_items')
      .select('*')
      .eq('session_id', sessionId);
      
    if (items && items.length > 0) {
      for (const item of items) {
        const invMatch = inventory.find(i => String(i.id) === String(item.instrument_id));
        const originalLocation = invMatch?.Prestado === 'SÍ' ? 'HOGAR' : 'SALA DE MÚSICA';
        await supabase.from('inventory')
          .update({ Ubicacion: originalLocation })
          .eq('id', item.instrument_id);
      }
    }

    const { error } = await supabase
      .from('presentation_sessions')
      .delete()
      .eq('id', sessionId);

    setIsProcessingAction(false);
    if (!error) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
    } else {
      alert(`Error al eliminar: ${error.message}`);
    }
  };

  // Escanear / Procesar Código QR
  const handleProcessScan = async (rawText: string) => {
    if (!activeSession) return;
    
    const parsed = parseQRText(rawText);
    if (!parsed) {
      setScanResult({ found: false, success: false, message: "Código QR ilegible o formato incorrecto." });
      playScanSound(false);
      return;
    }

    // Buscar instrumento en inventario
    const found = inventory.find(item => {
      if (parsed.id && String(item.id) === parsed.id) return true;
      if (parsed.serie && parsed.serie !== 'NS') {
        if (globalNormalize(item.Serie) === globalNormalize(parsed.serie)) return true;
      }
      if (parsed.instrumento && globalNormalize(item.Instrumento) === globalNormalize(parsed.instrumento)) return true;
      return false;
    });

    if (!found) {
      setScanResult({ found: false, success: false, message: `Instrumento no encontrado en el inventario.` });
      playScanSound(false);
      return;
    }

    // Procesar según el Modo
    if (scanMode === 'salida') {
      // Validar si ya está en esta sesión
      const alreadyInSession = sessionItems.find(i => String(i.instrument_id) === String(found.id));
      if (alreadyInSession) {
        setScanResult({ 
          found: true, 
          success: false, 
          message: `El instrumento ya fue registrado para salida en este evento.`,
          item: found
        });
        playScanSound(false);
        return;
      }

      // Validar que tenga un estudiante asignado
      if (!found.Estudiante || found.Estudiante.trim() === '') {
        setScanResult({
          found: true,
          success: false,
          message: `No se puede registrar salida: El instrumento "${found.Instrumento}" no tiene un estudiante asignado en el inventario.`,
          item: found
        });
        playScanSound(false);
        return;
      }

      setIsProcessingAction(true);
      
      const newPresItem = {
        id: `pres_item_${Date.now()}`,
        session_id: activeSession.id,
        instrument_id: found.id,
        instrument_name: found.Instrumento,
        marca: found.Marca || '',
        modelo: found.Modelo || '',
        serie: found.Serie || '',
        estudiante: found.Estudiante,
        curso: found.Curso || '',
        status: 'fuera' as const,
        departed_at: new Date().toISOString(),
        returned_at: null
      };

      // 1. Insertar item
      const { error: insError } = await supabase
        .from('presentation_items')
        .insert(newPresItem);

      if (insError) {
        setIsProcessingAction(false);
        setScanResult({ found: true, success: false, message: `Error al registrar: ${insError.message}` });
        playScanSound(false);
        return;
      }

      // 2. Actualizar ubicación temporal en Inventario General
      const { error: updError } = await supabase
        .from('inventory')
        .update({ Ubicacion: `En Presentación: ${activeSession.name}` })
        .eq('id', found.id);

      setIsProcessingAction(false);
      if (!updError) {
        setScanResult({ 
          found: true, 
          success: true, 
          message: `Salida registrada exitosamente. A cargo de ${found.Estudiante}.`,
          item: found
        });
        playScanSound(true);
      } else {
        setScanResult({ found: true, success: false, message: `Error al actualizar ubicación: ${updError.message}` });
        playScanSound(false);
      }

    } else {
      // MODO: RETORNO
      const itemInSession = sessionItems.find(i => String(i.instrument_id) === String(found.id) && i.status === 'fuera');
      
      if (!itemInSession) {
        const alreadyReturned = sessionItems.find(i => String(i.instrument_id) === String(found.id) && i.status === 'retornado');
        if (alreadyReturned) {
          setScanResult({ 
            found: true, 
            success: false, 
            message: `Este instrumento ya fue retornado con éxito en esta sesión.`,
            item: found
          });
        } else {
          setScanResult({ 
            found: true, 
            success: false, 
            message: `Este instrumento no está registrado en la salida de esta presentación.`,
            item: found
          });
        }
        playScanSound(false);
        return;
      }

      setIsProcessingAction(true);

      // 1. Cambiar estado en presentation_items
      const { error: updItemError } = await supabase
        .from('presentation_items')
        .update({ status: 'retornado', returned_at: new Date().toISOString() })
        .eq('id', itemInSession.id);

      if (updItemError) {
        setIsProcessingAction(false);
        setScanResult({ found: true, success: false, message: `Error al registrar retorno: ${updItemError.message}` });
        playScanSound(false);
        return;
      }

      // 2. Restaurar ubicación en Inventario General
      const originalLocation = found.Prestado === 'SÍ' ? 'HOGAR' : 'SALA DE MÚSICA';
      const { error: updInvError } = await supabase
        .from('inventory')
        .update({ Ubicacion: originalLocation })
        .eq('id', found.id);

      setIsProcessingAction(false);
      if (!updInvError) {
        setScanResult({ 
          found: true, 
          success: true, 
          message: `Instrumento devuelto exitosamente a la sala de música.`,
          item: found
        });
        playScanSound(true);
      } else {
        setScanResult({ found: true, success: false, message: `Error al restaurar ubicación: ${updInvError.message}` });
        playScanSound(false);
      }
    }
  };

  // Abrir Modal de Edición de Responsable
  const handleOpenEditModal = (item: PresentationItem) => {
    setEditingItem(item);
    setEditStudentName(item.estudiante);
    setEditCurso(item.curso || '');
  };

  // Guardar Cambios de Edición de Responsable
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    setIsProcessingAction(true);
    const { error } = await supabase
      .from('presentation_items')
      .update({ estudiante: editStudentName.trim(), curso: editCurso.trim() })
      .eq('id', editingItem.id);

    setIsProcessingAction(false);
    if (!error) {
      setSessionItems(prev => prev.map(item => 
        item.id === editingItem.id 
          ? { ...item, estudiante: editStudentName.trim(), curso: editCurso.trim() } 
          : item
      ));
      setEditingItem(null);
    } else {
      alert(`Error al actualizar el responsable: ${error.message}`);
    }
  };

  // Html5 Qr Scanner Start
  const startScanner = useCallback(async () => {
    setCameraError(null);
    setScanResult(null);
    setIsScanning(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch(e) {}
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode('qr-presentation-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          handleProcessScan(decodedText);
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          setIsScanning(false);
        },
        () => {}
      );
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.message || 'No se pudo acceder a la cámara');
      setIsScanning(false);
    }
  }, [inventory, scanMode, sessionItems]);

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

  // Generar PDF
  const generatePDFReport = () => {
    if (!activeSession) return;

    const doc = new jsPDF('p', 'mm', 'letter');
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const totalOut = sessionItems.length;
    const returned = sessionItems.filter(i => i.status === 'retornado').length;
    const pending = totalOut - returned;

    // Encabezado
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 216, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE CONTROL: PRESENTACIÓN EXTERNA', 15, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Evento: ${activeSession.name.toUpperCase()} (Lugar: ${activeSession.lugar || 'No especificado'} • Fecha: ${activeSession.date})`, 15, 24);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.text(`Orquesta Sinfónica William Taylor • Generado: ${dateStr} a las ${timeStr}`, 15, 32);

    // Resumen
    const yStart = 50;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DEL CONTROL', 15, yStart);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Total instrumentos sacados: ${totalOut}`, 15, yStart + 8);
    doc.text(`Instrumentos devueltos: ${returned}`, 15, yStart + 14);
    doc.text(`Instrumentos pendientes: ${pending}`, 15, yStart + 20);

    const percent = totalOut > 0 ? Math.round((returned / totalOut) * 100) : 0;
    doc.setFont('helvetica', 'bold');
    if (percent === 100) {
      doc.setTextColor(34, 197, 94);
      doc.text('¡COMPLETADO (100% RETORNADO)!', 120, yStart + 8);
    } else {
      doc.setTextColor(239, 68, 68);
      doc.text(`PENDIENTE DE RETORNO: ${percent}% completado`, 120, yStart + 8);
    }

    // Tabla
    const tableY = yStart + 28;
    const tableData = sessionItems.map((item, idx) => [
      String(idx + 1),
      item.instrument_name,
      `${item.marca} ${item.modelo}`.trim() || '—',
      item.serie || '—',
      item.estudiante,
      item.curso || '—',
      item.status === 'retornado' ? '✅ DEVUELTO' : '❌ PENDIENTE',
      item.returned_at ? new Date(item.returned_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'
    ]);

    autoTable(doc, {
      startY: tableY,
      head: [['#', 'Instrumento', 'Marca/Modelo', 'Nº Serie', 'Estudiante', 'Curso', 'Estado', 'Hora Retorno']],
      body: tableData,
      styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica' },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        6: { fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 }
    });

    // Firmas
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    const signY = finalY > 220 ? doc.addPage() && 50 : finalY + 25;
    
    doc.setDrawColor(203, 213, 225);
    doc.line(30, signY, 90, signY);
    doc.line(126, signY, 186, signY);
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma Encargado de Evento', 42, signY + 5);
    doc.text('Firma Director / Monitor', 140, signY + 5);

    doc.save(`Reporte_Presentacion_${activeSession.name.replace(/\s+/g, '_')}_${activeSession.date}.pdf`);
  };

  const totalPendingAll = useMemo(() => sessionItems.filter(i => i.status === 'fuera').length, [sessionItems]);
  const totalReturnedAll = useMemo(() => sessionItems.filter(i => i.status === 'retornado').length, [sessionItems]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
            CONTROL DE <span className="text-indigo-500">PRESENTACIONES</span>
          </h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mt-2">
            Registro y control QR para salidas grupales a conciertos y desfiles
          </p>
        </div>

        {activeSession ? (
          <button
            onClick={() => { setActiveSession(null); stopScanner(); }}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all self-start md:self-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Listado
          </button>
        ) : (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 self-start md:self-auto active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nueva Presentación
          </button>
        )}
      </div>

      {/* MODAL CREAR PRESENTACIÓN */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Crear Presentación</h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Registra los datos para la salida grupal</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre del Evento</label>
                <input 
                  type="text" 
                  value={newEventName} 
                  onChange={e => setNewEventName(e.target.value)} 
                  placeholder="Ej. Desfile Glorias Navales, Concierto Teatro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 font-bold text-white text-sm outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lugar del Evento</label>
                <input 
                  type="text" 
                  value={newEventLugar} 
                  onChange={e => setNewEventLugar(e.target.value)} 
                  placeholder="Ej. Teatro Municipal, Plaza de Armas"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 font-bold text-white text-sm outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha del Evento</label>
                <input 
                  type="date" 
                  value={newEventDate} 
                  onChange={e => setNewEventDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 font-bold text-white text-sm outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-400 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateSession}
                disabled={isProcessingAction}
                className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                {isProcessingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear e Iniciar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR RESPONSABLE TEMPORAL */}
      {editingItem && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/95 border border-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setEditingItem(null)}
              className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Editar Responsable</h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Cambia quién llevará el instrumento en este evento</p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 text-xs text-left">
              <p className="text-slate-400 font-bold block mb-1">Instrumento</p>
              <p className="text-white font-black uppercase text-sm mb-3">{editingItem.instrument_name}</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase">Marca:</span> <span className="text-slate-300 font-bold">{editingItem.marca || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase">Serie:</span> <span className="text-slate-300 font-bold">{editingItem.serie || 'NS'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estudiante Responsable</label>
                <input 
                  type="text" 
                  value={editStudentName} 
                  onChange={e => setEditStudentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 font-bold text-white text-sm outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Curso</label>
                <input 
                  type="text" 
                  value={editCurso} 
                  onChange={e => setEditCurso(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 font-bold text-white text-sm outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setEditingItem(null)}
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-400 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isProcessingAction}
                className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                {isProcessingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 1: LISTADO DE SESIONES (PANTALLA PRINCIPAL) */}
      {!activeSession && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingSessions ? (
            <div className="col-span-full bg-slate-900/20 border border-slate-900 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Cargando eventos de presentación...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="col-span-full bg-slate-900/20 border border-slate-900 rounded-[2.5rem] p-16 text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-600/10 rounded-[2rem] border border-indigo-500/20 flex items-center justify-center mx-auto">
                <Compass className="w-10 h-10 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Sin Presentaciones Activas</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 leading-relaxed">
                  No hay eventos de presentaciones externas creados aún. ¡Crea uno nuevo para controlar la salida y retorno!
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Crear Primera Presentación
              </button>
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                onClick={() => setActiveSession(session)}
                className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-[2rem] hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all duration-300 cursor-pointer group flex flex-col justify-between min-h-[240px]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      session.status === 'activa' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {session.status === 'activa' ? '● En Curso / Activa' : 'Completada'}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-2 hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 rounded-xl transition-all"
                      title="Eliminar Presentación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors leading-tight">
                      {session.name}
                    </h3>
                    
                    {session.lugar && (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" /> {session.lugar}
                      </p>
                    )}

                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {session.date}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-4 mt-4 flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                    Haz clic para controlar QR
                  </span>
                  <div className="w-8 h-8 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    →
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VISTA 2: SESIÓN DE PRESENTACIÓN ACTIVA */}
      {activeSession && (
        <div className="space-y-6">
          
          {/* CARD DETALLES DE SESIÓN */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 sm:p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight italic">
                  {activeSession.name}
                </h2>
                {activeSession.status === 'activa' && (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                    Activa
                  </span>
                )}
              </div>
              <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Fecha: {activeSession.date}</span>
                {activeSession.lugar && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-indigo-450" /> Lugar: {activeSession.lugar}</span>}
                <span>ID: {activeSession.id}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={generatePDFReport}
                className="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600/20 transition-all flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" /> PDF Reporte
              </button>
              {activeSession.status === 'activa' && (
                <button
                  onClick={handleCompleteSession}
                  className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" /> Finalizar Evento
                </button>
              )}
            </div>
          </div>

          {/* ── SECCIÓN DE FILTROS POR FAMILIA DE INSTRUMENTOS ── */}
          <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-[2rem] overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'VIOLINES', label: '🎻 Violines' },
              { id: 'VIOLAS', label: '🎻 Violas' },
              { id: 'CELLOS', label: '🎻 Cellos' },
              { id: 'CONTRABAJOS', label: '🎻 Contrabajos' },
              { id: 'VIENTOS METALES', label: '🎺 V. Metales' },
              { id: 'VIENTOS MADERAS', label: '🎷 V. Maderas' },
              { id: 'PERCUSIÓN', label: '🥁 Percusión' },
              { id: 'OTROS', label: '🎹 Otros' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setSelectedFamilyFilter(pill.id)}
                className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all border ${
                  selectedFamilyFilter === pill.id
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {pill.label}
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                  selectedFamilyFilter === pill.id ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-500'
                }`}>
                  {familyCounts[pill.id] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* COLUMNA IZQUIERDA (7 SPAN): PANEL DE CONTROL & QR */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* PANEL DE ESCANEO DE CÁMARA */}
              {activeSession.status === 'activa' && (
                <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <div className="p-6 sm:p-8 space-y-6">
                    
                    {/* SELECTOR MODO DE ESCANEO */}
                    <div className="bg-slate-950 p-1.5 rounded-2xl flex gap-2 border border-slate-800">
                      <button
                        onClick={() => { setScanMode('salida'); stopScanner(); setScanResult(null); }}
                        className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                          scanMode === 'salida'
                            ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                            : 'text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        <ArrowLeftRight className="w-4 h-4" /> 1. Modo Salida (Saca Instrumento)
                      </button>
                      <button
                        onClick={() => { setScanMode('retorno'); stopScanner(); setScanResult(null); }}
                        className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                          scanMode === 'retorno'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                            : 'text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" /> 2. Modo Retorno (Devuelve Instrumento)
                      </button>
                    </div>

                    {/* VISOR CÁMARA */}
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800">
                      <div id="qr-presentation-reader" className="w-full" style={{ minHeight: '260px' }} />

                      {!isScanning && !scanResult && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/80">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
                            scanMode === 'salida' ? 'bg-amber-600/10 border-amber-500/20 text-amber-500' : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500'
                          }`}>
                            <Camera className="w-8 h-8" />
                          </div>
                          <button
                            onClick={startScanner}
                            className={`px-8 py-4 rounded-2xl font-black text-xs text-white uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 ${
                              scanMode === 'salida' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/10' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10'
                            }`}
                          >
                            <Scan className="w-4 h-4" /> Activar Cámara
                          </button>
                        </div>
                      )}

                      {cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-6 text-center">
                          <AlertTriangle className="w-10 h-10 text-rose-500" />
                          <p className="text-rose-400 text-xs font-bold uppercase">{cameraError}</p>
                          <button
                            onClick={startScanner}
                            className="bg-indigo-600 px-6 py-2.5 rounded-xl font-black text-[10px] text-white uppercase tracking-widest mt-2"
                          >
                            Reintentar Cámara
                          </button>
                        </div>
                      )}
                    </div>

                    {/* RESULTADO ESCANEO */}
                    {scanResult && (
                      <div className={`p-5 rounded-2xl border-2 animate-in zoom-in-95 duration-200 ${
                        scanResult.success
                          ? 'bg-emerald-600/5 border-emerald-500/20'
                          : 'bg-rose-600/5 border-rose-500/20'
                      }`}>
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            scanResult.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {scanResult.success ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className={`text-xs font-black uppercase tracking-wider ${
                              scanResult.success ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              {scanResult.success ? 'Procesado con Éxito' : 'Operación Fallida'}
                            </h4>
                            <p className="text-white text-xs font-bold leading-normal">{scanResult.message}</p>
                          </div>
                        </div>

                        {scanResult.item && (
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 mt-4 grid grid-cols-2 gap-3 text-[11px]">
                            <div>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Instrumento</span>
                              <span className="text-white font-bold uppercase">{scanResult.item.Instrumento}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Marca / Modelo</span>
                              <span className="text-white font-bold uppercase">{scanResult.item.Marca} {scanResult.item.Modelo}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Estudiante a cargo</span>
                              <span className="text-indigo-400 font-bold uppercase">{scanResult.item.Estudiante || 'Sin asignar'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Nº Serie</span>
                              <span className="text-white font-bold uppercase">{scanResult.item.Serie || 'NS'}</span>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => { setScanResult(null); startScanner(); }}
                          className="w-full mt-4 bg-white/5 border border-white/5 py-3 rounded-xl text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                          <Scan className="w-4 h-4" /> Volver a Escanear
                        </button>
                      </div>
                    )}

                    {/* FALLBACK MANUAL */}
                    <div className="border-t border-slate-800/60 pt-6">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-3">
                        ¿QR Dañado? Digita el Número de Serie o ID
                      </p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                          <input
                            type="text"
                            value={manualInput}
                            onChange={e => setManualInput(e.target.value)}
                            placeholder="Ingresa Nº Serie o ID..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 font-bold text-white text-xs outline-none focus:border-indigo-500 uppercase transition-all"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleProcessScan(manualInput);
                                setManualInput('');
                              }
                            }}
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (manualInput.trim()) {
                              handleProcessScan(manualInput);
                              setManualInput('');
                            }
                          }}
                          className="bg-slate-950 border border-slate-800 text-slate-300 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all"
                        >
                          Registrar
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}
              
              {/* ALERTA DE COMPLETADO O FALTA */}
              <div className={`p-6 rounded-[2.5rem] border flex items-center gap-4 ${
                totalPendingAll === 0 && sessionItems.length > 0
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
              }`}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/5 border border-white/5">
                  {totalPendingAll === 0 && sessionItems.length > 0
                    ? <CheckCircle className="w-6 h-6 text-emerald-400" />
                    : <AlertTriangle className="w-6 h-6 text-amber-400" />
                  }
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-white text-xs font-black uppercase tracking-wider">Estado de Control de Retorno General</p>
                  <p className="text-[11px] text-slate-400 font-bold leading-normal">
                    {sessionItems.length === 0 
                      ? 'No se han registrado instrumentos para este evento aún.' 
                      : totalPendingAll === 0 
                        ? '¡Excelente! Todos los instrumentos que salieron a la presentación han retornado a la sala sanos y salvos.'
                        : `¡Alerta! Faltan ${totalPendingAll} instrumentos por registrar su retorno de la presentación. Revisa la lista de pendientes.`
                    }
                  </p>
                </div>
              </div>

            </div>

            {/* COLUMNA DERECHA (5 SPAN): LISTADO EN TIEMPO REAL CON FILTRO APLICADO */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* LISTA 1: PENDIENTES DE RETORNO (FUERA) */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                <div className="p-6 border-b border-slate-800 bg-rose-950/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">
                      🔴 Faltan por Retornar ({pendingItems.length})
                    </h3>
                  </div>
                  <span className="text-[8px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded uppercase">
                    {selectedFamilyFilter === 'TODOS' ? 'Falta' : selectedFamilyFilter}
                  </span>
                </div>
                
                <div className="divide-y divide-slate-800/60 max-h-[350px] overflow-y-auto">
                  {pendingItems.length === 0 ? (
                    <div className="p-10 text-center space-y-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                      <span>{selectedFamilyFilter === 'TODOS' ? 'Sin Pendientes' : `Sin ${selectedFamilyFilter} Pendientes`}</span>
                    </div>
                  ) : (
                    pendingItems.map(item => (
                      <div key={item.id} className="p-4 flex justify-between gap-4 bg-slate-950/10 hover:bg-slate-950/30 transition-all group">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white uppercase truncate block">
                              {item.instrument_name}
                            </span>
                            <span className="text-[7.5px] font-bold text-slate-600 uppercase tracking-widest px-1.5 py-0.5 bg-slate-950 rounded border border-slate-850">
                              {getItemFamily(item)}
                            </span>
                          </div>
                          
                          {/* NOMBRE ESTUDIANTE CON LÁPIZ DE EDICIÓN RAPIDA */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-indigo-400 block uppercase truncate">
                              👤 {item.estudiante} {item.curso ? `(${item.curso})` : ''}
                            </span>
                            {activeSession.status === 'activa' && (
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Editar estudiante para este evento"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <span className="text-[8px] font-black text-slate-500 uppercase block tracking-wider">
                            {item.marca} {item.modelo} • Serie: {item.serie || 'NS'}
                          </span>
                        </div>
                        
                        <div className="text-right flex flex-col justify-between shrink-0">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">
                            {new Date(item.departed_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {activeSession.status === 'activa' && (
                            <button
                              onClick={async () => {
                                // Atajo de retorno manual rápido
                                setIsProcessingAction(true);
                                await supabase.from('presentation_items').update({ status: 'retornado', returned_at: new Date().toISOString() }).eq('id', item.id);
                                const invMatch = inventory.find(i => String(i.id) === String(item.instrument_id));
                                const originalLoc = invMatch?.Prestado === 'SÍ' ? 'HOGAR' : 'SALA DE MÚSICA';
                                await supabase.from('inventory').update({ Ubicacion: originalLoc }).eq('id', item.instrument_id);
                                setIsProcessingAction(false);
                                playScanSound(true);
                              }}
                              className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all mt-2"
                            >
                              Retorno Rápido
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LISTA 2: RETORNADOS CON ÉXITO */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden">
                <div className="p-6 border-b border-slate-800 bg-emerald-950/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">
                      🟢 Devueltos a la Sala ({returnedItems.length})
                    </h3>
                  </div>
                  <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                    {selectedFamilyFilter === 'TODOS' ? 'Seguro' : selectedFamilyFilter}
                  </span>
                </div>
                
                <div className="divide-y divide-slate-800/60 max-h-[350px] overflow-y-auto">
                  {returnedItems.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                      Ninguno devuelto todavía
                    </div>
                  ) : (
                    returnedItems.map(item => (
                      <div key={item.id} className="p-4 flex justify-between gap-4 hover:bg-slate-950/10 transition-all opacity-80 group">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase truncate block line-through">
                              {item.instrument_name}
                            </span>
                            <span className="text-[7.5px] font-bold text-slate-600 uppercase tracking-widest px-1.5 py-0.5 bg-slate-950 rounded border border-slate-850">
                              {getItemFamily(item)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-slate-500 block uppercase truncate">
                              👤 {item.estudiante}
                            </span>
                            {activeSession.status === 'activa' && (
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Editar estudiante para este evento"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <span className="text-[8px] font-bold text-slate-600 uppercase block">
                            Serie: {item.serie || 'NS'}
                          </span>
                        </div>
                        
                        <div className="text-right shrink-0 flex flex-col justify-between items-end">
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
                            Devuelto
                          </span>
                          {item.returned_at && (
                            <span className="text-[7.5px] font-bold text-slate-500 mt-2">
                              {new Date(item.returned_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default PresentationControlView;
