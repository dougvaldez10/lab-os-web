const fs = require('fs');
let file = fs.readFileSync('src/app/page.js', 'utf8');

// 1. Root container
file = file.replace(
  '<div className="h-[100dvh] overflow-hidden bg-white sm:bg-slate-50 lg:bg-slate-100 flex flex-col font-sans transition-colors duration-300 relative">',
  '<div className="h-[100dvh] overflow-y-auto overflow-x-hidden mobile-scroll bg-white sm:bg-slate-50 lg:bg-slate-100 flex flex-col font-sans transition-colors duration-300 relative glass-lines-bg">'
);

// 2. Layer 1 wrapper
file = file.replace(
  '<div className="absolute inset-0 overflow-y-auto overflow-x-hidden mobile-scroll z-0 glass-lines-bg">\n        {/* NUEVO VIDRIO GLOBAL (Debajo de las tarjetas, sobre el papel) */}\n        <div className="fixed inset-0 bg-slate-50/15 backdrop-blur-[4px] pointer-events-none z-0"></div>\n        \n        <div style={{ paddingTop: \'144px\', paddingBottom: \'100px\' }} className="w-full sm:max-w-[520px] lg:max-w-[680px] mx-auto flex flex-col relative z-10 px-0">',
  `<div className="w-full flex-1 flex flex-col relative z-0">
        {/* NUEVO VIDRIO GLOBAL (Debajo de las tarjetas, sobre el papel) */}
        <div className="fixed inset-0 bg-slate-50/15 backdrop-blur-[4px] pointer-events-none z-0"></div>
        
        {/* WRAPPER ZERO-HEIGHT PARA STICKY LAYERS */}
        <div className="w-full h-0 sticky top-0 z-10">
          {/* LAYER 2: EL VIDRIO OPACO (ZONA FUERA DEL HUECO) */}
          <div className="absolute top-0 left-0 w-full h-[100dvh] pointer-events-none flex flex-col">
            {/* Top glass (cubre Lab OS y el menú) */}
            <div className="h-[144px] bg-slate-50/15 backdrop-blur-[4px] w-full transition-all duration-300 border-b border-white/40" />
            
            {/* Middle section (El Hueco) */}
            <div className="flex-1 flex relative w-full">
              {/* Lado izquierdo */}
              <div className="flex-1 bg-slate-50/15 backdrop-blur-[4px] h-full transition-all duration-300 border-r border-white/40 hidden sm:block" />
              
              {/* El Hueco en sí */}
              <div className="w-full sm:max-w-[520px] lg:max-w-[680px] mx-auto bg-transparent h-full px-0 flex flex-col relative pointer-events-none">
                 {/* Marco del hueco sin borde visible, solo el espacio libre */}
                 <div className="w-full flex-1 relative z-30 pointer-events-none"></div>
              </div>
              
              {/* Lado derecho */}
              <div className="flex-1 bg-slate-50/15 backdrop-blur-[4px] h-full transition-all duration-300 border-l border-white/40 hidden sm:block" />
            </div>
          </div>

          {/* LAYER 3: LOS PAPELES SOLIDOS (TÍTULOS Y BOTONES FLOTANTES) */}
          <div className="absolute top-0 left-0 w-full h-[100dvh] pointer-events-none flex flex-col items-center z-20">
            {/* Header - Letras recortadas flotando */}
            <header className="px-5 py-4 flex items-center justify-center shrink-0 h-[56px] w-full bg-transparent relative pointer-events-auto">
              <h1
                className="font-bold text-xl tracking-tight text-slate-900 cursor-pointer select-none"
                onClick={() => setActiveDept("Producción")}
                title="Volver a Inicio"
              >
                Lab OS
              </h1>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button 
                  onClick={fetchCases}
                  disabled={loading}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-500 shadow-sm transition-all active:scale-95"
                  title="Sincronizar datos"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin text-blue-500" : ""} />
                </button>
                {isAdmin && (
                  <Link href="/admin" className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#D4AF37] shadow-sm transition-all active:scale-95" title="Administración">
                    <Settings size={16} />
                  </Link>
                )}
              </div>
            </header>

            {/* Big Select Navigation - Hoja flotando */}
            <div className="px-4 py-3 pb-5 shrink-0 bg-transparent w-full flex justify-center pointer-events-auto h-[88px]">
               <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full max-w-[320px]">
                 <button 
                    onClick={() => setActiveDept("Producción")}
                    className={\`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors \${activeDept === "Producción" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}\`}
                 >
                    Producción
                 </button>
                 <button 
                    onClick={() => setActiveDept("all")}
                    className={\`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors \${activeDept === "all" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}\`}
                 >
                    Monitor Global
                 </button>
               </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '144px', paddingBottom: '100px' }} className="w-full sm:max-w-[520px] lg:max-w-[680px] mx-auto flex flex-col relative z-0 px-0">`
);

// 3. Remove Layer 2 and Layer 3 from bottom
const layer2Marker = '{/* LAYER 2: EL VIDRIO OPACO (ZONA FUERA DEL HUECO) */}';
const avatarMarker = '{/* Avatar de usuario';

const layer2Index = file.indexOf(layer2Marker);
const avatarIndex = file.indexOf(avatarMarker);

if (layer2Index > -1 && avatarIndex > -1) {
    file = file.substring(0, layer2Index) + file.substring(avatarIndex);
}

fs.writeFileSync('src/app/page.js', file);
