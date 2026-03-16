"use client";

import { useEffect, useState, useRef } from "react";
import { 
  MoreVertical, Play, CheckCircle2, PauseCircle, Plus, RefreshCw, X
} from "lucide-react";
import { updateCaseState } from "./actions/cases";
import { createNewCase } from "./actions/create-case";
import { getClients } from "./actions/clients";
import { getCurrentUser } from "@/lib/auth";
import { Toaster, toast } from 'sonner';

const departments = [
  { id: "Recepción", name: "Recepción" },
  { id: "Yesos", name: "Yesos" },
  { id: "Digital_Escaneo", name: "Escaneo" },
  { id: "Digital_Diseno", name: "Diseño" },
  { id: "Digital_Fresado", name: "Fresado" },
  { id: "Ajuste", name: "Ajuste" },
  { id: "Terminado", name: "Terminado" },
];

function StatusBadge({ status }) {
  if (status === 'En Proceso') return <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 whitespace-nowrap">En Proceso</span>;
  if (status === 'En Pausa') return <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10 whitespace-nowrap">En Pausa</span>;
  if (status === 'Terminado') return <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20 whitespace-nowrap">Terminado</span>;
  return <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 whitespace-nowrap">Pendiente</span>;
}

function OperativeActionMenu({ currentCase, onRefresh }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = async (actionType, loadingMsg, successMsg) => {
    setIsOpen(false);
    setIsUpdating(true);
    const id = toast.loading(loadingMsg);
    try {
      const res = await updateCaseState(currentCase.internal_id, actionType);
      if (res.success) {
        toast.success(successMsg, { id });
        onRefresh();
      } else {
        toast.error(res.error || "Error de validación.", { id });
      }
    } catch (err) {
      toast.error("Error de servidor.", { id });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="w-11 h-11 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors active:bg-slate-200"
      >
        {isUpdating ? <RefreshCw size={18} className="animate-spin" /> : <MoreVertical size={20} />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
          <button 
            onClick={() => handleAction('START', 'Iniciando...', `Caso ${currentCase.id} En Proceso`)}
            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
          >
            <Play size={16} className="text-blue-600" />
            Iniciar Proceso
          </button>
          <button 
            onClick={() => handleAction('COMPLETE', 'Avanzando...', `Caso ${currentCase.id} Terminado y Avanzado`)}
            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
          >
            <CheckCircle2 size={16} className="text-green-600" />
            Terminar Proceso
          </button>
          <button 
            onClick={() => handleAction('PAUSE', 'Pausando...', `Caso ${currentCase.id} en Pausa`)}
            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium border-t border-slate-100"
          >
            <PauseCircle size={16} className="text-red-600" />
            Pausar
          </button>
        </div>
      )}
    </div>
  );
}


function NewCaseModal({ isOpen, onClose, clients, onActionComplete }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const loadingToast = toast.loading(`Registrando...`);
    
    try {
      const result = await createNewCase(formData);
      if (result.success) {
        toast.success(`Registrado. Pasa a: ${result.deptoAsignado}.`, { id: loadingToast });
        onActionComplete();
        onClose();
      } else {
        toast.error(result.error || "Error al registrar.", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Error de conexión al servidor.", { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[85vh] sm:h-auto max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">Nuevo Trabajo</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 rounded-full bg-white shadow-sm border border-slate-200">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente / Doctor</label>
            <select name="cliente_id" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none font-medium">
               <option value="">Selección...</option>
               {clients.map(c => (
                 <option key={c.id} value={c.id}>{c.nombre} {c.nombre_dentista ? `(${c.nombre_dentista})` : ''}</option>
               ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paciente</label>
            <input type="text" name="paciente" required placeholder="Nombre completo" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Edad</label>
               <input type="number" name="edad" placeholder="Años" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Color</label>
               <input type="text" name="color" placeholder="Ej. A2" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
             </div>
          </div>

          <div className="space-y-2 mt-2 pb-4">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Protocolo de Entrada</label>
             <div className="grid grid-cols-1 gap-2">
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-white hover:bg-blue-50 cursor-pointer">
                  <input type="radio" name="tipo" value="Análogo" required className="w-4 h-4 text-blue-600 focus:ring-blue-500"/>
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-slate-800">Físico (Análogo)</span>
                     <span className="text-xs text-slate-500">Impresión &gt; Yesos</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-white hover:bg-blue-50 cursor-pointer">
                  <input type="radio" name="tipo" value="Digital" required className="w-4 h-4 text-blue-600 focus:ring-blue-500"/>
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-slate-800">Digital (Intraoral)</span>
                     <span className="text-xs text-slate-500">STL &gt; Diseño</span>
                  </div>
                </label>
             </div>
          </div>

          <button disabled={isSubmitting} type="submit" className={`mt-auto w-full py-4 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-black transition-colors flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70' : ''}`}>
             {isSubmitting ? <RefreshCw className="animate-spin" size={18}/> : <Plus size={18}/>}
             Guardar e Iniciar
          </button>
        </form>
      </div>
    </div>
  );
}


export default function Home() {
  const [activeDept, setActiveDept] = useState("all");
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

  const loadInitialData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user && (user.rol === 'Recepción' || user.rol === 'Admin' || user.rol === 'Administrador' || user.rol === 'Administración')) {
        const clientData = await getClients();
        setClients(clientData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cases');
      const data = await res.json();
      if (!data.error) setCases(data);
    } catch (err) { } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    fetchCases();
  }, []);

  const urgencySort = (a, b) => {
     if (a.urgent && !b.urgent) return -1;
     if (!a.urgent && b.urgent) return 1;
     return new Date(a.date) - new Date(b.date);
  };

  const filteredCases = activeDept === "all" 
     ? [...cases].sort(urgencySort) 
     : cases.filter(c => c.dept === activeDept).sort(urgencySort);
  
  const canCreateCases = currentUser && (currentUser.rol?.toLowerCase().includes('recep') || currentUser.rol?.includes('Admin'));

  return (
    <div className="min-h-screen bg-slate-100/50 flex flex-col font-sans">
      <Toaster position="bottom-center" />
      <NewCaseModal isOpen={isNewCaseModalOpen} onClose={() => setIsNewCaseModalOpen(false)} clients={clients} onActionComplete={fetchCases}/>

      <main className="flex-1 w-full max-w-md mx-auto bg-white shadow-2xl min-h-screen flex flex-col border-x border-slate-200">
        
        {/* Simple Header */}
        <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 h-16 bg-white">
          <h1 className="font-bold text-xl tracking-tight text-slate-900">Lab OS</h1>
          <div className="flex items-center gap-3">
             {loading && <RefreshCw size={14} className="animate-spin text-slate-300" />}
             {currentUser && (
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200">
                     {currentUser.username.charAt(0).toUpperCase()}
                   </div>
                </div>
             )}
          </div>
        </header>

        {/* Big Select Navigation */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
           <div className="relative">
             <select 
                value={activeDept}
                onChange={(e) => setActiveDept(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none shadow-sm text-[15px]"
             >
                <option value="all">TODAS (Monitor Global)</option>
                <optgroup label="Departamentos Operativos">
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </optgroup>
             </select>
             <div className="absolute right-4 top-4 text-slate-400 pointer-events-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
             </div>
           </div>
        </div>

        {/* Action Button for Reception - Only visible if authorized */}
        {canCreateCases && activeDept === "Recepción" && (
           <div className="px-4 pt-4 pb-2">
             <button 
                onClick={() => setIsNewCaseModalOpen(true)}
                className="w-full bg-[#D4AF37] hover:bg-yellow-500 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-sm transition-colors"
             >
                <Plus size={18} /> Registrar Nuevo
             </button>
           </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto w-full pb-20">
           {loading && cases.length === 0 ? (
               <div className="p-10 text-center text-slate-400 font-medium text-sm">Cargando datos...</div>
           ) : filteredCases.length === 0 ? (
               <div className="p-10 text-center text-slate-400 font-medium text-sm">No hay trabajos aquí.</div>
           ) : (
               <ul className="divide-y divide-slate-100">
                 {filteredCases.map((c) => (
                    <li key={c.internal_id} className={`flex items-center px-4 py-4 hover:bg-slate-50 transition-colors ${c.urgent ? 'bg-red-50/30' : ''}`}>
                       
                       {/* Mobile-Friendly Rows */}
                       {activeDept === "all" ? (
                         // Monitor Mode 
                         <div className="flex-1 min-w-0 pr-4">
                           <div className="flex items-center justify-between mb-0.5">
                             <div className="flex items-center gap-2">
                               {c.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                               <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wide">#{c.id || "N/A"}</p>
                             </div>
                             <p className="text-[11px] font-semibold text-slate-500 uppercase">{departments.find(d=>d.id===c.dept)?.name || c.dept || 'N/A'}</p>
                           </div>
                           <p className="text-[15px] font-bold text-slate-900 truncate">{c.patient}</p>
                         </div>
                       ) : (
                         // Action Mode
                         <>
                           <div className="flex-1 min-w-0 pr-2">
                             <div className="flex items-center gap-2 mb-1">
                               {c.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>}
                               <p className="text-[15px] font-bold text-slate-900 truncate">{c.patient}</p>
                             </div>
                             <div className="flex items-center gap-2">
                               <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">#{c.id}</p>
                               <span className="text-[10px] text-slate-300">•</span>
                               <StatusBadge status={c.status} />
                             </div>
                           </div>
                           <OperativeActionMenu currentCase={c} onRefresh={fetchCases} />
                         </>
                       )}
                       
                    </li>
                 ))}
               </ul>
           )}
        </div>

      </main>
    </div>
  );
}
