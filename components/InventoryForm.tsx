
import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Music, 
  Tag, 
  Settings, 
  CheckCircle, 
  User, 
  MapPin, 
  FileText,
  Plus
} from 'lucide-react';
import { InventoryItem } from '../types';
import { supabase } from '../supabaseClient';
import { inferFamilia } from '../utils';

interface InventoryFormProps {
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
}

const InventoryForm: React.FC<InventoryFormProps> = ({ onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    Instrumento: '',
    Marca: '',
    Modelo: '',
    Serie: '',
    Estado: 'BUENO',
    Familia: '',
    Medida: '',
    Ubicacion: 'SALA DE MÚSICA',
    Responsable: '',
    Observaciones: '',
    Prestado: 'NO'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Instrumento) return alert('El nombre del instrumento es obligatorio');

    setLoading(true);
    try {
      const familia = formData.Familia || inferFamilia(formData.Instrumento || '');
      const newItem = {
        Instrumento: formData.Instrumento?.toUpperCase(),
        Marca: formData.Marca?.toUpperCase(),
        Modelo: formData.Modelo?.toUpperCase(),
        Serie: formData.Serie?.toUpperCase(),
        Estado: formData.Estado,
        Familia: familia.toUpperCase(),
        Medida: formData.Medida?.toUpperCase(),
        Ubicacion: formData.Ubicacion?.toUpperCase(),
        Responsable: formData.Responsable?.toUpperCase(),
        Observaciones: formData.Observaciones?.toUpperCase(),
        Prestado: 'NO'
      };

      const { data, error } = await supabase
        .from('inventory')
        .insert([newItem]) 
        .select();

      if (error) throw error;
      
      if (data && data[0]) {
        onSave(data[0] as InventoryItem);
      }
      onClose();
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617]/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300 overflow-y-auto">
      <div className="bg-slate-900/90 border border-white/10 rounded-[40px] p-8 md:p-12 max-w-4xl w-full shadow-[0_64px_128px_rgba(0,0,0,0.8)] relative overflow-hidden my-auto">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-3xl rounded-full"></div>
        
        <header className="flex justify-between items-center mb-10 relative z-10">
          <div>
            <h3 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
              Nuevo <span className="text-indigo-400">Instrumento</span>
            </h3>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Ingreso manual al sistema OSWT</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Instrumento *</label>
            <div className="relative">
              <Music className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input
                required
                type="text"
                value={formData.Instrumento}
                onChange={e => setFormData({ ...formData, Instrumento: e.target.value })}
                className="w-full bg-slate-950 border-2 border-white/5 rounded-3xl py-4 pl-14 pr-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all uppercase"
                placeholder="EJ: VIOLÍN"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Marca</label>
            <div className="relative">
              <Tag className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input
                type="text"
                value={formData.Marca}
                onChange={e => setFormData({ ...formData, Marca: e.target.value })}
                className="w-full bg-slate-950 border-2 border-white/5 rounded-3xl py-4 pl-14 pr-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all uppercase"
                placeholder="EJ: STRADIVARIUS"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Modelo</label>
            <input
              type="text"
              value={formData.Modelo}
              onChange={e => setFormData({ ...formData, Modelo: e.target.value })}
              className="w-full bg-slate-950 border-2 border-white/5 rounded-3xl py-4 px-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all uppercase"
              placeholder="EJ: CONCERT MASTER"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Serie / Serial</label>
            <input
              type="text"
              value={formData.Serie}
              onChange={e => setFormData({ ...formData, Serie: e.target.value })}
              className="w-full bg-slate-950 border-2 border-white/5 rounded-3xl py-4 px-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all uppercase"
              placeholder="EJ: WT-2024-001"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Estado</label>
            <select
              value={formData.Estado}
              onChange={e => setFormData({ ...formData, Estado: e.target.value })}
              className="w-full bg-slate-950 border-2 border-white/5 rounded-3xl py-4 px-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all appearance-none"
            >
              <option value="BUENO">BUENO / ÓPTIMO</option>
              <option value="REGULAR">REGULAR / MANTENCIÓN</option>
              <option value="MALO">MALO / REPARACIÓN</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Medida</label>
            <input
              type="text"
              value={formData.Medida}
              onChange={e => setFormData({ ...formData, Medida: e.target.value })}
              className="w-full bg-slate-950 border-2 border-white/5 rounded-3xl py-4 px-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all uppercase"
              placeholder="EJ: 4/4"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Ubicación</label>
            <div className="relative">
              <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input
                type="text"
                value={formData.Ubicacion}
                onChange={e => setFormData({ ...formData, Ubicacion: e.target.value })}
                className="w-full bg-slate-950 border-2 border-white/5 rounded-3xl py-4 pl-14 pr-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all uppercase"
                placeholder="EJ: SALA DE MÚSICA"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Monitor Responsable</label>
            <div className="relative">
              <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input
                type="text"
                value={formData.Responsable}
                onChange={e => setFormData({ ...formData, Responsable: e.target.value })}
                className="w-full bg-slate-950 border-2 border-white/5 rounded-3xl py-4 pl-14 pr-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all uppercase"
                placeholder="NOMBRE DEL PROFESOR"
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Observaciones</label>
            <textarea
              value={formData.Observaciones}
              onChange={e => setFormData({ ...formData, Observaciones: e.target.value })}
              className="w-full bg-slate-950 border-2 border-white/5 rounded-[2rem] py-6 px-8 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all uppercase min-h-[120px]"
              placeholder="DETALLES ADICIONALES..."
            />
          </div>

          <div className="md:col-span-2 flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all border border-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Sincronizando...' : 'Guardar en Sistema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryForm;
