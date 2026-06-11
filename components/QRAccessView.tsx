import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ExternalLink, Info, Smartphone, CheckCircle } from 'lucide-react';

const QRAccessView: React.FC = () => {
  // Estado para la URL base, permitiendo edición manual para corregir "localhost"
  // Default to detected network IP if on localhost for instant usability
  const [customBaseUrl, setCustomBaseUrl] = React.useState(
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://192.168.1.52:3000'
      : window.location.origin
  );
  const studentUrl = `${customBaseUrl}/?mode=student`;

  // Detectar si es localhost para mostrar advertencia
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handlePrint = () => {
    const qrSvg = document.getElementById('student-access-qr');
    if (!qrSvg) return;

    const svgHtml = qrSvg.outerHTML;
    const logoUrl = window.location.origin + "/logo_orquesta_sinfonica_wt.png";

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cartel de Acceso - OSWT</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { size: portrait; margin: 1.5cm; }
            }
            body {
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background-color: #ffffff;
              color: #020617;
              margin: 0;
              padding: 0;
            }
            .poster-card {
              width: 100%;
              max-width: 650px;
              padding: 50px;
              border: 8px double #4f46e5;
              border-radius: 40px;
              text-align: center;
              box-sizing: border-box;
            }
            .logo-container {
              margin-bottom: 24px;
            }
            .logo-img {
              height: 90px;
              width: auto;
            }
            .title-main {
              font-size: 30px;
              font-weight: 800;
              letter-spacing: -0.04em;
              margin: 0 0 10px 0;
              text-transform: uppercase;
              color: #020617;
            }
            .title-sub {
              font-size: 14px;
              font-weight: 700;
              color: #4f46e5;
              letter-spacing: 0.25em;
              text-transform: uppercase;
              margin: 0 0 40px 0;
            }
            .qr-wrapper {
              display: inline-flex;
              justify-content: center;
              align-items: center;
              padding: 24px;
              border: 3px solid #e2e8f0;
              border-radius: 32px;
              background: #ffffff;
              margin: 0 auto;
            }
            .qr-wrapper svg {
              width: 280px;
              height: 280px;
            }
            .instructions {
              margin-top: 40px;
              border-top: 2px solid #f1f5f9;
              padding-top: 30px;
            }
            .instructions-title {
              font-size: 18px;
              font-weight: 850;
              text-transform: uppercase;
              margin: 0 0 12px 0;
              color: #0f172a;
              letter-spacing: -0.02em;
            }
            .instructions-text {
              font-size: 13px;
              color: #475569;
              line-height: 1.6;
              max-width: 440px;
              margin: 0 auto;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="poster-card">
            <div class="logo-container">
              <img class="logo-img" src="${logoUrl}" alt="Logo OSWT" onerror="this.style.display='none'" />
            </div>
            <h1 class="title-main">Orquesta Sinfónica William Taylor</h1>
            <div class="title-sub">Salida y Retorno de Instrumentos</div>
            
            <div class="qr-wrapper">
              ${svgHtml}
            </div>
            
            <div class="instructions">
              <h3 class="instructions-title">Escanea con tu Celular para Registrar</h3>
              <p class="instructions-text">
                Apunta con la cámara de tu smartphone a este código QR para abrir el formulario del inventario oficial. Registra la salida cuando retires tu instrumento y el retorno cuando lo devuelvas a la sala.
              </p>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-slate-900/40 border border-slate-800 p-10 sm:p-16 rounded-[4rem] shadow-2xl backdrop-blur-xl print:bg-white print:border-none print:shadow-none print:p-0">

        {/* Contenedor del QR */}
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-all print:hidden" />
            <div className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-indigo-500/20 overflow-hidden flex items-center justify-center">
              <QRCodeSVG
                id="student-access-qr"
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

          <div className="space-y-4 print:hidden w-full max-w-xs">
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
        <div className="space-y-10 print:hidden">
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
    </div>
  );
};

export default QRAccessView;
