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
      {/* Estilos CSS específicos de impresión para ocultar la barra lateral, cabecera y maquetar el póster */}
      <style>{`
        @media print {
          /* Ocultar barra lateral (aside), encabezado (header) y la interfaz interactiva */
          aside,
          header,
          .print-hidden,
          .print\\:hidden,
          button,
          .no-print {
            display: none !important;
          }
          
          /* Forzar fondo blanco y eliminar márgenes del sistema de la app */
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

          /* Formato de cartel A4 para el QR */
          .access-print-poster {
            display: block !important;
            margin: 2cm auto !important;
            padding: 50px !important;
            border: 8px double #4f46e5 !important;
            border-radius: 32px !important;
            text-align: center !important;
            max-width: 600px !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
          }
          
          .access-print-poster .logo-container {
            margin-bottom: 24px !important;
            display: block !important;
          }
          
          .access-print-poster .logo-img {
            height: 90px !important;
            width: auto !important;
            margin: 0 auto !important;
            display: block !important;
          }
          
          .access-print-poster h1 {
            font-size: 28px !important;
            font-weight: 800 !important;
            margin: 0 0 10px 0 !important;
            text-transform: uppercase !important;
            color: #020617 !important;
            letter-spacing: -0.04em !important;
          }
          
          .access-print-poster .subtitle {
            font-size: 13px !important;
            font-weight: 750 !important;
            color: #4f46e5 !important;
            letter-spacing: 0.25em !important;
            text-transform: uppercase !important;
            margin: 0 0 35px 0 !important;
          }
          
          .access-print-poster .qr-container {
            display: inline-flex !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 24px !important;
            border: 3px solid #cbd5e1 !important;
            border-radius: 28px !important;
            background: #ffffff !important;
            margin: 0 auto !important;
          }
          
          .access-print-poster .qr-container svg {
            width: 280px !important;
            height: 280px !important;
          }
          
          .access-print-poster .instructions {
            margin-top: 36px !important;
            border-top: 2px solid #f1f5f9 !important;
            padding-top: 24px !important;
          }
          
          .access-print-poster .instructions h3 {
            font-size: 17px !important;
            font-weight: 850 !important;
            text-transform: uppercase !important;
            margin: 0 0 10px 0 !important;
            color: #0f172a !important;
          }
          
          .access-print-poster .instructions p {
            font-size: 11px !important;
            color: #475569 !important;
            line-height: 1.6 !important;
            max-width: 440px !important;
            margin: 0 auto !important;
            font-weight: 500 !important;
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
      <div className="hidden access-print-poster">
        <div className="logo-container">
          <img className="logo-img" src="/logo_orquesta_sinfonica_wt.png" alt="Logo OSWT" onerror="this.style.display='none'" />
        </div>
        <h1>Orquesta Sinfónica William Taylor</h1>
        <div className="subtitle">Salida y Retorno de Instrumentos</div>
        
        <div className="qr-container">
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
        </div>
        
        <div className="instructions">
          <h3>Escanea con tu Celular para Registrar</h3>
          <p>
            Apunta con la cámara de tu smartphone a este código QR para abrir el formulario del inventario oficial. Registra la salida cuando retires tu instrumento y el retorno cuando lo devuelvas a la sala.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRAccessView;
