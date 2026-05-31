
import React, { useState, useEffect, useRef } from 'react';
import {
    User,
    Search,
    MapPin,
    Phone,
    Music,
    Calendar,
    CheckCircle,
    Edit3,
    FileText,
    Plus,
    X,
    Save,
    Upload as UploadIcon,
    ChevronLeft,
    Camera,
    Star,
    Award,
    TrendingUp,
    Clock,
    UserPlus,
    Trash2,
    Eye,
    ShieldCheck,
    Mail
} from 'lucide-react';
import { supabase } from '../supabaseClient';

import { Student } from '../types';

const DirectoryView: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'detail' | 'edit'>('grid');
    const [loading, setLoading] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Student>>({});
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadToSupabase = async (file: File) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `photos/${fileName}`;

            let { error: uploadError } = await supabase.storage
                .from('students')
                .upload(filePath, file);

            if (uploadError) {
                await supabase.storage.createBucket('students', { public: true });
                const { error: retryError } = await supabase.storage
                    .from('students')
                    .upload(filePath, file);
                if (retryError) throw retryError;
            }

            const { data } = supabase.storage
                .from('students')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    };

    const handleDeletePhoto = async () => {
        if (!confirm('¿Estás seguro de eliminar la foto?')) return;

        setUploading(true);
        try {
            if (viewMode === 'detail' && selectedStudent) {
                const { error } = await supabase
                    .from('students')
                    .update({ photo_url: null })
                    .eq('id', selectedStudent.id);

                if (error) throw error;

                const updated = { ...selectedStudent, photo_url: undefined };
                setSelectedStudent(updated);
                setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
            } else {
                setEditForm(prev => ({ ...prev, photo_url: '' }));
            }
        } catch (error: any) {
            alert('Error al eliminar la foto: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const publicUrl = await uploadToSupabase(file);

            if (viewMode === 'detail' && selectedStudent) {
                const { error } = await supabase
                    .from('students')
                    .update({ photo_url: publicUrl })
                    .eq('id', selectedStudent.id);

                if (error) throw error;

                const updated = { ...selectedStudent, photo_url: publicUrl };
                setSelectedStudent(updated);
                setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
            } else {
                setEditForm(prev => ({ ...prev, photo_url: publicUrl }));
            }
        } catch (error: any) {
            alert('Error al procesar la imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        fetchStudents();

        // Sincronización en Tiempo Real (Supabase Realtime)
        const channel = supabase.channel('realtime:directory_students')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
                fetchStudents();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [viewMode]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching students:', error);
            } else {
                setStudents(data || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.instrument && s.instrument.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelectStudent = (student: Student) => {
        setSelectedStudent(student);
        setEditForm(student);
        setViewMode('detail');
    };

    const handleAddNew = () => {
        setSelectedStudent(null);
        setEditForm({
            name: '',
            course: '',
            instrument: '',
            phone: '',
            email: '',
            parent_name: '',
            parent_phone: '',
            photo_url: ''
        });
        setViewMode('edit');
    };

    const handleSave = async () => {
        if (!editForm.name) {
            alert('El nombre es obligatorio');
            return;
        }

        setLoading(true);
        try {
            const studentData = {
                name: editForm.name.toUpperCase(),
                course: editForm.course?.toUpperCase() || 'SIN CURSO',
                instrument: editForm.instrument?.toUpperCase() || '',
                phone: editForm.phone || '',
                email: editForm.email || '',
                parent_name: editForm.parent_name?.toUpperCase() || '',
                parent_phone: editForm.parent_phone || '',
                photo_url: editForm.photo_url || ''
            };

            if (selectedStudent?.id) {
                const { error } = await supabase
                    .from('students')
                    .update(studentData)
                    .eq('id', selectedStudent.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('students')
                    .insert([studentData]);
                if (error) throw error;
            }

            await fetchStudents();
            setViewMode('grid');
            setSelectedStudent(null);
        } catch (err: any) {
            console.error('Error saving student:', err);
            alert('Error al guardar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar a este estudiante?')) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (error) throw error;
            await fetchStudents();
            setViewMode('grid');
            setSelectedStudent(null);
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (viewMode === 'detail' && selectedStudent) {
        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div className="flex items-center gap-5">
                        <button onClick={() => setViewMode('grid')} className="p-3 md:p-4 bg-slate-950/80 hover:bg-slate-900 rounded-2xl transition-all border border-white/5 hover:border-indigo-500/50 group">
                            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-slate-400 group-hover:text-white" />
                        </button>
                        <div>
                            <h2 className="text-2xl md:text-[2.5rem] font-black italic tracking-tighter text-white uppercase leading-none">
                                Perfil del <span className="text-indigo-400">Estudiante</span>
                            </h2>
                            <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em] mt-2 md:mt-3">SISTEMA PREMIUM DE GESTIÓN • OSWT</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={() => setViewMode('edit')}
                            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 md:px-10 py-4 md:py-5 rounded-[20px] md:rounded-[24px] flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(192,38,211,0.3)] transition-all hover:scale-105 active:scale-95 border-t border-white/20 text-xs md:text-sm"
                        >
                            <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                            MODIFICAR FICHA
                        </button>
                    </div>
                </header>

                <div className="max-w-6xl mx-auto space-y-16 pb-20">
                    {/* Unique Bio Section - Luxury Theme */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                    />

                    <section className="bg-[#0A0C14] p-6 sm:p-8 md:p-16 rounded-3xl md:rounded-[80px] border border-white/5 flex flex-col md:flex-row items-center gap-10 md:gap-20 relative overflow-hidden group shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] border-b-indigo-500/20">
                        <div className="absolute top-0 right-0 w-64 md:w-[600px] h-64 md:h-[600px] bg-indigo-600/10 blur-[80px] md:blur-[180px] rounded-full -mr-20 md:-mr-40 -mt-20 md:-mt-40"></div>
                        <div className="absolute bottom-0 left-0 w-48 md:w-[400px] h-48 md:h-[400px] bg-amber-500/5 blur-[60px] md:blur-[120px] rounded-full -ml-16 md:-ml-32 -mb-16 md:-mb-32"></div>

                        <div className="relative shrink-0">
                            <div
                                className="relative group/bio cursor-pointer w-40 h-40 sm:w-48 sm:h-48 md:w-80 md:h-80 rounded-2xl sm:rounded-[36px] md:rounded-[72px] overflow-hidden border-4 border-white/10 shadow-[0_24px_48px_rgba(0,0,0,0.5)] bg-slate-900 flex items-center justify-center transition-all group-hover/bio:scale-[1.03] duration-1000"
                                onClick={() => !uploading && fileInputRef.current?.click()}
                            >
                                {selectedStudent.photo_url ? (
                                    <img src={selectedStudent.photo_url} alt={selectedStudent.name} className="w-full h-full object-cover object-center scale-110 group-hover/bio:scale-100 transition-transform duration-[2s]" />
                                ) : (
                                    <div className="text-center">
                                        <Camera className="w-16 h-16 sm:w-24 sm:h-24 text-slate-800 mx-auto mb-4 sm:mb-6" />
                                        <p className="text-[9px] sm:text-[10px] font-black text-slate-700 uppercase tracking-widest">SUBIR FOTO</p>
                                    </div>
                                )}

                                {uploading && (
                                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-20">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 sm:mb-6"></div>
                                        <span className="text-[10px] sm:text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em]">REVELANDO...</span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/90 to-violet-600/80 opacity-0 group-hover/bio:opacity-100 transition-all duration-500 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <Camera className="w-10 h-10 sm:w-14 sm:h-14 text-white mb-3 sm:mb-4 animate-bounce" />
                                    <span className="text-[10px] sm:text-[12px] font-black text-white uppercase tracking-widest">ACTUALIZAR RETRATO</span>
                                </div>
                            </div>

                            <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 flex flex-col gap-3 sm:gap-4 z-40">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); if (!uploading) fileInputRef.current?.click(); }}
                                    className="bg-indigo-600 text-white p-5 sm:p-7 rounded-2xl sm:rounded-[32px] shadow-3xl border-4 sm:border-8 border-[#0A0C14] hover:rotate-[25deg] transition-all hover:bg-amber-500 cursor-pointer group/upload"
                                >
                                    {uploading ? <Clock className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" /> : <UploadIcon className="w-6 h-6 sm:w-8 sm:h-8 group-hover/upload:scale-110 transition-transform" />}
                                </button>
                                {selectedStudent.photo_url && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDeletePhoto(); }}
                                        className="bg-red-600 text-white p-3.5 sm:p-5 rounded-xl sm:rounded-3xl shadow-2xl border-4 border-[#0A0C14] hover:scale-110 transition-all hover:bg-red-500 cursor-pointer flex items-center justify-center animate-in zoom-in duration-300"
                                        title="Eliminar Foto"
                                    >
                                        <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-6 md:space-y-10 relative z-10">
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex items-center justify-center md:justify-start gap-4">
                                    <div className="h-0.5 w-8 md:w-12 bg-amber-500/40"></div>
                                    <p className="text-amber-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.4em] md:tracking-[0.7em]">MÚSICO DE ORQUESTA</p>
                                </div>
                                <h3 className="text-2xl sm:text-4xl md:text-[5.5rem] font-black text-white italic tracking-tighter uppercase leading-[0.85] md:leading-[0.7] drop-shadow-2xl">{selectedStudent.name}</h3>
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 sm:gap-4 md:gap-8">
                                <div className="bg-indigo-600/10 text-indigo-300 border border-indigo-500/20 px-4 sm:px-6 md:px-12 py-2.5 sm:py-3 md:py-5 rounded-xl sm:rounded-[20px] md:rounded-[32px] flex items-center gap-2 sm:gap-3 md:gap-4 transition-all hover:bg-indigo-500/20">
                                    <Music className="w-4 h-4 sm:w-6 sm:h-6" />
                                    <span className="text-[10px] sm:text-xs md:text-base font-black uppercase tracking-[0.1em] md:tracking-[0.2em]">{selectedStudent.instrument || 'SIN INSTRUMENTO'}</span>
                                </div>
                                <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-4 sm:px-6 md:px-12 py-2.5 sm:py-3 md:py-5 rounded-xl sm:rounded-[20px] md:rounded-[32px] flex items-center gap-2 sm:gap-3 md:gap-4 transition-all hover:bg-amber-500/20">
                                    <MapPin className="w-4 h-4 sm:w-6 sm:h-6" />
                                    <span className="text-[10px] sm:text-xs md:text-base font-black uppercase tracking-[0.1em] md:tracking-[0.2em]">{selectedStudent.course}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Information Grid - Simplified Luxury */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 md:gap-16">
                        <section className="bg-slate-950/40 p-6 sm:p-10 md:p-16 rounded-3xl md:rounded-[72px] border border-white/5 space-y-6 sm:space-y-10 md:space-y-14 shadow-3xl hover:border-indigo-500/20 transition-all group/info relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
                            <h4 className="text-[10px] md:text-[13px] font-black text-indigo-400 uppercase tracking-[0.4em] md:tracking-[0.7em] flex items-center gap-4 md:gap-6">
                                <div className="w-12 md:w-16 h-px bg-indigo-500/40 group-hover/info:w-24 transition-all duration-700"></div> IDENTIDAD
                            </h4>
                            <div className="space-y-8 md:space-y-12">
                                <div className="group/field">
                                    <p className="text-[9px] md:text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-3 md:mb-4 group-hover/field:text-indigo-400 transition-colors">Nombre del Estudiante</p>
                                    <p className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter italic leading-none">{selectedStudent.name}</p>
                                </div>
                                <div className="group/field">
                                    <p className="text-[9px] md:text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-3 md:mb-4 group-hover/field:text-indigo-400 transition-colors">Correo Electrónico</p>
                                    <p className="text-xs md:text-sm font-bold text-white/90 lowercase truncate tracking-wider">{selectedStudent.email || 'UNREGISTERED'}</p>
                                </div>
                                <div className="group/field">
                                    <p className="text-[9px] md:text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-3 md:mb-4 group-hover/field:text-indigo-400 transition-colors">Teléfono / WhatsApp Estudiante</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
                                        <p className="text-xl md:text-3xl font-black text-emerald-400 tracking-tighter">{selectedStudent.phone || 'SIN REGISTRO'}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-slate-950/40 p-6 sm:p-10 md:p-16 rounded-3xl md:rounded-[72px] border border-white/5 space-y-6 sm:space-y-10 md:space-y-14 shadow-3xl hover:border-amber-500/20 transition-all group/info relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full"></div>
                            <h4 className="text-[10px] md:text-[13px] font-black text-amber-500 uppercase tracking-[0.4em] md:tracking-[0.7em] flex items-center gap-4 md:gap-6">
                                <div className="w-12 md:w-16 h-px bg-amber-500/40 group-hover/info:w-24 transition-all duration-700"></div> SEGURIDAD
                            </h4>
                            <div className="space-y-8 md:space-y-12">
                                <div className="group/field">
                                    <p className="text-[9px] md:text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-3 md:mb-4 group-hover/field:text-amber-500 transition-colors">Apoderado Responsable</p>
                                    <p className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter italic leading-none">{selectedStudent.parent_name || 'SIN REGISTRO'}</p>
                                </div>
                                <div className="group/field">
                                    <p className="text-[9px] md:text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-3 md:mb-4 group-hover/field:text-amber-500 transition-colors">Línea de Emergencia</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]"></div>
                                        <p className="text-xl md:text-3xl font-black text-amber-400 tracking-tighter">{selectedStudent.parent_phone || 'SIN REGISTRO'}</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === 'edit') {
        return (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-16 rounded-3xl sm:rounded-[80px] border border-white/5 shadow-[0_64px_128px_rgba(0,0,0,0.8)]">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-20 relative z-10">
                        <div className="flex items-center gap-8">
                            <button onClick={() => setViewMode(selectedStudent ? 'detail' : 'grid')} className="p-5 bg-slate-950 hover:bg-slate-900 rounded-[28px] transition-all border border-white/10 hover:border-indigo-500/50">
                                <ChevronLeft className="w-8 h-8 text-white" />
                            </button>
                            <div>
                                <h2 className="text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
                                    {selectedStudent ? 'Actualizar' : 'Inscribir'} <span className="text-indigo-400">Maestro</span>
                                </h2>
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.6em] mt-4">TERMINAL DE EDICIÓN AVANZADA</p>
                            </div>
                        </div>
                        <div className="hidden md:block text-right">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-2 font-mono">CODE: {selectedStudent ? selectedStudent.id.substring(0, 8) : 'NEW_ENTRY'}</p>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] bg-indigo-500/10 px-4 py-2 rounded-full inline-block border border-indigo-500/20">{selectedStudent ? 'MODIFICANDO DATOS' : 'NUEVO REGISTRO'}</p>
                        </div>
                    </header>

                    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-20">
                        <div className="lg:col-span-4 flex flex-col items-center gap-10">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <div className="relative">
                                <div
                                    className="relative group/edit-photo cursor-pointer w-64 h-64 rounded-[56px] overflow-hidden border-4 border-white/5 shadow-2xl bg-slate-950 flex items-center justify-center transition-all group-hover/edit-photo:scale-105 duration-700"
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                >
                                    {editForm.photo_url ? (
                                        <img src={editForm.photo_url} alt="Preview" className="w-full h-full object-cover object-center" />
                                    ) : (
                                        <div className="text-center">
                                            <UserPlus className="w-20 h-20 text-slate-800 mx-auto mb-4" />
                                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">FOTO REQUERIDA</p>
                                        </div>
                                    )}

                                    {uploading && (
                                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
                                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">CARGANDO...</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-indigo-600/80 opacity-0 group-hover/edit-photo:opacity-100 transition-all duration-300 flex flex-col items-center justify-center backdrop-blur-sm">
                                        <Camera className="w-12 h-12 text-white mb-3" />
                                        <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{uploading ? 'ESPERE...' : 'Subir Imagen'}</span>
                                    </div>
                                </div>

                                <div className="absolute -bottom-4 -right-4 flex flex-col gap-3 z-40">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); if (!uploading) fileInputRef.current?.click(); }}
                                        className="bg-white text-slate-950 p-6 rounded-[28px] shadow-[0_24px_48px_rgba(255,255,255,0.15)] border-8 border-slate-900 hover:rotate-12 transition-all hover:scale-110"
                                    >
                                        <UploadIcon className="w-7 h-7" />
                                    </button>
                                    {editForm.photo_url && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDeletePhoto(); }}
                                            className="bg-red-600 text-white p-4 rounded-2xl shadow-xl border-4 border-slate-900 hover:scale-110 transition-all hover:bg-red-500 cursor-pointer animate-in zoom-in duration-300 flex items-center justify-center"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="text-center max-w-[280px]">
                                <p className="text-[11px] font-black text-slate-400 underline decoration-indigo-500/50 decoration-2 underline-offset-8 uppercase tracking-[0.3em] mb-6">REQUISITOS DE IMAGEN</p>
                                <ul className="text-[9px] font-bold text-slate-500 uppercase leading-loose space-y-1">
                                    <li>• Formato JPG / PNG</li>
                                    <li>• Relación de aspecto 1:1</li>
                                    <li>• Alta resolución (Min. 512px)</li>
                                </ul>
                            </div>
                        </div>

                        <div className="lg:col-span-8 space-y-20">
                            <div className="space-y-12 group/section">
                                <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.6em] flex items-center gap-6">
                                    <div className="w-16 h-px bg-indigo-500/30 group-hover/section:w-24 transition-all duration-700"></div> EXPEDIENTE ACADÉMICO
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">Nombre del Estudiante</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                            className="w-full bg-slate-950 border-2 border-white/5 rounded-[36px] p-8 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all uppercase placeholder:text-slate-800 shadow-2xl"
                                            placeholder="EJ: ALEJANDRO MARTÍNEZ"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">Instrumento Principal</label>
                                        <input
                                            type="text"
                                            value={editForm.instrument}
                                            onChange={e => setEditForm(p => ({ ...p, instrument: e.target.value }))}
                                            className="w-full bg-slate-950 border-2 border-white/5 rounded-[36px] p-8 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all uppercase placeholder:text-slate-800 shadow-2xl"
                                            placeholder="EJ: VIOLONCHELO"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">Año Académico / Curso</label>
                                        <input
                                            type="text"
                                            value={editForm.course}
                                            onChange={e => setEditForm(p => ({ ...p, course: e.target.value }))}
                                            className="w-full bg-slate-950 border-2 border-white/5 rounded-[36px] p-8 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all uppercase placeholder:text-slate-800 shadow-2xl"
                                            placeholder="EJ: 4TO AÑO"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">Correo Institucional</label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                                            className="w-full bg-slate-950 border-2 border-white/5 rounded-[36px] p-8 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-800 shadow-2xl"
                                            placeholder="CORREO@EJEMPLO.COM"
                                        />
                                    </div>
                                    <div className="space-y-4 md:col-span-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">WhatsApp Directo</label>
                                        <input
                                            type="text"
                                            value={editForm.phone}
                                            onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                                            className="w-full bg-slate-950 border-2 border-white/5 rounded-[36px] p-8 text-sm font-black text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-800 shadow-2xl"
                                            placeholder="+56 9 XXXX XXXX"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 sm:p-16 bg-white/[0.02] rounded-3xl sm:rounded-[64px] border border-white/5 space-y-6 sm:space-y-12 group/section relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-3xl rounded-full"></div>
                                <h4 className="text-[12px] font-black text-amber-500 uppercase tracking-[0.6em] flex items-center gap-6">
                                    <div className="w-16 h-px bg-amber-500/30 group-hover/section:w-24 transition-all duration-700"></div> PROTOCOLO DE CONFIANZA
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">Apoderado Responsable</label>
                                        <input
                                            type="text"
                                            value={editForm.parent_name}
                                            onChange={e => setEditForm(p => ({ ...p, parent_name: e.target.value }))}
                                            className="w-full bg-slate-950 border-2 border-white/5 rounded-[36px] p-8 text-sm font-black text-white focus:border-amber-500/50 outline-none transition-all uppercase placeholder:text-slate-800"
                                            placeholder="NOMBRE DEL ADULTO RESPONSABLE"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">Línea de Vida (Emergencia)</label>
                                        <input
                                            type="text"
                                            value={editForm.parent_phone}
                                            onChange={e => setEditForm(p => ({ ...p, parent_phone: e.target.value }))}
                                            className="w-full bg-slate-950 border-2 border-white/5 rounded-[36px] p-8 text-sm font-black text-white focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-800"
                                            placeholder="+56 9 XXXX XXXX"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-8 pt-12">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex-[2] bg-indigo-600 text-white font-black py-8 rounded-[32px] flex items-center justify-center gap-4 shadow-[0_32px_64px_-16px_rgba(192,38,211,0.5)] hover:bg-indigo-500 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 group/save border-t border-white/20"
                                >
                                    <Save className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                                    {loading ? 'SINCRONIZANDO...' : (selectedStudent ? 'CONFIRMAR CAMBIOS' : 'GUARDAR MAESTRO')}
                                </button>
                                <button
                                    onClick={() => setViewMode(selectedStudent ? 'detail' : 'grid')}
                                    className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-400 font-black py-8 rounded-[32px] transition-all border border-white/5 cursor-pointer flex items-center justify-center gap-4 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                    DESCARTAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-16 animate-in fade-in duration-700">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12">
                <div className="space-y-4 md:space-y-6 w-full">
                    <h2 className="text-3xl md:text-[5rem] font-black italic tracking-tighter text-white uppercase leading-[0.9] md:leading-[0.75] animate-in slide-in-from-left duration-1000">
                        Estudiantes <br />
                        <span className="text-indigo-500">orquesta</span>
                    </h2>
                    <div className="flex items-center gap-3 md:gap-6 py-2 md:py-4">
                        <div className="h-0.5 md:h-1 w-12 md:w-24 bg-indigo-600 rounded-full"></div>
                        <p className="text-slate-600 font-bold text-[8px] md:text-xs tracking-[0.3em] md:tracking-[0.5em] uppercase">Base de Datos Centralizada • OSWT</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-6 w-full xl:w-auto">
                    <div className="relative group flex-1 w-full lg:w-[500px]">
                        <Search className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-700 group-focus-within:text-white transition-colors" />
                        <input
                            type="text"
                            placeholder="FILTRAR POR NOMBRE O INSTRUMENTO..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950/60 border-2 border-white/5 rounded-[30px] md:rounded-[40px] py-5 md:py-8 pl-16 md:pl-20 pr-8 md:pr-10 text-xs md:text-sm font-black text-white focus:border-indigo-500/40 outline-none transition-all uppercase placeholder:text-slate-800 placeholder:tracking-widest shadow-2xl"
                        />
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="w-full sm:w-auto bg-white text-slate-950 p-6 md:p-8 rounded-[30px] md:rounded-[40px] shadow-[0_32px_64px_-20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all group flex items-center justify-center gap-4"
                    >
                        <UserPlus className="w-6 h-6 md:w-7 md:h-7" />
                        <span className="font-black text-xs md:text-sm uppercase italic tracking-tighter">Añadir Estudiante</span>
                    </button>
                </div>
            </div>
            <div className="bg-slate-900/20 border border-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in duration-500">
                <div className="overflow-x-auto custom-scrollbar w-full max-w-full">
                    <table className="min-w-full table-auto">
                        <thead className="bg-[#020617] border-b border-slate-900/50">
                            <tr>
                                <th className="px-8 py-6 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] w-16">#</th>
                                <th className="px-8 py-6 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Nombre y Apellidos</th>
                                <th className="px-8 py-6 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Curso</th>
                                <th className="px-8 py-6 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Instrumento</th>
                                <th className="px-8 py-6 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Teléfono Personal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/30 bg-[#020617]/40">
                            {filteredStudents.map((student, idx) => (
                                <tr
                                    key={student.id}
                                    className="group hover:bg-slate-900/40 border-b border-slate-900/10 cursor-pointer transition-colors"
                                    onClick={() => handleSelectStudent(student)}
                                >
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <span className="text-[11px] font-black text-slate-700 tracking-widest">{idx + 1}</span>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            {/* Mini avatar thumbnail for visual premium touch */}
                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center shrink-0">
                                                {student.photo_url ? (
                                                    <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-4 h-4 text-slate-600" />
                                                )}
                                            </div>
                                            <span className="text-[13px] font-black text-white tracking-tight uppercase group-hover:text-indigo-400 transition-colors">
                                                {student.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                                            {student.course}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                                            {student.instrument || 'SIN INSTRUMENTO'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap">
                                        <span className="text-[12px] font-black text-emerald-400 font-mono tracking-tight">
                                            {student.phone || 'SIN REGISTRO'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Search className="w-10 h-10 text-slate-800" />
                                            <h3 className="text-sm font-black text-slate-600 uppercase tracking-[0.3em]">Sin resultados</h3>
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

export default DirectoryView;
