
import React, { useState, useMemo } from 'react';
import { X, Music, User, Calendar, Clock, ArrowRight, ArrowLeft, Camera, MapPin, Wrench, History, AlertTriangle, CheckCircle, Package, Loader2 } from 'lucide-react';
import { InventoryItem, MovementRecord } from '../types.ts';
import { isItemLoaned, getEstadoCategoria, globalNormalize } from '../utils.ts';
import { supabase } from '../supabaseClient.ts';

interface InstrumentDetailProps {
  item: InventoryItem;
  history: MovementRecord[];
  onClose: () => void;
  onPhotoUpload?: (id: string, file: File) => void;
}

const InstrumentDetail: React.FC<InstrumentDetailProps> = ({ item, history, onClose, onPhotoUpload }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'maintenance'>('info');
  const [photoUrl, setPhotoUrl] = useState<string>((item as any).photo_url || '');
  const [isUploading, setIsUploading] = useState(false);

  const estadoCategoria = getEstadoCategoria(item.Estado);
  const estadoColor = estadoCategoria === 'BUENO' ? 'emerald' : estadoCategoria === 'REGULAR' ? 'amber' : 'rose';
  const loaned = isItemLoaned(item);

  // Historial filtrado para este instrumento
  const instrumentHistory = useMemo(() => {
    return history.filter(rec => {
      const matchById = String(rec.instrumentId) === String(item.id);
      const matchBySerie = item.Serie && rec.serie && globalNormalize(rec.serie) === globalNormalize(item.Serie);
      const matchByName = rec.instrumentName && globalNormalize(rec.instrumentName) === globalNormalize(item.Instrumento) &&
        rec.estudiante && item.Estudiante && globalNormalize(rec.estudiante) === globalNormalize(item.Estudiante);
      return matchById || matchBySerie || matchByName;
    }).sort((a, b) => {
      const dateA = a.fechaSalida || '';
      const dateB = b.fechaSalida || '';
      return dateB.localeCompare(dateA);
    });
  }, [history, item]);

  const handlePhotoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `instrument_${item.id}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('instruments')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('instruments')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      setPhotoUrl(publicUrl);

      // Guardar URL en la base de datos
      await supabase.from('inventory')
        .update({ photo_url: publicUrl })
        .eq('id', String(item.id));

      if (onPhotoUpload) onPhotoUpload(String(item.id), file);
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      alert('Error al subir la foto: ' + (err.message || ''));
    } finally {
      setIsUploading(false);
    }
  };

  const InfoField = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div className="bg-[#020617] p-5 rounded-2xl border border-white/5">
      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-bold text-sm uppercase ${color || 'text-white'}`}>{value || '—'}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-3xl flex items-start justify-center overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300">
      <div className="bg-slate-900/90 border border-white/10 rounded-[2.5rem] w-full max-w-3xl shadow-[0_64px_128px_rgba(0,0,0,0.8)] relative overflow-hidden my-4">
        
        {/* Decoración de fondo */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-${estadoColor}-500/5 blur-[100px] rounded-full`} />
        
        {/* Header */}
        <div className="relative p-8 md:p-12 border-b border-white/5">
          <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-slate-950 rounded-2xl text-slate-500 hover:text-white transition-all shadow-lg z-10">
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Foto / Placeholder del instrumento */}
            <div className="relative group">
              <div className="w-32 h-32 bg-slate-950 rounded-[2rem] flex items-center justify-center border-2 border-white/5 shadow-inner overflow-hidden">
                {photoUrl ? (
                  <img src={photoUrl} alt={item.Instrumento} className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-16 h-16 text-indigo-500/30" />
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/70 rounded-[2rem] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <div className="flex flex-col items-center gap-1">
                  <Camera className="w-7 h-7 text-white" />
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">{photoUrl ? 'Cambiar' : 'Agregar'}</span>
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoInput} />
              </label>
            </div>

            <div className="text-center md:text-left flex-1">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-${estadoColor}-500/10 text-${estadoColor}-500 border border-${estadoColor}-500/20`}>
                  {item.Estado || 'SIN ESTADO'}
                </span>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${loaned ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                  {loaned ? '📍 EN HOGAR' : '📍 EN SALA'}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">
                {item.Instrumento}
              </h2>
              <p className="text-indigo-400 font-black text-sm uppercase tracking-widest">
                {item.Marca} {item.Modelo}
              </p>
              {item.Serie && (
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-1">S/N: {item.Serie}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {[
            { id: 'info', label: 'Información', icon: Package },
            { id: 'history', label: 'Historial', icon: History, count: instrumentHistory.length },
            { id: 'maintenance', label: 'Mantención', icon: Wrench },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' 
                  : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="p-8 md:p-12">
          {/* TAB: Información */}
          {activeTab === 'info' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Estudiante asignado */}
              {item.Estudiante && String(item.Estudiante).trim() && (
                <div className="bg-indigo-600/5 p-6 rounded-[2rem] border border-indigo-500/20">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center">
                      <User className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Estudiante Asignado</p>
                      <p className="text-xl font-black text-white uppercase italic tracking-tight">{item.Estudiante}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.Curso || 'SIN CURSO'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid de información */}
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Familia" value={item.Familia} />
                <InfoField label="Marca" value={item.Marca} />
                <InfoField label="Modelo" value={item.Modelo} />
                <InfoField label="Serie" value={item.Serie} />
                <InfoField label="Medida" value={String(item.Medida || item.Medidas || '—')} />
                <InfoField label="Estado" value={item.Estado} color={`text-${estadoColor}-500`} />
                <InfoField label="Case" value={item.TipoCase} />
                <InfoField label="Accesorios" value={item.Accesorios} />
                <InfoField label="Soporte" value={item.Soporte} />
                <InfoField label="Limpio" value={item.Limpio} />
                <InfoField label="Responsable" value={item.Responsable} />
                <InfoField label="Ubicación" value={item.Ubicacion} color={loaned ? 'text-amber-500' : 'text-emerald-500'} />
              </div>

              {item.Observaciones && (
                <div className="bg-[#020617] p-6 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Observaciones</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.Observaciones}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Historial */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {instrumentHistory.length === 0 ? (
                <div className="py-20 text-center">
                  <History className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-700 font-black uppercase text-xs tracking-[0.3em]">Sin movimientos registrados</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Línea vertical del timeline */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-800" />
                  
                  {instrumentHistory.map((rec, idx) => {
                    const isActive = rec.status === 'en_prestamo';
                    return (
                      <div key={rec.id || idx} className="relative pl-16 pb-8">
                        {/* Punto del timeline */}
                        <div className={`absolute left-4 top-2 w-5 h-5 rounded-full border-2 ${
                          isActive 
                            ? 'bg-amber-500 border-amber-400 shadow-lg shadow-amber-500/30' 
                            : 'bg-slate-800 border-slate-700'
                        }`} />
                        
                        <div className={`bg-slate-900/60 border rounded-2xl p-5 ${isActive ? 'border-amber-500/20' : 'border-white/5'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                              isActive 
                                ? 'bg-amber-500/10 text-amber-400' 
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {isActive ? '⏳ EN PRÉSTAMO' : '✅ COMPLETADO'}
                            </span>
                          </div>
                          
                          <p className="text-white font-bold uppercase text-sm mb-2">{rec.estudiante}</p>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{rec.curso}</p>
                          
                          <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Salida: {rec.fechaSalida}
                            </span>
                            {rec.horaSalida && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {rec.horaSalida}
                              </span>
                            )}
                            {rec.fechaRetorno && (
                              <span className="flex items-center gap-1 text-emerald-500">
                                <Calendar className="w-3 h-3" /> Retorno: {rec.fechaRetorno}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: Mantención */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="py-16 text-center">
                <Wrench className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-700 font-black uppercase text-xs tracking-[0.3em] mb-2">Próximamente</p>
                <p className="text-slate-800 text-[10px] font-bold uppercase tracking-widest">
                  Registro de mantenciones y calendario de servicio
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstrumentDetail;
