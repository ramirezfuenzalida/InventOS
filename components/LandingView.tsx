import React, { useState } from 'react';
import { 
  Shield, Clock, Users, ArrowRight, Music, BarChart3, QrCode, FileText, 
  ChevronRight, Sparkles, Check, CheckCircle2, PhoneCall, Building2, 
  Smartphone, Volume2, Award, FileDown, Lock, Mail, Phone, User
} from 'lucide-react';

interface LandingViewProps {
  onLoginClick: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onLoginClick }) => {
  const [activeTab, setActiveTab] = useState<'checkout' | 'qr' | 'students' | 'analytics'>('checkout');
  const [quoteForm, setQuoteForm] = useState({
    schoolName: '',
    contactName: '',
    email: '',
    phone: '',
    assetCount: '50-150',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const logoUrl = '/logo_orquesta_sinfonica_wt.png';

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 overflow-x-hidden relative font-sans">
      {/* GLOW DECORATIONS (AURAS) */}
      <div className="absolute top-0 left-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-indigo-500/10 blur-[120px] md:blur-[160px] rounded-full aura-glow pointer-events-none -translate-y-1/2"></div>
      <div className="absolute top-1/3 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-emerald-500/5 blur-[100px] md:blur-[140px] rounded-full aura-glow pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-rose-500/5 blur-[100px] md:blur-[140px] rounded-full aura-glow pointer-events-none"></div>

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#020617]/70 border-b border-white/5 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-2xl p-1.5 flex items-center justify-center shadow-lg">
              <img src={logoUrl} alt="OSWT Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-xl font-black text-white italic tracking-tighter uppercase leading-none block">
                Invent<span className="text-indigo-400">OS</span>
              </span>
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none block">
                BY OSWT APP
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-black uppercase tracking-widest text-slate-400">
            <a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a>
            <a href="#modulos" className="hover:text-white transition-colors">Módulos</a>
            <a href="#movilidad" className="hover:text-white transition-colors">Movilidad</a>
            <a href="#cotizar" className="hover:text-white transition-colors">Cotizar</a>
          </nav>

          <button 
            onClick={onLoginClick}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 border-t border-white/10"
          >
            Acceder al Sistema
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-24 md:py-32 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        <div className="lg:col-span-7 space-y-8 text-left relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Tecnología Educativa Premium
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-[0.9] drop-shadow-lg">
            El sonido del orden. <br />
            <span className="text-indigo-400 bg-gradient-to-r from-indigo-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">Protege y Gestiona</span> <br />
            los activos de tu colegio.
          </h1>

          <p className="text-slate-400 font-medium text-base sm:text-lg leading-relaxed max-w-2xl">
            La plataforma líder diseñada para digitalizar inventarios, rastrear préstamos a hogares al <strong>0% de pérdida</strong> y simplificar eventos en terreno de forma inteligente y automatizada.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <a 
              href="#cotizar" 
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest px-8 py-5 rounded-[1.8rem] transition-all shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-3 hover:scale-105 active:scale-95 border-t border-white/10 text-center"
            >
              <PhoneCall className="w-5 h-5" /> Agendar Demo Gratuita
            </a>
            <button 
              onClick={onLoginClick}
              className="bg-slate-900/50 hover:bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white font-black text-sm uppercase tracking-widest px-8 py-5 rounded-[1.8rem] transition-all flex items-center justify-center gap-2"
            >
              Ingreso Monitores <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5 max-w-lg">
            <div>
              <p className="text-3xl font-black text-white leading-none">0%</p>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Pérdida de Equipos</p>
            </div>
            <div>
              <p className="text-3xl font-black text-indigo-400 leading-none">95%</p>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Ahorro Administrativo</p>
            </div>
            <div>
              <p className="text-3xl font-black text-emerald-400 leading-none">3s</p>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Registro de Préstamo</p>
            </div>
          </div>
        </div>

        {/* HERO MOCKUP (INTERACTION PREVIEW IN CSS) */}
        <div className="lg:col-span-5 relative mt-6 lg:mt-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent blur-2xl rounded-full"></div>
          
          {/* CSS Drawn Luxury Dashboard Mockup */}
          <div className="bg-[#0b0f24]/85 border border-white/10 rounded-[3rem] p-6 shadow-2xl relative overflow-hidden backdrop-blur-md animate-float">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-emerald-400"></div>
            
            {/* Header simulated */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              </div>
              <div className="bg-slate-950 px-3 py-1 rounded-full border border-white/5">
                <p className="text-[8px] font-mono text-slate-500 tracking-wider">SECURE: SYSTEM_OK</p>
              </div>
            </div>

            {/* Dashboard Title */}
            <div className="py-4 text-left">
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">RESUMEN EJECUTIVO</p>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">COLEGIO PRINCIPAL</h3>
            </div>

            {/* Simulated Widgets */}
            <div className="grid grid-cols-2 gap-3 pb-4">
              <div className="bg-[#020617] border border-white/5 rounded-2xl p-3 text-left">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">EN HOGAR</p>
                <p className="text-2xl font-black text-indigo-400 mt-1">42 Activos</p>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2">
                  <div className="w-[70%] bg-indigo-500 h-full rounded-full"></div>
                </div>
              </div>
              <div className="bg-[#020617] border border-white/5 rounded-2xl p-3 text-left">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">EN TALLER</p>
                <p className="text-2xl font-black text-rose-500 mt-1">3 Reparar</p>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2">
                  <div className="w-[15%] bg-rose-500 h-full rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Mini movement list preview */}
            <div className="space-y-2 text-left">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">HISTORIAL EN TIEMPO REAL</p>
              
              <div className="bg-[#020617]/50 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-[9px] hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <div>
                    <p className="text-white font-bold uppercase leading-none">🎻 VIOLÍN STRAD-12</p>
                    <p className="text-[7px] text-slate-500 uppercase mt-0.5">DEVUELTO POR MAURICIO A.</p>
                  </div>
                </div>
                <span className="text-[7px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">SALA</span>
              </div>

              <div className="bg-[#020617]/50 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-[9px] hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <div>
                    <p className="text-white font-bold uppercase leading-none">🎷 SAXO ALTO YAM-4</p>
                    <p className="text-[7px] text-slate-500 uppercase mt-0.5">RETIRADO POR SOFÍA DIAZ</p>
                  </div>
                </div>
                <span className="text-[7px] font-black bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">HOGAR</span>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-6 -right-6 bg-slate-950 border-2 border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-bounce">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">TECNOLOGÍA</p>
              <p className="text-[11px] font-black text-white uppercase italic tracking-tighter">Escáner QR Integrado</p>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PILLARS */}
      <section id="beneficios" className="py-24 border-t border-white/5 bg-[#020617]/40 relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">BENEFICIOS INSTITUCIONALES</p>
            <h2 className="text-3xl sm:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
              Diseñado para Directores, <br />Sencillo para Profesores.
            </h2>
            <div className="w-16 h-1 bg-indigo-500 rounded-full mx-auto mt-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* CARD 1 */}
            <div className="bg-[#0b0f24]/30 border border-white/5 rounded-[2.5rem] p-10 hover:bg-[#0b0f24]/60 hover:border-indigo-500/20 transition-all hover:-translate-y-2 group shadow-xl relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl rounded-full"></div>
              <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-[1.5rem] flex items-center justify-center text-indigo-400 mb-8 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">🛡️ Blindaje Total de Activos</h3>
              <p className="text-slate-400 text-sm font-semibold leading-relaxed">
                Protege tu inversión institucional. Registra las especificaciones, mantenciones, estado físico y marcas de desgaste de cada pieza con un log clínico imborrable.
              </p>
            </div>

            {/* CARD 2 */}
            <div className="bg-[#0b0f24]/30 border border-white/5 rounded-[2.5rem] p-10 hover:bg-[#0b0f24]/60 hover:border-emerald-500/20 transition-all hover:-translate-y-2 group shadow-xl relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 blur-3xl rounded-full"></div>
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] flex items-center justify-center text-emerald-400 mb-8 group-hover:scale-110 transition-transform">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">⏰ 95% Menos Tiempo Administrativo</h3>
              <p className="text-slate-400 text-sm font-semibold leading-relaxed">
                Evita las planillas y el papel. Los profesores pueden escanear y registrar salidas en 3 segundos desde su teléfono inteligente. Más tiempo para enseñar, menos para archivar.
              </p>
            </div>

            {/* CARD 3 */}
            <div className="bg-[#0b0f24]/30 border border-white/5 rounded-[2.5rem] p-10 hover:bg-[#0b0f24]/60 hover:border-rose-500/20 transition-all hover:-translate-y-2 group shadow-xl relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 blur-3xl rounded-full"></div>
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-[1.5rem] flex items-center justify-center text-rose-400 mb-8 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">👨‍👩‍👧‍👦 Fomento de la Responsabilidad</h3>
              <p className="text-slate-400 text-sm font-semibold leading-relaxed">
                Involucra al hogar. Conecta a los alumnos con su apoderado responsable y establece líneas de contacto de emergencia directas, creando un ecosistema de cuidado mutuo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MODULE SHOWCASE (INTERACTIVE TABS) */}
      <section id="modulos" className="py-24 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-16">
            <div className="text-left space-y-3">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">EXPLORA LA PLATAFORMA</p>
              <h2 className="text-3xl sm:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
                La Suite Tecnológica Escolar
              </h2>
            </div>
            
            {/* Tab controls */}
            <div className="flex flex-wrap p-1.5 bg-[#0b0f24]/80 border border-white/5 rounded-3xl w-full lg:w-auto overflow-hidden">
              <button 
                onClick={() => handleTabChange('checkout')}
                className={`flex-1 lg:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'checkout' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                Préstamos Express
              </button>
              <button 
                onClick={() => handleTabChange('qr')}
                className={`flex-1 lg:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'qr' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                Control QR
              </button>
              <button 
                onClick={() => handleTabChange('students')}
                className={`flex-1 lg:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'students' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                Expedientes Alumnos
              </button>
              <button 
                onClick={() => handleTabChange('analytics')}
                className={`flex-1 lg:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                Auditorías & KPIs
              </button>
            </div>
          </div>

          {/* TAB CONTENT GRID */}
          <div className="bg-[#0b0f24]/30 border border-white/5 rounded-[3rem] p-8 sm:p-14 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>

            {activeTab === 'checkout' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left animate-in fade-in duration-500">
                <div className="lg:col-span-7 space-y-6">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                    Terminal de Préstamos Inteligente y Antiduplicación
                  </h3>
                  <p className="text-slate-400 text-sm font-semibold leading-relaxed">
                    Un sistema blindado contra pérdidas. Cuando un docente va a asignar un recurso a un alumno, el sistema verifica en tiempo real sus préstamos pendientes. Si el alumno tiene un artículo retenido en su hogar, el software restringe la transacción de inmediato.
                  </p>
                  <ul className="space-y-3 font-bold text-xs uppercase tracking-wider text-slate-300">
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Búsqueda predictiva integrada de alumnos y activos</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Control estricto antiduplicados (1 alumno = 1 equipo)</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Selección de fecha calendario rápida</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Devoluciones en un clic con restauración de ubicación</li>
                  </ul>
                </div>
                <div className="lg:col-span-5 bg-slate-950/70 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                      ⚠️ CONTROL ACTIVO
                    </span>
                    <span className="text-[8px] font-mono text-slate-500">REG: 94829</span>
                  </div>
                  <div className="text-left space-y-1">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">RESPONSABLE DETECTADO</p>
                    <p className="text-lg font-black text-white uppercase italic leading-none">ALEJANDRO MARTÍNEZ</p>
                    <p className="text-[8px] font-black text-emerald-500 uppercase mt-1">4TO AÑO ORQUESTA</p>
                  </div>
                  <div className="bg-[#020617] border border-rose-500/20 rounded-2xl p-4 text-left border-dashed text-xs space-y-2">
                    <p className="text-white font-black">⚠️ ALERTA DE RESTRICCIÓN</p>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      El estudiante ya posee un préstamo activo: <strong>🎻 VIOLONCHELO STRAD-3</strong>.
                    </p>
                    <p className="text-[8.5px] text-rose-400 font-black uppercase tracking-widest mt-2">
                      Realice el retorno del artículo anterior primero.
                    </p>
                  </div>
                  <button className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                    Solicitar Retorno de Instrumento
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'qr' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left animate-in fade-in duration-500">
                <div className="lg:col-span-7 space-y-6">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                    Escaneo QR Móvil con Sonido de Validación
                  </h3>
                  <p className="text-slate-400 text-sm font-semibold leading-relaxed">
                    Perfecto para desfiles, conciertos, olimpiadas científicas o viajes escolares. Genera etiquetas QR únicas para tus artículos. Los profesores escanean los códigos con la cámara de sus teléfonos inteligentes en la fila del autobús. 
                  </p>
                  <ul className="space-y-3 font-bold text-xs uppercase tracking-wider text-slate-300">
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Compatible con cualquier cámara móvil (PWA nativo)</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Pitidos sonoros Web Audio API (Éxito = agudo, Error = buzz grave)</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Ubicación en tránsito automática ("En Concierto: Glorias Navales")</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Reportes PDF con áreas para la firma del Director</li>
                  </ul>
                </div>
                <div className="lg:col-span-5 bg-slate-950/70 border border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-6 relative">
                  
                  {/* QR scanner visual simulation */}
                  <div className="w-full aspect-square max-w-[200px] border-2 border-indigo-500/30 rounded-3xl relative overflow-hidden flex items-center justify-center bg-black/50 p-6">
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-500"></div>
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-500"></div>
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-500"></div>
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-500"></div>
                    
                    {/* Glowing QR grid */}
                    <div className="w-28 h-28 opacity-45 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px] border border-white/10 rounded-lg"></div>
                    
                    {/* Scanner line animate */}
                    <div className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_#6366f1] top-1/2 -translate-y-1/2 animate-pulse"></div>
                  </div>

                  <div className="bg-[#020617] border border-indigo-500/10 rounded-2xl py-3 px-6 text-center w-full flex items-center justify-center gap-3">
                    <Volume2 className="w-5 h-5 text-indigo-400 animate-bounce" />
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">
                      AUDIO-BEEP VALIDACIÓN ACTIVO
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left animate-in fade-in duration-500">
                <div className="lg:col-span-7 space-y-6">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                    Fichero Digital del Alumno y Línea de Apoderados
                  </h3>
                  <p className="text-slate-400 text-sm font-semibold leading-relaxed">
                    Un registro centralizado con la ficha de tus estudiantes. Permite cargar sus retratos en tiempo real a Supabase Storage, registrar sus datos escolares, números de contacto y, sobre todo, los datos del apoderado responsable con su línea de emergencia.
                  </p>
                  <ul className="space-y-3 font-bold text-xs uppercase tracking-wider text-slate-300">
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Galería de Retratos fotográficos con cámara móvil integrada</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Registro de WhatsApp directo de apoderados ("Línea de Vida")</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Historial de instrumentos tomados en préstamo por alumno</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Sincronización multi-usuario en tiempo real entre docentes</li>
                  </ul>
                </div>
                <div className="lg:col-span-5 bg-slate-950/70 border border-white/5 rounded-3xl p-6 sm:p-8 text-left space-y-5">
                  <div className="flex items-center gap-4">
                    {/* Simulated Student Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl font-black">
                      CM
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white uppercase italic leading-none">CAMILA MATTE</h4>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Instrumento: Clarinete</p>
                      <p className="text-[8px] font-black text-emerald-400 uppercase mt-0.5">3ro Medio B</p>
                    </div>
                  </div>
                  <div className="bg-[#020617] border border-white/5 rounded-2xl p-4 text-xs space-y-3">
                    <div>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">APODERADO RESPONSABLE</p>
                      <p className="text-white font-bold uppercase">PATRICIO MATTE</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">LÍNEA DE EMERGENCIA</p>
                      <p className="text-amber-400 font-bold tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-glow"></span>
                        +56 9 8765 4321
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left animate-in fade-in duration-500">
                <div className="lg:col-span-7 space-y-6">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                    Dashboard Ejecutivo y Reportes PDF de Auditoría
                  </h3>
                  <p className="text-slate-400 text-sm font-semibold leading-relaxed">
                    Toma el control absoluto de tus inventarios. El sistema recopila datos históricos en caliente, generando reportes PDF automáticos ideales para justificaciones de fondos públicos, subvenciones y reuniones con la directiva escolar.
                  </p>
                  <ul className="space-y-3 font-bold text-xs uppercase tracking-wider text-slate-300">
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Reportes automáticos de pérdidas e incidencias</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Auditorías descargables listas para imprimir con firmas</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Gráficas intuitivas de estados de conservación de activos</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Exportaciones Excel limpias de toda la base de datos</li>
                  </ul>
                </div>
                <div className="lg:col-span-5 bg-slate-950/70 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-5">
                  <div className="bg-[#020617] border border-white/5 rounded-2xl p-4 text-xs text-left space-y-4">
                    <div className="flex items-center gap-3 text-indigo-400">
                      <FileText className="w-5 h-5" />
                      <p className="text-[10px] font-black uppercase tracking-widest">auditoria_anual_2026.pdf</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                        <span>Éxito de Retorno</span>
                        <span className="text-emerald-500">100% Completo</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="w-full bg-emerald-500 h-full rounded-full"></div>
                      </div>
                    </div>
                    <div className="border-t border-white/5 pt-3 flex gap-3 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                      <div>
                        <span>Firmado por Encargado</span>
                        <div className="w-16 h-4 border-b border-indigo-500/30 font-mono text-[7px] text-slate-600 mt-1">SIGNED_OK</div>
                      </div>
                      <div>
                        <span>Firmado por Director</span>
                        <div className="w-16 h-4 border-b border-indigo-500/30 font-mono text-[7px] text-slate-600 mt-1">SIGNED_OK</div>
                      </div>
                    </div>
                  </div>
                  <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    <FileDown className="w-4 h-4" /> Exportar Informe de Auditoría PDF
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* MOBILE QR VALIDATION SECTION */}
      <section id="movilidad" className="py-24 border-t border-white/5 bg-[#020617]/40 relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Elegant glassmorphic phone frame simulated in CSS */}
            <div className="w-full max-w-[280px] bg-slate-950 border-[6px] border-slate-900 rounded-[3rem] p-4 shadow-3xl relative overflow-hidden aspect-[9/18]">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-camera bg-slate-800"></span>
              </div>
              
              {/* Phone screen content */}
              <div className="bg-[#020617] h-full rounded-[2.5rem] p-4 flex flex-col justify-between text-left relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-indigo-600/10 blur-2xl rounded-full"></div>
                
                {/* Simulated App Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2 pt-2">
                  <span className="text-[8px] font-black text-indigo-400">INVENTOS SCANNER</span>
                  <span className="text-[6px] font-mono text-slate-500">v2.0.F</span>
                </div>

                {/* Scan success popup inside phone */}
                <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-3 z-10 my-auto shadow-2xl animate-in zoom-in-95">
                  <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-white uppercase tracking-wider">RETORNO REGISTRADO</h5>
                    <p className="text-[7.5px] text-slate-400 font-bold uppercase mt-1 leading-tight">
                      🎻 VIOLÍN WT-04 <br /> Devuelto con éxito por Camila Matte
                    </p>
                  </div>
                  <span className="text-[6.5px] font-black bg-emerald-500/15 text-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest inline-block">
                    📍 SALA DE MÚSICA
                  </span>
                </div>

                {/* Simulating scanning button */}
                <div className="bg-slate-950/70 border border-white/5 rounded-xl py-2 px-3 text-center flex items-center justify-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest">PLAYING: SCAN_BEEP</span>
                </div>
              </div>
            </div>

            {/* floating audio details badge */}
            <div className="absolute top-12 -left-6 bg-slate-950 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-xl max-w-[160px] text-left">
              <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">AUDIO RETALIMENTACIÓN</p>
              <p className="text-[9px] font-black text-white uppercase mt-1">Web Audio API Beep</p>
              <p className="text-[8px] text-slate-500 font-medium leading-tight mt-1">Pitidos de éxito y buzz graves de error en tiempo real.</p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Smartphone className="w-3.5 h-3.5" /> 100% Móvil y PWA
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
              Diseño Inteligente Pensado en la Movilidad Docente
            </h2>

            <p className="text-slate-400 text-base font-semibold leading-relaxed">
              Los profesores no trabajan pegados a sus computadoras. Por eso, InventOS está optimizado como una Aplicación Web Progresiva (PWA). Funciona en tablets, teléfonos y ordenadores sin instalar nada desde la App Store, permitiendo lecturas QR con sonido de feedback auditivo para un control rápido e intuitivo en terreno.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Sonidos Inteligentes
                </h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Permite validar estuches cerrados por códigos de barra o QR escuchando la alerta de sonido sin desviar la mirada de la fila de alumnos.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Sincronización Offline
                </h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Carga los inventarios en el caché local del móvil para operaciones en gimnasios, patios u otros lugares con cobertura inestable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION & FORM (COTIZAR) */}
      <section id="cotizar" className="py-24 border-t border-white/5 relative">
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 text-center space-y-12 relative z-10">
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">¿LISTO PARA COMENZAR?</p>
            <h2 className="text-3xl sm:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
              Moderniza la Gestión de tu Colegio Hoy
            </h2>
            <p className="text-slate-400 text-sm font-semibold leading-relaxed">
              Solicita una cotización a la medida del número de activos de tu colegio o agenda una demostración con nuestro equipo técnico.
            </p>
          </div>

          <div className="bg-[#0b0f24]/50 border border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden backdrop-blur-3xl text-left max-w-2xl mx-auto">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl rounded-full"></div>

            {submitted ? (
              <div className="text-center py-10 space-y-6 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-glow">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">¡Solicitud Recibida!</h3>
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-sm mx-auto">
                    Tu solicitud ha sido catalogada exitosamente. Un especialista en soporte educativo se contactará en menos de 24 horas hábiles.
                  </p>
                </div>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="bg-slate-900 border border-white/5 text-slate-400 hover:text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Enviar otra Solicitud
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* SCHOOL NAME */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">
                      Establecimiento Educativo
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Colegio Taylor"
                        value={quoteForm.schoolName}
                        onChange={e => setQuoteForm(prev => ({ ...prev, schoolName: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-xs font-semibold text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all uppercase tracking-wide"
                      />
                    </div>
                  </div>

                  {/* CONTACT NAME */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">
                      Persona de Contacto
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Director de Música"
                        value={quoteForm.contactName}
                        onChange={e => setQuoteForm(prev => ({ ...prev, contactName: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-xs font-semibold text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all uppercase tracking-wide"
                      />
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="contacto@colegiotaylor.cl"
                        value={quoteForm.email}
                        onChange={e => setQuoteForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-xs font-semibold text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* PHONE */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">
                      Teléfono Directo
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="+56 9 XXXX XXXX"
                        value={quoteForm.phone}
                        onChange={e => setQuoteForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-xs font-semibold text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* RANGE SELECT */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">
                      Volumen Estimado de Activos / Instrumentos
                    </label>
                    <select
                      value={quoteForm.assetCount}
                      onChange={e => setQuoteForm(prev => ({ ...prev, assetCount: e.target.value }))}
                      className="w-full px-5 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer uppercase tracking-wider"
                    >
                      <option value="1-50" className="bg-[#020617] text-white">Menos de 50 Artículos</option>
                      <option value="50-150" className="bg-[#020617] text-white">Entre 50 y 150 Artículos</option>
                      <option value="150-300" className="bg-[#020617] text-white">Entre 150 y 300 Artículos</option>
                      <option value="300+" className="bg-[#020617] text-white">Más de 300 Artículos</option>
                    </select>
                  </div>

                  {/* MESSAGE */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">
                      Mensaje Adicional o Consulta
                    </label>
                    <textarea
                      placeholder="Indícanos si tu institución tiene necesidades particulares..."
                      value={quoteForm.message}
                      onChange={e => setQuoteForm(prev => ({ ...prev, message: e.target.value }))}
                      rows={3}
                      className="w-full px-5 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-xs font-semibold text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all uppercase tracking-wide"
                    ></textarea>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed pt-4"
                >
                  {isSubmitting ? 'Procesando Cotización...' : 'Solicitar Cotización y Demo'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 bg-slate-950/40 relative z-10 text-left">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl p-1 flex items-center justify-center">
              <img src={logoUrl} alt="OSWT Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-sm font-black text-white italic tracking-tighter uppercase leading-none block">
                Invent<span className="text-indigo-400">OS</span>
              </span>
              <span className="text-[6px] font-black text-slate-500 uppercase tracking-widest leading-none block">
                © {new Date().getFullYear()} ORQUESTA WT • ALL RIGHTS RESERVED
              </span>
            </div>
          </div>

          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center md:text-right">
            Desarrollado con ❤️ para la modernización e innovación escolar en la Orquesta Sinfónica William Taylor.
          </p>
        </div>
      </footer>
    </div>
  );
};
