import sys

with open('src/app/page.js', 'r') as f:
    lines = f.readlines()

# 1. Root container (around line 1209)
# <div className="h-[100dvh] overflow-hidden bg-white sm:bg-slate-50 lg:bg-slate-100 flex flex-col font-sans transition-colors duration-300 relative">
for i, line in enumerate(lines):
    if 'h-[100dvh] overflow-hidden' in line and 'bg-white sm:bg-slate-50' in line:
        lines[i] = line.replace('overflow-hidden', 'overflow-y-auto overflow-x-hidden mobile-scroll').replace('relative">', 'relative glass-lines-bg">')
        break

# 2. Layer 1 start (around line 1215)
# <div className="absolute inset-0 overflow-y-auto overflow-x-hidden mobile-scroll z-0 glass-lines-bg">
start_idx = -1
for i, line in enumerate(lines):
    if 'LAYER 1: LA HOJA DE PAPEL (SCROLLING Y CONTENIDO)' in line:
        start_idx = i
        break

end_idx = -1
for i in range(start_idx, len(lines)):
    if 'className="w-full sm:max-w-[520px] lg:max-w-[680px] mx-auto flex flex-col relative z-10 px-0"' in line or 'paddingTop: \'144px\', paddingBottom: \'100px\'' in lines[i]:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_layer_top = """      {/* LAYER 1: CONTENIDO Y STICKY GLASS */}
      <div className="w-full flex-1 flex flex-col relative z-0">
        {/* NUEVO VIDRIO GLOBAL (Debajo de las tarjetas, sobre el papel) */}
        <div className="fixed inset-0 bg-slate-50/15 backdrop-blur-[4px] pointer-events-none z-0"></div>
        
        {/* WRAPPER STICKY PARA LAYER 2 Y 3 */}
        <div className="w-full h-0 sticky top-0 z-10">
          {/* LAYER 2: EL VIDRIO OPACO */}
          <div className="absolute top-0 left-0 w-full h-[100dvh] pointer-events-none flex flex-col">
            <div className="h-[144px] bg-slate-50/15 backdrop-blur-[4px] w-full transition-all duration-300 border-b border-white/40" />
            <div className="flex-1 flex relative w-full">
              <div className="flex-1 bg-slate-50/15 backdrop-blur-[4px] h-full transition-all duration-300 border-r border-white/40 hidden sm:block" />
              <div className="w-full sm:max-w-[520px] lg:max-w-[680px] mx-auto bg-transparent h-full px-0 flex flex-col relative pointer-events-none">
                 <div className="w-full flex-1 relative z-30 pointer-events-none"></div>
              </div>
              <div className="flex-1 bg-slate-50/15 backdrop-blur-[4px] h-full transition-all duration-300 border-l border-white/40 hidden sm:block" />
            </div>
          </div>

          {/* LAYER 3: LOS PAPELES SOLIDOS */}
          <div className="absolute top-0 left-0 w-full h-[100dvh] pointer-events-none flex flex-col items-center z-20">
            <header className="px-5 py-4 flex items-center justify-center shrink-0 h-[56px] w-full bg-transparent relative pointer-events-auto">
              <h1 className="font-bold text-xl tracking-tight text-slate-900 cursor-pointer select-none" onClick={() => setActiveDept("Producción")} title="Volver a Inicio">
                Lab OS
              </h1>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button onClick={fetchCases} disabled={loading} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-500 shadow-sm transition-all active:scale-95" title="Sincronizar datos">
                  <RefreshCw size={16} className={loading ? "animate-spin text-blue-500" : ""} />
                </button>
                {isAdmin && (
                  <Link href="/admin" className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#D4AF37] shadow-sm transition-all active:scale-95" title="Administración">
                    <Settings size={16} />
                  </Link>
                )}
              </div>
            </header>
            <div className="px-4 py-3 pb-5 shrink-0 bg-transparent w-full flex justify-center pointer-events-auto h-[88px]">
               <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full max-w-[320px]">
                 <button onClick={() => setActiveDept("Producción")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeDept === "Producción" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    Producción
                 </button>
                 <button onClick={() => setActiveDept("all")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeDept === "all" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    Monitor Global
                 </button>
               </div>
            </div>
          </div>
        </div>
        
        <div style={{ paddingTop: '144px', paddingBottom: '100px' }} className="w-full sm:max-w-[520px] lg:max-w-[680px] mx-auto flex flex-col relative z-0 px-0">\n"""
    
    # Replace from start_idx to end_idx INCLUSIVE
    lines = lines[:start_idx] + [new_layer_top] + lines[end_idx+1:]


# 3. Delete old layer 2 and 3 at the bottom
l2_idx = -1
for i, line in enumerate(lines):
    if 'LAYER 2: EL VIDRIO OPACO (ZONA FUERA DEL HUECO)' in line:
        l2_idx = i
        break

av_idx = -1
for i in range(l2_idx if l2_idx != -1 else 0, len(lines)):
    if 'Avatar de usuario' in line:
        av_idx = i
        break

if l2_idx != -1 and av_idx != -1:
    # also remove the '</div></div></div>' that closes the old Layer 1
    # which is right before Layer 2.
    # Actually, if Layer 1 is just 'w-full flex-1 flex flex-col relative z-0' now, 
    # it needs closing tags.
    # The old Layer 1 had `<div className="absolute inset-0...">`
    # and `<div style={{ paddingTop: ... }}>`
    # Our new Layer 1 has `<div className="w-full flex-1...">`
    # and `<div style={{ paddingTop: ... }}>`
    # The number of opened divs is exactly the same! 2!
    # So the closing divs right before Layer 2 SHOULD NOT BE DELETED.
    # We just delete from LAYER 2 to Avatar.
    lines = lines[:l2_idx] + lines[av_idx:]

with open('src/app/page.js', 'w') as f:
    f.writelines(lines)

