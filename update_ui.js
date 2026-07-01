const fs = require('fs');

let content = fs.readFileSync('src/app/page.js', 'utf8');

// 1. Remove Sincronizar from header
const headerSyncRegex = /<button onClick=\{fetchCases\} disabled=\{loading\}.*?<\/button>/s;
content = content.replace(headerSyncRegex, '');

// 2. Hide Recepción from groupsToRender
// Around line 881: let groupsToRender = [];
// if (activeDept === "all") groupsToRender = departments.filter(d => d.id !== 'Recepción');
// if (isAdmin) groupsToRender = departments.filter(d => d.id !== 'Recepción');
// else groupsToRender = departments.filter(d => d.id !== 'Recepción' && ... );

content = content.replace(
  'groupsToRender = departments;',
  'groupsToRender = departments.filter(d => d.id !== "Recepción");'
);
content = content.replace(
  'groupsToRender = departments;',
  'groupsToRender = departments.filter(d => d.id !== "Recepción");'
);
content = content.replace(
  /groupsToRender = departments\.filter\(d => \{/,
  'groupsToRender = departments.filter(d => {\n         if(d.id === "Recepción") return false;'
);


// 3. Replace Bottom Avatar with the new 3-button layout
const oldAvatar = `{currentUser && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="w-11 h-11 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-700 font-bold text-[15px] hover:bg-slate-50 hover:shadow-xl transition-all active:scale-95 select-none"
          >
            {currentUser.username?.charAt(0).toUpperCase()}
          </button>
        </div>
      )}`;

const newBottomBar = `{currentUser && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6">
          
          {/* Refresh Button */}
          <div className="relative flex flex-col items-center group">
            <button
              onClick={fetchCases}
              disabled={loading}
              className="w-11 h-11 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-500 hover:text-blue-500 hover:scale-110 hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-50"
              title="Sincronizar"
            >
              <RefreshCw size={18} className={\`transition-all duration-300 group-hover:rotate-180 group-hover:text-blue-500 \${loading ? "animate-spin text-blue-500" : ""}\`} />
            </button>
            <span className="absolute -bottom-5 text-[11px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              Sincronizar
            </span>
          </div>

          {/* User Avatar */}
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-xl flex items-center justify-center text-slate-700 font-black text-[16px] hover:bg-slate-50 hover:shadow-2xl transition-all hover:scale-105 active:scale-95 select-none z-10 relative"
          >
            {currentUser.username?.charAt(0).toUpperCase()}
          </button>

          {/* Add New Case */}
          <div className="relative flex flex-col items-center group">
            <button
              onClick={() => setIsNewCaseModalOpen(true)}
              className="w-11 h-11 rounded-full bg-[#D4AF37] border-2 border-white shadow-lg flex items-center justify-center text-white hover:bg-yellow-500 hover:scale-110 hover:shadow-xl transition-all duration-300 active:scale-95"
              title="Registrar Nuevo"
            >
              <Plus size={22} strokeWidth={3} />
            </button>
            <span className="absolute -bottom-5 text-[11px] font-bold text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
              Nuevo
            </span>
          </div>

        </div>
      )}`;

content = content.replace(oldAvatar, newBottomBar);

fs.writeFileSync('src/app/page.js', content);
