const fs = require('fs');
let content = fs.readFileSync('src/app/page.js', 'utf8');

const oldBottomBarStart = content.indexOf('{/* Avatar de usuario');
const oldBottomBarEnd = content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', oldBottomBarStart) + 1) + 1) + 1) + 1) + 1) + 6;

// Actually it's easier to just match from '{currentUser && (' to the end of the block.
// I'll just use string replacement on the exact block.

const newBottomBar = `{currentUser && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full px-5 py-3 flex items-center gap-6 relative">
            
            {/* Refresh Button */}
            <div className="relative flex flex-col items-center group">
              <button
                onClick={fetchCases}
                disabled={loading}
                className="w-11 h-11 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-500 hover:scale-110 hover:shadow-md transition-all duration-300 active:scale-95 disabled:opacity-50"
                title="Sincronizar"
              >
                <RefreshCw size={18} className={\`transition-all duration-300 group-hover:rotate-180 group-hover:text-blue-500 \${loading ? "animate-spin text-blue-500" : ""}\`} />
              </button>
              <span className="absolute -bottom-6 text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-sm bg-white/80 backdrop-blur px-2 py-0.5 rounded-full">
                Sincronizar
              </span>
            </div>

            {/* User Avatar */}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 font-black text-[16px] hover:bg-slate-50 hover:shadow-lg transition-all hover:scale-105 active:scale-95 select-none z-10"
            >
              {currentUser.username?.charAt(0).toUpperCase()}
            </button>

            {/* Add New Case */}
            <div className="relative flex flex-col items-center group">
              <button
                onClick={() => setIsNewCaseModalOpen(true)}
                className="w-11 h-11 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-[#D4AF37] hover:scale-110 hover:shadow-md transition-all duration-300 active:scale-95"
                title="Registrar Nuevo Trabajo"
              >
                <Plus size={22} strokeWidth={2.5} className="transition-colors duration-300" />
              </button>
              <span className="absolute -bottom-6 text-[10px] font-bold text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-sm bg-white/80 backdrop-blur px-2 py-0.5 rounded-full">
                Nuevo Trabajo
              </span>
            </div>

          </div>
        </div>
      )}`;

// We know the exact old block starts at line 1400 and ends at line 1442. Let's just slice it.
const lines = content.split('\\n');
const startIdx = lines.findIndex(l => l.includes('{/* Avatar de usuario'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('    </div>'));

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx, newBottomBar);
  fs.writeFileSync('src/app/page.js', lines.join('\\n'));
  console.log("Successfully replaced.");
} else {
  console.log("Could not find block.");
}
