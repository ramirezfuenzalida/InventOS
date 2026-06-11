import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ExternalLink, Info, Smartphone, CheckCircle } from 'lucide-react';

const QRAccessView: React.FC = () => {
  // Estado para la URL base, permitiendo edición manual para corregir "localhost"
  const [customBaseUrl, setCustomBaseUrl] = React.useState(
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://192.168.1.52:3000'
      : window.location.origin
  );
  const studentUrl = `${customBaseUrl}/?mode=student`;

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Estilos CSS específicos de impresión para replicar la identidad visual exacta de la app */}
      <style>{`
        @media print {
          /* Ocultar elementos de la app que no pertenecen al cartel */
          aside,
          header,
          .print-hidden,
          .print\\:hidden,
          button,
          .no-print {
            display: none !important;
          }
          
          /* Fondo blanco de página y dimensiones limpias */
          body, html, #root, .min-h-screen, main {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #020617 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
          }

          /* Contenedor del Cartel (Replica la tarjeta oscura de la app) */
          .access-print-poster {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 1.5cm auto !important;
            padding: 50px !important;
            background-color: #020617 !important; /* Fondo oscuro exacto de la app */
            color: #f1f5f9 !important;
            border: 4px solid rgba(99, 102, 241, 0.3) !important;
            border-radius: 40px !important;
            text-align: center !important;
            max-width: 580px !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3) !important;
          }
          
          /* Replicar marca e identidad (Logo sidebar) */
          .access-print-poster .logo-section {
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            margin-bottom: 40px !important;
          }
          
          .access-print-poster .logo-box {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            padding: 4px !important;
            border-radius: 12px !important;
            width: 48px !important;
            height: 48px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          .access-print-poster .logo-img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }

          .access-print-poster .logo-text-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .access-print-poster .logo-title {
            font-size: 24px !important;
            font-weight: 950 !important;
            font-style: italic !important;
            letter-spacing: -0.05em !important;
            color: #ffffff !important;
            margin: 0 !important;
            line-height: 1 !important;
            font-family: 'Plus Jakarta Sans', sans-serif;
          }

          .access-print-poster .logo-title .highlight {
            color: #6366f1 !important; /* Indigo */
            font-style: normal !important;
          }

          .access-print-poster .logo-subtitle {
            font-size: 7px !important;
            font-weight: 850 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.18em !important;
            color: #64748b !important;
            margin: 4px 0 0 0 !important;
          }

          /* Contenedor del QR (Idéntico al de pantalla) */
          .access-print-poster .qr-card-container {
            background: #ffffff !important;
            padding: 32px !important;
            border-radius: 36px !important;
            border: 4px solid rgba(99, 102, 241, 0.1) !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            margin: 0 auto !important;
          }

          .access-print-poster .qr-card-container svg {
            width: 280px !important;
            height: 280px !important;
          }

          .access-print-poster .qr-footer-text {
            font-size: 9px !important;
            font-weight: 900 !important;
            color: #475569 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.15em !important;
            margin-top: 16px !important;
            display: block !important;
          }

          /* Sección de Instrucciones */
          .access-print-poster .instructions-section {
            margin-top: 40px !important;
            border-top: 1px solid rgba(255,255,255,0.08) !important;
            padding-top: 30px !important;
            width: 100% !important;
          }

          .access-print-poster .instructions-title {
            font-size: 16px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            color: #ffffff !important;
            margin: 0 0 12px 0 !important;
          }

          .access-print-poster .instructions-desc {
            font-size: 11px !important;
            color: #94a3b8 !important;
            line-height: 1.6 !important;
            max-width: 440px !important;
            margin: 0 auto !important;
          }
        }
      `}</style>

      {/* Vista para pantalla interactiva */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-slate-900/40 border border-slate-800 p-10 sm:p-16 rounded-[4rem] shadow-2xl backdrop-blur-xl print:hidden">

        {/* Contenedor del QR */}
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-all" />
            <div className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-indigo-500/20 overflow-hidden flex items-center justify-center">
              <QRCodeSVG
                value={studentUrl}
                size={320}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/logo_orquesta_sinfonica_wt.png",
                  x: undefined,
                  y: undefined,
                  height: 60,
                  width: 60,
                  excavate: true,
                }}
              />
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Escanea para Registrar</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 w-full max-w-xs">
            {isLocalhost && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-left">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Info className="w-3 h-3" /> Atención: Localhost
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                  El QR actual apunta a "localhost". Para que funcione en otros celulares en la misma red Wi-Fi, ingresa aquí tu IP local (ej: http://192.168.x.x:3000).
                </p>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">URL del Servidor / IP</label>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-indigo-500 outline-none"
                    placeholder="http://192.168.1.52:3000"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handlePrint}
              className="w-full bg-white text-slate-950 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-50 transition-all active:scale-95"
            >
              <Printer className="w-5 h-5" /> Imprimir Cartel
            </button>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">Recomendado: Tamaño A4 / Color</p>
          </div>
        </div>

        {/* Instrucciones y Detalles */}
        <div className="space-y-10">
          <div>
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-4 leading-none">
              ACCESO <br /> <span className="text-indigo-500">AUTOGESTIÓN</span>
            </h2>
            <p className="text-slate-400 text-sm font-bold leading-relaxed">
              Escaneando este código, los alumnos podrán registrar la salida o el retorno de sus instrumentos directamente desde su smartphone.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-5">
              <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Sin Login</h4>
                <p className="text-[11px] text-slate-500 font-medium">No requiere usuario ni contraseña para los alumnos.</p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Registro en Vivo</h4>
                <p className="text-[11px] text-slate-500 font-medium">El inventario se actualiza instantáneamente en el panel.</p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Link Directo</h4>
                <a
                  href={studentUrl}
                  target="_blank"
                  className="text-[11px] text-indigo-400 font-black flex items-center gap-1 hover:underline"
                >
                  Abrir link en nueva pestaña <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-950/50 rounded-3xl border border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase italic leading-relaxed">
              💡 Tip: Puedes pegar este código QR en los estuches de los instrumentos más grandes o en la entrada de la sala de ensayo.
            </p>
          </div>
        </div>

      </div>

      {/* Cartel exclusivo para impresión (oculto en pantalla, visible al imprimir) */}
      {/* Mantiene la misma imagen e identidad de marca (logo de barra lateral, colores oscuros, tarjeta QR blanca) */}
      <div className="hidden access-print-poster">
        <div className="logo-section">
          <div className="logo-box">
            <img className="logo-img" src="/logo_orquesta_sinfonica_wt.png" alt="Logo OSWT" />
          </div>
          <div className="logo-text-container">
            <h2 className="logo-title">OSWT<span className="highlight">APP</span></h2>
            <span className="logo-subtitle">Orquesta Sinfónica William Taylor</span>
          </div>
        </div>
        
        <div className="qr-card-container">
          <QRCodeSVG
            value={studentUrl}
            size={280}
            level="H"
            includeMargin={false}
            imageSettings={{
              src: "/logo_orquesta_sinfonica_wt.png",
              x: undefined,
              y: undefined,
              height: 50,
              width: 50,
              excavate: true,
            }}
          />
          <span className="qr-footer-text">Escanea para Registrar</span>
        </div>
        
        <div className="instructions-section">
          <h3 className="instructions-title">Control de Salida y Retorno</h3>
          <p className="instructions-desc">
            Apunta con la cámara de tu celular a este código QR para registrar el retiro de tu instrumento (Salida) o su devolución a la sala (Retorno).
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRAccessView;
