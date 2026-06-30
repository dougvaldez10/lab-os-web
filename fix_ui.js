const fs = require('fs');
let file = fs.readFileSync('src/app/page.js', 'utf8');

// Add date-fns-tz import
if (!file.includes("import { toZonedTime } from 'date-fns-tz'")) {
  file = file.replace(
    "import React, { useState, useEffect, useMemo, useRef } from 'react';",
    "import React, { useState, useEffect, useMemo, useRef } from 'react';\nimport { toZonedTime } from 'date-fns-tz';"
  );
}

// 1. In Home component, add pause modal state and handlers
const homeSearch = 'export default function Home() {\n  const [cases, setCases] = useState([]);';
const homeReplace = `export default function Home() {
  const [cases, setCases] = useState([]);
  
  // Modal de pausa
  const [pauseModalState, setPauseModalState] = useState({ isOpen: false, caseId: null, isWorkingHour: false });
  const [pauseReason, setPauseReason] = useState("");
  const [isPausing, setIsPausing] = useState(false);

  const handlePauseRequest = (internalId) => {
    // Evaluar si es horario laboral
    const TIMEZONE = 'America/Tijuana';
    const now = toZonedTime(new Date(), TIMEZONE);
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
    const isWorkingHour = isWeekday && hour >= 9 && (hour < 16 || (hour === 16 && minute < 30));

    if (isWorkingHour) {
      setPauseModalState({ isOpen: true, caseId: internalId, isWorkingHour: true });
      setPauseReason("");
    } else {
      // Fuera de horario: pausa directa
      executePause(internalId, "Fin de jornada");
    }
  };

  const executePause = async (internalId, reason) => {
    setIsPausing(true);
    const id = toast.loading('Pausando caso...');
    try {
      // Necesitamos el operador
      const currentOperator = currentUser?.username || 'Usuario';
      const res = await updateCaseState(internalId, 'PAUSE', currentOperator, reason);
      if (res.success) {
        toast.success(\`Caso pausado\`, { id });
        fetchCases();
        setPauseModalState({ isOpen: false, caseId: null, isWorkingHour: false });
      } else {
        toast.error(res.error || "Error al pausar.", { id });
      }
    } catch (err) {
      toast.error("Error de servidor.", { id });
    } finally {
      setIsPausing(false);
    }
  };`;

file = file.replace(homeSearch, homeReplace);

// 2. Add the Modal UI at the bottom of Home
const modalUI = `
      <NewCaseModal isOpen={isNewCaseModalOpen} onClose={() => setIsNewCaseModalOpen(false)} clients={clients} onActionComplete={fetchCases}/>
      
      {/* PAUSE MODAL */}
      {pauseModalState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Motivo de Pausa</h3>
              <p className="text-slate-500 text-sm mb-4">Ingresa la razón por la cual estás pausando este caso.</p>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Ej. Faltan modelos, falla eléctrica..."
                className="w-full border border-slate-300 rounded-lg p-3 min-h-[100px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800"
                disabled={isPausing}
              />
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setPauseModalState({ isOpen: false, caseId: null, isWorkingHour: false })}
                className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isPausing}
              >
                Cancelar
              </button>
              <button
                onClick={() => executePause(pauseModalState.caseId, pauseReason)}
                disabled={!pauseReason.trim() || isPausing}
                className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                {isPausing && <RefreshCw size={16} className="animate-spin" />}
                Confirmar Pausa
              </button>
            </div>
          </div>
        </div>
      )}
`;
file = file.replace(
  "<NewCaseModal isOpen={isNewCaseModalOpen} onClose={() => setIsNewCaseModalOpen(false)} clients={clients} onActionComplete={fetchCases}/>",
  modalUI
);

// 3. Update CaseActionBar to take handlePauseRequest prop
file = file.replace(
  "function CaseActionBar({ currentCase, onRefresh, operatorName, isExpanded, onToggleExpand, onOpenReceipt }) {",
  "function CaseActionBar({ currentCase, onRefresh, operatorName, isExpanded, onToggleExpand, onOpenReceipt, onPauseRequest }) {"
);

// 4. Update the Pause button to use onPauseRequest
const oldPauseButton = `<button 
            onClick={() => handleAction('PAUSE', 'Pausando...', \`Caso \${currentCase.id} Pausado\`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider rounded shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors active:scale-95"
          >
            <Pause size={14} /> Pausar
          </button>`;
const newPauseButton = `<button 
            onClick={() => onPauseRequest(currentCase.internal_id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider rounded shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors active:scale-95"
          >
            <Pause size={14} /> Pausar
          </button>`;
file = file.replace(oldPauseButton, newPauseButton);

// 5. Pass onPauseRequest to CaseActionBar in render
file = file.replace(
  "onOpenReceipt={() => handleOpenReceipt(c)}",
  "onOpenReceipt={() => handleOpenReceipt(c)}\n                            onPauseRequest={handlePauseRequest}"
);

fs.writeFileSync('src/app/page.js', file);
