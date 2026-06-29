import re

with open("src/app/page.js", "r") as f:
    text = f.read()

def replace(old, new):
    global text
    if text.find(old) == -1:
        print("Not found:", repr(old[:50]))
    text = text.replace(old, new, 1)

# Step 1: Add global style for glass lines if it doesn't exist
if "glass-lines-bg" not in text:
    replace('return (', '''return (
    <>
    <style dangerouslySetInnerHTML={{__html: `
      .glass-lines-bg {
        background-image: repeating-linear-gradient(
          to bottom,
          transparent,
          transparent 39px,
          rgba(0, 0, 0, 0.03) 40px
        );
        background-size: 100% 40px;
      }
      .mobile-scroll {
        scrollbar-width: none;
      }
      .mobile-scroll::-webkit-scrollbar {
        display: none;
      }
    `}} />''')
    replace('export default function TechnicianBoard', 'export default function TechnicianBoard') # Wait, maybe I should just inject it right before <div className="min-h-screen

# Step 2: Main container and background
replace('''    <div className="min-h-screen bg-slate-100 flex flex-col items-center">''', 
'''    <div className="min-h-screen bg-slate-50 flex flex-col items-center relative overflow-hidden">
      {/* CAPA 1: Fondo Líneas de Libreta */}
      <div className="absolute inset-0 glass-lines-bg z-0 pointer-events-none"></div>
      
      {/* CAPA 2: Vidrio Esmerilado Global */}
      <div className="absolute inset-0 bg-slate-50/15 backdrop-blur-[4px] z-10 pointer-events-none"></div>
      
      {/* CAPA 3: Contenedor Principal (z-20) */}
      <div className="w-full flex-1 flex flex-col items-center relative z-20">''')

# Close the wrapper div at the end
replace('''    </div>
  );
}''', 
'''      </div>
    </div>
    </>
  );
}''')


# Step 3: Main layout styling
replace('''      <main className="
        flex-1 w-full bg-white flex flex-col overflow-hidden
        transition-all duration-300 relative
        sm:max-w-[520px] sm:mx-auto sm:my-3 sm:rounded-2xl sm:shadow-lg sm:ring-1 sm:ring-slate-200/60 sm:min-h-[calc(100vh-1.5rem)]
        lg:max-w-[680px] lg:my-6 lg:shadow-2xl lg:ring-slate-200/80 lg:min-h-[calc(100vh-3rem)]
      ">''', 
'''      <main className="
        flex-1 w-full flex flex-col overflow-hidden
        transition-all duration-300 relative bg-transparent
        sm:max-w-[520px] sm:mx-auto sm:my-3 sm:min-h-[calc(100vh-1.5rem)]
        lg:max-w-[680px] lg:my-6 lg:min-h-[calc(100vh-3rem)]
      ">''')

# Header
replace('''        <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-center relative shrink-0 h-14 bg-white z-20">''',
'''        <header className="px-5 py-4 flex items-center justify-center relative shrink-0 h-14 z-20">''')

# Select
replace('''        <div className="px-4 py-3 border-b border-slate-100 bg-white shrink-0 z-20">
           <div className="relative">
             <select 
                value={activeDept}
                onChange={(e) => setActiveDept(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-center font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none shadow-sm text-[15px]"
             >''',
'''        <div className="px-4 py-2 shrink-0 z-20 pointer-events-auto">
           <div className="relative">
             <select 
                value={activeDept}
                onChange={(e) => setActiveDept(e.target.value)}
                className="w-full bg-white/90 backdrop-blur-sm border border-white/40 rounded-full px-4 py-3 text-slate-900 text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none shadow-sm text-[15px] transition-all hover:bg-white"
             >''')

# List Content Background
replace('''        <div className="flex-1 overflow-y-auto w-full pb-24 relative z-10 bg-[#f8fafc]">''',
'''        <div className="flex-1 overflow-y-auto w-full pb-24 relative z-10 mobile-scroll">''')

# Separators
replace('''                        <div 
                         onClick={() => toggleDept(grupo.id)}
                         className="flex items-center justify-center py-4 px-2 cursor-pointer select-none group border-b-2 border-slate-100 hover:border-[#D4AF37] transition-colors mb-4 mt-6 relative"
                       >''',
'''                        <div 
                         onClick={() => toggleDept(grupo.id)}
                         className="flex items-center justify-center py-2 px-4 cursor-pointer select-none group mb-4 mt-6 relative bg-white/40 backdrop-blur-sm mx-4 rounded-full border border-white/20 shadow-sm"
                       >''')


with open("src/app/page.js", "w") as f:
    f.write(text)
print("Done patching home phase 1.")
