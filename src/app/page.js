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
import { supabase } from '@/lib/supabase';

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

    // Suscripción Realtime a Supabase
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'casos_master',
        },
        (payload) => {
          console.log('Realtime Update Received!', payload);
          // Si hay una actualización que otra persona hizo (como AG Windows o Vanessa), se refetchean los casos
          fetchCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  // Helpero para Fecha de entrega
  const getDeliveryDateProps = (fecha, hora) => {
    if (!fecha) return null;
    try {
      const [yyyy, mm, dd] = fecha.split('-');
      if (!yyyy || !mm || !dd) return null;
      
      const dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let isDueToday = false;
      let isPastDue = false;
      
      if (dateObj.getTime() === today.getTime()) isDueToday = true;
      else if (dateObj.getTime() < today.getTime()) isPastDue = true;

      let colorClass = "text-slate-500 hover:text-slate-600";
      if (isDueToday) colorClass = "text-[#0062cc] font-bold";
      else if (isPastDue) colorClass = "text-red-500/90 font-semibold";

      let timeStr = hora || "";
      if (hora && hora.includes(':')) {
        const [h, m] = hora.split(':');
        const hr = parseInt(h, 10);
        const ampm = hr >= 12 ? 'PM' : 'AM';
        const num12 = hr % 12 || 12;
        timeStr = `${num12}:${m} ${ampm}`;
      }

      return {
        text: `${dd}/${mm} ${timeStr}`.trim(),
        colorClass
      };
    } catch { return null; }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Toaster position="bottom-center" />
      <NewCaseModal isOpen={isNewCaseModalOpen} onClose={() => setIsNewCaseModalOpen(false)} clients={clients} onActionComplete={fetchCases}/>

      <main className="flex-1 w-full max-w-md mx-auto bg-white min-h-screen flex flex-col">
        
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
        <div className="p-4 border-b border-slate-100 bg-white shrink-0">
           <div className="relative">
             <select 
                value={activeDept}
                onChange={(e) => setActiveDept(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none shadow-sm text-[15px]"
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
               <ul className="flex flex-col">
                 {filteredCases.map((c) => {
                    const isDigital = c.tipo?.toLowerCase() === 'digital';
                    const bgClass = isDigital ? 'bg-blue-50/50' : 'bg-gray-50/50';
                    const devProps = getDeliveryDateProps(c.fecha_entrega, c.hora_entrega);
                    
                    return (
                        <li key={c.internal_id} className={`flex items-center px-4 py-3.5 border-b border-gray-100 transition-colors ${bgClass} ${borderClass}`}>
                          {/* Wrapper full flex row */}
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            
                            {/* Izquierda: Codigo, Fecha/Hora, Paciente */}
                            <div className="flex flex-col min-w-0 pr-4 gap-1">
                              {/* Línea Superior: Codigo + Fecha */}
                              <div className="flex items-center gap-2">
                                 {c.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>}
                                 <span className="text-[13px] font-medium text-slate-500 shrink-0 flex items-center gap-1">
                                    <span className="text-slate-400">#</span>{c.id || "N/A"}
                                 </span>
                                 {devProps && (
                                   <span className={`text-[13px] ${devProps.colorClass} truncate ml-1 tracking-tight`}>
                                     {devProps.text}
                                   </span>
                                 )}
                              </div>
                              
                              {/* Cuerpo: Paciente */}
                              <p className="text-[16px] font-bold text-slate-900 truncate tracking-tight">{c.patient}</p>
                            </div>
                            
                            {/* Derecha: Departamento + Pill (+ Menu si no es TODAS) */}
                            <div className="flex items-center gap-3 shrink-0">
                               <div className="flex flex-col items-end gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                     {departments.find(d=>d.id===c.dept)?.name || c.dept || 'N/A'}
                                  </span>
                                  <StatusBadge status={c.status} />
                               </div>
                               
                               {activeDept !== "all" && (
                                 <OperativeActionMenu currentCase={c} onRefresh={fetchCases} />
                               )}
                            </div>
                          </div>
                        </li>
                    );
                 })}
               </ul>
           )}
        </div>

      </main>
    </div>
  );
}
