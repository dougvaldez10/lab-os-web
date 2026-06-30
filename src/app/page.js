"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Search, Star, MessageSquare, Clipboard, MoreHorizontal, LogOut, ChevronDown, ChevronUp, Plus, Check, RefreshCw, Layers, Smile, Shield, Smartphone, Package, Target, Sun, X, Calculator, DollarSign, Percent, Pause, Download, Upload, Play, AlertTriangle, Settings, User } from "lucide-react";
import Link from "next/link";
import { getAllUsers, loginUser, getCurrentUser, logoutUser } from "@/lib/auth";
import { saveReceiptData } from "@/app/actions/receipts";
import { logShadowAudit, markShadowAuditAsSaved } from "@/app/actions/audit";
import { getClients } from "@/app/actions/clients";
import { getProducts } from "@/app/actions/products";
import { updateCaseState } from "@/app/actions/cases";
import { createNewCase } from "@/app/actions/create-case";
import { getAllDeptAverages } from "@/app/actions/sla";
import { Toaster, toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import NewCaseModal from "@/components/NewCaseModal";

const departments = [
  { id: "Recepción", name: "Recepción" },
  { id: "Yesos", name: "Yesos" },
  { id: "Digital_Escaneo", name: "Escaneo" },
  { id: "Digital_Diseno", name: "Diseño" },
  { id: "Digital_Fresado", name: "Fresado" },
  { id: "Sinterizado", name: "Sinterizado" },


  { id: "Ajuste", name: "Ajuste" },
  { id: "Terminado", name: "Terminado" },
  { id: "Inspección", name: "Inspección" },
];

function StatusBadge({ status }) {
  if (status === 'En Proceso') return <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 whitespace-nowrap">En Proceso</span>;
  if (status === 'En Pausa') return <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10 whitespace-nowrap">En Pausa</span>;
  if (status === 'Terminado') return <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20 whitespace-nowrap">Terminado</span>;
  return <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 whitespace-nowrap">Pendiente</span>;
}

// Barra de progreso vertical en el borde derecho de la tarjeta
function FileProgressBar({ progress, direction }) {
  if (progress === null || progress === undefined) return null;
  const isUpload = direction === 'upload'; // upload = abajoΓåÆarriba, download = arribaΓåÆabajo
  return (
    <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-100 overflow-hidden rounded-r-sm">
      <div
        className="absolute left-0 right-0 bg-blue-500 transition-all duration-300 ease-out"
        style={
          isUpload
            ? { bottom: 0, height: `${progress}%` }           // crece de abajo hacia arriba
            : { top: 0, height: `${progress}%` }             // crece de arriba hacia abajo
        }
      />
    </div>
  );
}
// Barra de acciones horizontal por caso (reemplaza los 3 puntos)
function CaseActionBar({ currentCase, onRefresh, operatorName, isExpanded, onToggleExpand, onOpenReceipt }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [fileProgress, setFileProgress] = useState(null);
  const [fileDirection, setFileDirection] = useState(null); // 'upload' o 'download'
  const fileInputRef = useRef(null);

  // Reglas de archivos
  const depto = currentCase.dept;
  const isDigital = currentCase.tipo?.toLowerCase() === 'digital';
  
  const showUploadEscaneo = isDigital && depto === 'Digital_Escaneo';
  const showUploadDiseno = isDigital && depto === 'Digital_Diseno';
  const showDownloadEscaneo = isDigital && depto === 'Digital_Diseno';
  const showDownloadDiseno = isDigital && depto === 'Digital_Fresado';

  const handleAction = async (actionType, loadingMsg, successMsg) => {
    setIsUpdating(true);
    const id = toast.loading(loadingMsg);
    try {
      const res = await updateCaseState(currentCase.internal_id, actionType, operatorName);
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

  const handleUpload = async (sourceDept) => {
    fileInputRef.current.dataset.sourceDept = sourceDept;
    fileInputRef.current.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const sourceDept = e.target.dataset.sourceDept;
    const caseId = currentCase.internal_id;

    setFileDirection('upload');
    setFileProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);
    formData.append('dept', sourceDept);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setFileProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        toast.success(`Archivo "${file.name}" cargado Γ£ô`);
      } else {
        toast.error('Error al cargar archivo');
      }
      setTimeout(() => { setFileProgress(null); setFileDirection(null); }, 1000);
    };
    xhr.onerror = () => {
      toast.error('Error de red al cargar');
      setFileProgress(null); setFileDirection(null);
    };
    xhr.open('POST', '/api/upload-file');
    xhr.send(formData);
    e.target.value = '';
  };

  const handleDownload = async (fromDept) => {
    setFileDirection('download');
    setFileProgress(0);
    const toastId = toast.loading('Obteniendo archivos...');
    try {
      const res = await fetch(`/api/case-files?caseId=${currentCase.internal_id}&dept=${fromDept}`);
      const { files } = await res.json();
      if (!files || files.length === 0) {
        toast.error('No hay archivos en ese departamento', { id: toastId });
        setFileProgress(null); setFileDirection(null);
        return;
      }
      toast.dismiss(toastId);
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const urlRes = await fetch(`/api/case-files/url?caseId=${currentCase.internal_id}&dept=${fromDept}&filename=${encodeURIComponent(f.name)}`);
        const { url } = await urlRes.json();
        if (url) {
          const a = document.createElement('a');
          a.href = url; a.download = f.name; a.click();
        }
        setFileProgress(Math.round(((i + 1) / files.length) * 100));
      }
      toast.success(`${files.length} archivo(s) descargado(s) Γ£ô`);
    } catch {
      toast.error('Error al descargar archivos', { id: toastId });
    } finally {
      setTimeout(() => { setFileProgress(null); setFileDirection(null); }, 1200);
    }
  };

  return (
    <div className="w-full relative flex flex-col items-center">
      {/* Botón Expansor en el centro de la tarjeta */}
      <button 
        onClick={onToggleExpand}
        disabled={isUpdating}
        className="flex items-center justify-center w-full py-2 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 rounded-b-xl"
      >
        {isUpdating ? <RefreshCw size={16} className="animate-spin text-blue-500" /> : 
          isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />
        }
      </button>
      
      {/* Barra de Progreso Subida/Bajada */}
      {fileProgress !== null && (
        <div className="w-full px-4 mb-2">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${fileDirection === 'upload' ? 'bg-[#98b355]' : 'bg-[#0062cc]'} transition-all`} style={{ width: `${fileProgress}%` }}></div>
          </div>
        </div>
      )}

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.ply,.obj,.3ds"
        className="hidden"
        onChange={onFileSelected}
      />

      {/* Barra de Acciones Expandida */}
      {isExpanded && (
        <div className="w-full bg-slate-50 border-t border-slate-100 p-3 flex flex-wrap gap-2 justify-center rounded-b-xl shadow-inner animate-in slide-in-from-top-2">
          <button 
            onClick={() => handleAction('START', 'Iniciando...', `Caso ${currentCase.id} En Proceso`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:border-blue-200 transition-colors shadow-sm font-medium"
          >
            <Play size={14} className="text-blue-600" /> Iniciar Proceso
          </button>
          
          {currentCase.dept === 'Recibo/Factura' ? (
             <button 
               onClick={() => onOpenReceipt(currentCase)}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white hover:bg-black transition-colors shadow-sm font-bold"
             >
               <Calculator size={14} className="text-[#D4AF37]" /> Crear Recibo (Borrador)
             </button>
          ) : (
             <button 
               onClick={() => handleAction('COMPLETE', 'Avanzando...', `Caso ${currentCase.id} Terminado y Avanzado`)}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-green-50 hover:border-green-200 transition-colors shadow-sm font-medium"
             >
               <Check size={14} className="text-green-600" /> Terminar Proceso
             </button>
          )}
          
          <button 
            onClick={() => handleAction('PAUSE', 'Pausando...', `Caso ${currentCase.id} en Pausa`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm font-medium"
          >
            <Pause size={14} className="text-red-600" /> Pausar
          </button>

          {/* Archivos Dinamicos */}
          {showDownloadEscaneo && (
            <button onClick={() => handleDownload('Digital_Escaneo')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-100 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors shadow-sm font-medium">
              <Download size={14} /> Descargar
            </button>
          )}
          {showDownloadDiseno && (
            <button onClick={() => handleDownload('Digital_Diseno')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-100 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors shadow-sm font-medium">
              <Download size={14} /> Descargar
            </button>
          )}
          
          {showUploadEscaneo && (
            <button onClick={() => handleUpload('Digital_Escaneo')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-100 rounded-lg text-sm text-green-700 hover:bg-green-50 transition-colors shadow-sm font-medium">
              <Upload size={14} /> Cargar
            </button>
          )}
          {showUploadDiseno && (
            <button onClick={() => handleUpload('Digital_Diseno')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-100 rounded-lg text-sm text-green-700 hover:bg-green-50 transition-colors shadow-sm font-medium">
              <Upload size={14} /> Cargar
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Componente: Tarjetas Apiladas (Pre-aviso de Yesos)
// Muestra los casos iniciados en Yesos en modo stack estilo iOS.
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function StackedCases({ cases, onRefresh, operatorName }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [isActing, setIsActing] = useState(false);

  if (!cases || cases.length === 0) return null;

  const selectedCase = cases.find(c => c.internal_id === selectedId);

  const handleSelect = (id) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  const handlePull = async () => {
    if (!selectedCase) return;
    setIsActing(true);
    const id = toast.loading(`Iniciando ${selectedCase.id} en Escaneo...`);
    try {
      const res = await updateCaseState(selectedCase.internal_id, 'PULL_TO_ESCANEO', operatorName);
      if (res.success) {
        toast.success(`Caso ${selectedCase.id} ahora En Proceso en Escaneo Γ£ô`, { id });
        setSelectedId(null);
        setExpanded(false);
        onRefresh();
      } else {
        toast.error(res.error || 'Error al iniciar.', { id });
      }
    } catch {
      toast.error('Error de servidor.', { id });
    } finally {
      setIsActing(false);
    }
  };

  // Vista colapsada: tarjetas encimadas
  const STACK_PREVIEW = Math.min(cases.length, 3);

  return (
    <div className="px-4 sm:px-0 mb-2">
      {/* Header de sección */}
      <div className="flex items-center gap-2 mb-3 mt-6">
        <div className="flex-1 h-px bg-amber-200/80" />
        <span className="text-[11px] font-black uppercase tracking-widest text-amber-600/80 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
          En proceso en Yesos
        </span>
        <div className="flex-1 h-px bg-amber-200/80" />
      </div>

      {/* Stack colapsado */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="relative w-full h-28 flex items-center justify-center group focus:outline-none"
          aria-label={`Ver ${cases.length} casos pendientes de Yesos`}
        >
          {/* Tarjetas apiladas (de abajo hacia arriba) */}
          {Array.from({ length: STACK_PREVIEW }).map((_, i) => {
            const c = cases[STACK_PREVIEW - 1 - i]; // último = mís abajo
            const isTop = i === STACK_PREVIEW - 1;
            const offsetY = (STACK_PREVIEW - 1 - i) * -10;
            const scale = 1 - (STACK_PREVIEW - 1 - i) * 0.04;
            return (
              <div
                key={c.internal_id}
                className="absolute w-full bg-white border border-amber-200 rounded-2xl shadow-md px-5 py-3.5 flex items-center justify-between transition-all duration-300"
                style={{
                  transform: `translateY(${offsetY}px) scale(${scale})`,
                  zIndex: i + 1,
                  top: '50%',
                  marginTop: '-3.5rem'
                }}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-medium text-amber-600/80">#{c.id}</span>
                  <span className="text-[15px] font-bold text-slate-900 truncate">{c.patient}</span>
                  {isTop && c.doctor && (
                    <span className="text-[12px] text-slate-400 truncate">{c.doctor}</span>
                  )}
                </div>
                {isTop && (
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-300/50 whitespace-nowrap">
                      Desde Yesos
                    </span>
                    {cases.length > 1 && (
                      <span className="text-[11px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        +{cases.length - 1} mís
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Indicador de tap */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[11px] font-bold text-amber-500/70 group-hover:text-amber-600 transition-colors z-10 bg-transparent">
            <ChevronDown size={14} />
            <span>Toca para ver</span>
          </div>
        </button>
      )}

      {/* Vista expandida */}
      {expanded && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Header expandido */}
          <button
            onClick={() => { setExpanded(false); setSelectedId(null); }}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-amber-200/60 hover:bg-amber-100/40 transition-colors"
          >
            <span className="text-[12px] font-black uppercase tracking-wider text-amber-700">
              {cases.length} caso{cases.length > 1 ? 's' : ''} desde Yesos
            </span>
            <ChevronUp size={16} className="text-amber-500" />
          </button>

          {/* Lista de casos expandidos */}
          <ul className="flex flex-col divide-y divide-amber-100/80">
            {cases.map((c) => {
              const isSelected = c.internal_id === selectedId;
              return (
                <li
                  key={c.internal_id}
                  onClick={() => handleSelect(c.internal_id)}
                  className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-amber-100/80 ring-1 ring-inset ring-amber-300'
                      : 'bg-white/60 hover:bg-white/90'
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-amber-600/80">#{c.id}</span>
                      {c.fecha_entrega && (() => {
                        const [y, m, d] = c.fecha_entrega.split('-');
                        return <span className="text-[11px] text-slate-400">{d}/{m}</span>;
                      })()}
                    </div>
                    <span className="text-[15px] font-bold text-slate-900 truncate">{c.patient}</span>
                    {c.doctor && <span className="text-[12px] text-slate-400 truncate">{c.doctor}</span>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ring-1 ring-inset ${
                      c.status === 'En Proceso'
                        ? 'bg-blue-50 text-blue-700 ring-blue-700/10'
                        : 'bg-red-50 text-red-700 ring-red-600/10'
                    }`}>
                      {c.status}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Barra de acción ΓÇö aparece solo cuando hay un caso seleccionado */}
          {selectedCase && (
            <div className="border-t border-amber-200 bg-white/90 p-3 flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-200">
              <p className="text-[11px] font-bold text-slate-500 text-center">
                Caso <span className="text-slate-800">#{selectedCase.id}</span> ΓÇö {selectedCase.patient}
              </p>
              <button
                onClick={handlePull}
                disabled={isActing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-60"
              >
                {isActing
                  ? <RefreshCw size={16} className="animate-spin" />
                  : <Play size={16} className="text-amber-400" />
                }
                Iniciar Proceso en Escaneo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onLoginSuccess }) {

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  const pinInputRef = useRef(null);

  // Load users and sort by frequency
  useEffect(() => {
    async function load() {
      try {
        const allUsers = await getAllUsers();
        
        // No ocultamos a nadie por ahora para que el usuario pueda ver a 'legion'
        const opsUsers = allUsers;
        
        const usageStr = localStorage.getItem("lab_os_user_freq");
        const usage = usageStr ? JSON.parse(usageStr) : {};

        const sortedUsers = [...opsUsers].sort((a, b) => {
           const freqA = usage[a.username] || 0;
           const freqB = usage[b.username] || 0;
           return freqB - freqA;
        });
        
        setUsers(sortedUsers);
        
        if (sortedUsers.length > 0) {
          setSelectedUser(sortedUsers[0]);
        }
      } catch (e) {
        console.error("Failed to load users:", e);
        toast.error(`Error loading users: ${e.message}`, { duration: 10000 });
      } finally {
        setLoadingUsers(false);
      }
    }
    load();
  }, []);

  const isAdmin = selectedUser?.username?.toLowerCase() === 'admin' || selectedUser?.username?.toLowerCase() === 'legion';

  // Handle PIN input
  const handlePinChange = async (e) => {
    if (isAdmin) {
      setPin(e.target.value);
    } else {
      const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
      if (val.length <= 4) {
         setPin(val);
         if (val.length === 4) {
            submitLogin(val);
         }
      }
    }
  };

  const handleKeyDown = (e) => {
    if (isAdmin && e.key === 'Enter') {
      submitLogin(pin);
    }
  };

  const submitLogin = async (passwordOrPin) => {
    setLoading(true);
    const res = await loginUser(selectedUser.username, passwordOrPin);
    if (res.success) {
       if (res.session) {
          await supabase.auth.setSession({
             access_token: res.session.access_token,
             refresh_token: res.session.refresh_token
          });
       }
       
       const usageStr = localStorage.getItem("lab_os_user_freq");
       const usage = usageStr ? JSON.parse(usageStr) : {};
       usage[selectedUser.username] = (usage[selectedUser.username] || 0) + 1;
       localStorage.setItem("lab_os_user_freq", JSON.stringify(usage));
       
       setWelcomeName(res.user.nombre_completo || res.user.username);
       setShowWelcome(true);
       
       setTimeout(() => {
          const uname = res.user.username?.toLowerCase();
          if (uname === 'admin' || uname === 'coloraturacorp' || uname === 'legion' || res.user.rol === 'lab_owner') {
            window.location.href = '/admin';
          } else {
            onLoginSuccess(res.user);
          }
       }, 1500);
    } else {
       toast.error(res.error);
       setPin("");
       setLoading(false);
       if (pinInputRef.current) pinInputRef.current.focus();
    }
  };

  const handleUserClick = (u) => {
      setSelectedUser(u);
      setPin("");
      setTimeout(() => {
         if (pinInputRef.current) pinInputRef.current.focus();
      }, 100);
  };

  if (showWelcome) {
     return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
           <div className="text-center animate-in fade-in zoom-in duration-500">
              <div className="w-28 h-28 mx-auto mb-6 rounded-full overflow-hidden shadow-2xl ring-4 ring-[#D4AF37] ring-offset-4 ring-offset-slate-50">
                 {selectedUser?.avatar_base64 ? 
                     <img src={selectedUser.avatar_base64} className="w-full h-full object-cover" alt="avatar" /> :
                     <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-4xl">{selectedUser?.username.charAt(0).toUpperCase()}</div>
                 }
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bienvenido, {welcomeName}</h1>
              <p className="text-slate-500 mt-2 font-medium">Preparando tu entorno operativo...</p>
           </div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
      <Toaster position="bottom-center" />
      
      {/* Brand Logo / Title */}
      <div className="absolute top-12 left-0 right-0 text-center">
         <h1 className="text-2xl font-black text-slate-900 tracking-tight">Lab OS</h1>
      </div>

      {loadingUsers ? (
         <RefreshCw className="animate-spin text-slate-400 w-8 h-8" />
      ) : (
         <div className="w-full max-w-4xl flex flex-col items-center mt-12">
            
            {/* 3D Carousel View */}
            <div className="relative w-full h-48 flex items-center justify-center mb-16 perspective-1000">
               {users.map((user, idx) => {
                  const selectedIdx = users.findIndex(u => u.id === selectedUser?.id);
                  let offset = idx - selectedIdx;
                  
                  const absOffset = Math.abs(offset);
                  const isVisible = absOffset <= 2; 
                  
                  if (!isVisible) return null;
                  
                  const isActive = absOffset === 0;
                  const translateX = offset * 110; 
                  const scale = isActive ? 1.3 : Math.max(0.7, 1 - (absOffset * 0.2));
                  const zIndex = 20 - absOffset;
                  const opacity = isActive ? 1 : Math.max(0.3, 0.8 - (absOffset * 0.4));
                  
                  return (
                     <div 
                        key={user.id} 
                        onClick={() => handleUserClick(user)}
                        className={`absolute transition-all duration-500 ease-out cursor-pointer flex flex-col items-center group`}
                        style={{
                           transform: `translateX(${translateX}px) scale(${scale})`,
                           zIndex,
                           opacity
                        }}
                     >
                        <div className={`w-20 h-20 rounded-full overflow-hidden shadow-lg transition-all duration-300 ${isActive ? 'ring-[3px] ring-[#D4AF37] ring-offset-4 ring-offset-slate-50' : 'filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                           {user.avatar_base64 ? (
                              <img src={user.avatar_base64} alt={user.username} className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-3xl">
                                 {user.username.charAt(0).toUpperCase()}
                              </div>
                           )}
                        </div>
                        
                         {/* Nombre y rol ocultos */}
                     </div>
                  );
               })}
            </div>

            {/* PIN Input Area */}
            <div className={`transition-all duration-500 transform ${selectedUser && !loading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
               <div className="flex flex-col items-center relative w-full">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                     {isAdmin ? "Ingresa tu Contraseña" : "Ingresa tu PIN"}
                  </p>
                  
                  {isAdmin ? (
                     <div className="w-full max-w-sm flex flex-col gap-4">
                        <input
                           ref={pinInputRef}
                           type="password"
                           value={pin}
                           onChange={handlePinChange}
                           onKeyDown={handleKeyDown}
                           disabled={loading}
                           className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none text-center text-lg tracking-widest shadow-sm transition-all"
                           placeholder="••••••••"
                           autoFocus
                        />
                        <button
                           onClick={() => submitLogin(pin)}
                           disabled={loading || !pin}
                           className="w-full bg-slate-900 text-[#D4AF37] font-bold py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 shadow-md"
                        >
                           {loading ? "Iniciando..." : "Iniciar Sesión"}
                        </button>
                     </div>
                  ) : (
                     <div className="relative w-full flex justify-center">
                        <input 
                           ref={pinInputRef}
                           type="password" 
                           value={pin}
                           onChange={handlePinChange}
                           className="absolute inset-0 opacity-0 cursor-text z-20 w-full h-full"
                           autoFocus
                           disabled={loading}
                           inputMode="numeric"
                           autoComplete="off"
                        />
                        
                        <div className="flex gap-4 relative z-10 pointer-events-none">
                           {[0, 1, 2, 3].map(i => {
                              const isFilled = pin.length > i;
                              const isCurrent = pin.length === i;
                              return (
                                 <div key={i} className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center transition-all bg-white shadow-sm ${isFilled ? 'border-[#D4AF37] scale-105' : isCurrent ? 'border-slate-300 ring-4 ring-slate-100 scale-110 shadow-md' : 'border-slate-200 text-transparent'}`}>
                                    {isFilled && <div className="w-3 h-3 bg-slate-800 rounded-full" />}
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}
                  
                  {loading && !isAdmin && (
                     <div className="absolute inset-0 flex items-end justify-center z-30 mb-[-2rem]">
                        <RefreshCw className="animate-spin text-[#D4AF37] w-5 h-5" />
                     </div>
                  )}
               </div>
            </div>
            
         </div>
      )}
    </div>
  );
}

export default function Home() {
  const globalStyles = (
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
    `}} />
  );

  const [activeDept, setActiveDept] = useState("Producción");
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [clients, setClients] = useState([]);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  // SLA dinímico: mapa depto ΓåÆ media real en minutos
  const [slaAverages, setSlaAverages] = useState({});
  
  // Recibos State
  const [receiptCase, setReceiptCase] = useState(null);
  const [discountType, setDiscountType] = useState("$"); 
  const [discountValue, setDiscountValue] = useState("");
  const [applyIva, setApplyIva] = useState(false);
  const [receiptSaving, setReceiptSaving] = useState(false);
  
  // Estado para los acordeones de los departamentos y de los casos individuales
  const [expandedDepts, setExpandedDepts] = useState({});
  const [expandedCases, setExpandedCases] = useState({});

  const toggleDept = (deptId) => setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  const toggleCase = (caseId) => setExpandedCases(prev => ({ ...prev, [caseId]: !prev[caseId] }));

  const loadInitialData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user && (user.rol?.toLowerCase().includes('recep') || user.rol?.toLowerCase().includes('admin'))) {
        const clientData = await getClients();
        setClients(clientData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuthChecked(true);
    }
  };

  // Renueva el JWT del Ghost User cuando expira (~1h en Supabase)
  const refreshGhostToken = async () => {
    try {
      await fetch('/api/refresh-ghost', { method: 'POST' });
    } catch (e) {
      console.warn('Ghost refresh failed:', e);
    }
  };

  const fetchCases = async ({ silent = false, retryOnAuth = true } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/cases?t=' + new Date().getTime(), { 
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        // Respuesta vílida
        setCases(data);
        // Auto-collapse logic
        const newExpandedState = {};
        departments.forEach(dept => {
          const hasCases = data.some(c => c.dept === dept.id);
          // Only true means it is HIDDEN (collapsed). So if hasCases is false, hide it (true)
          if (!hasCases) {
            newExpandedState[dept.id] = true;
          }
        });
        setExpandedDepts(newExpandedState);
      } else if (retryOnAuth) {
        // Token probablemente expirado ΓåÆ refrescar y reintentar UNA vez
        await refreshGhostToken();
        return fetchCases({ silent, retryOnAuth: false });
      }
    } catch (err) {
      console.warn('fetchCases error:', err);
      if (retryOnAuth) {
        await refreshGhostToken();
        return fetchCases({ silent, retryOnAuth: false });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Siempre refrescar el token al cargar la pígina, LUEGO traer datos
    refreshGhostToken().then(() => {
      loadInitialData();
      fetchCases();
    });

    // Cargar promedios históricos para el semíforo predictivo
    const deptIds = departments.map(d => d.id);
    getAllDeptAverages(deptIds)
      .then(avgs => setSlaAverages(avgs))
      .catch(() => {}); // silencioso si falla

    // Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'casos_master' }, () => {
        fetchCases({ silent: true });
      })
      .subscribe();

    // Refresca token + datos cuando la tab vuelve a estar activa (tras inactividad)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshGhostToken().then(() => fetchCases({ silent: true }));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Heartbeat cada 45 min para mantener el token fresco
    const heartbeat = setInterval(() => {
      refreshGhostToken().then(() => fetchCases({ silent: true }));
    }, 45 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(heartbeat);
    };
  }, []);


  const dateTimeSort = (a, b) => {
     const timeA = a.hora_entrega ? a.hora_entrega : '23:59';
     const timeB = b.hora_entrega ? b.hora_entrega : '23:59';
     const dateA = new Date(`${a.fecha_entrega || '2099-12-31'}T${timeA}`).getTime();
     const dateB = new Date(`${b.fecha_entrega || '2099-12-31'}T${timeB}`).getTime();
     
     if (isNaN(dateA) && isNaN(dateB)) return 0;
     if (isNaN(dateA)) return 1;
     if (isNaN(dateB)) return -1;
     
     return dateA - dateB;
  };

  const currentOperatorName = currentUser ? (currentUser.nombre_completo || currentUser.username) : null;
  const canCreateCases = currentUser && (currentUser.rol?.toLowerCase().includes('recep') || currentUser.rol?.includes('Admin'));

  const getDeliveryDateProps = (fecha, hora) => {
    if (!fecha) return null;
    try {
      const [yyyy, mm, dd] = fecha.split('-');
      if (!yyyy || !mm || !dd) return null;
      
      const dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let isDueToday = false; let isPastDue = false;
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

      return { text: `${dd}/${mm} ${timeStr}`.trim(), colorClass };
    } catch { return null; }
  };

  /**
   * Semíforo Predictivo (Inteligencia Predictiva).
   * TV  = HoraActual ΓêÆ hora_llegada  (tiempo real que el caso lleva en el depto)
   * MD  = media histórica de los últimos 30 casos del mismo depto
   * ≡ƒƒó  TV < 50% de MD
   * ≡ƒƒí  TV entre 50% y 85% de MD
   * ≡ƒö┤  TV >= 85% de MD (ya estí tarde según el ritmo real del lab)
   */
  const getSlaColor = (horaLlegada, depto) => {
    if (!horaLlegada || !depto) return null;
    const tv = (Date.now() - new Date(horaLlegada).getTime()) / 60000; // minutos
    if (tv <= 0) return null;
    const md = slaAverages[depto] ?? 120; // 120 min por defecto si no hay datos aún
    const ratio = tv / md;
    if (ratio < 0.50) return 'green';
    if (ratio < 0.85) return 'yellow';
    return 'red';
  };

  // --- RECEIPTS LOGIC ---
  const openReceiptModal = (c) => {
      setReceiptCase(c);
      setDiscountType("$");
      setDiscountValue("");
      setApplyIva(false);
  };
  
  const closeReceiptModal = () => {
      setReceiptCase(null);
  };

  const calculateReceipt = () => {
      if (!receiptCase) return { subtotal: 0, discountAmount: 0, ivaAmount: 0, total: 0 };
      
      let initialSubtotal = 0;
      if (receiptCase.items && receiptCase.items.length > 0) {
          receiptCase.items.forEach(it => {
              initialSubtotal += (it.precio_unitario || 0) * (it.unidades || 1);
          });
      }
      
      let discountAmount = 0;
      const numVal = parseFloat(discountValue) || 0;
      if (discountType === "$") {
          discountAmount = numVal;
      } else {
          discountAmount = initialSubtotal * (numVal / 100);
      }
      
      const afterDiscount = Math.max(0, initialSubtotal - discountAmount);
      const ivaAmount = applyIva ? (afterDiscount * 0.16) : 0;
      const total = afterDiscount + ivaAmount;
      
      return { subtotal: initialSubtotal, discountAmount, ivaAmount, total };
  };

  // Shadow Audit Sombra for Receipt Modal (Production)
  useEffect(() => {
    if (!receiptCase) return;
    
    const calc = calculateReceipt();
    const snapshot = {
      descuentoTipo: discountType,
      descuentoValor: discountValue,
      aplicaIva: applyIva,
      subtotal: calc.subtotal,
      descuentoMonto: calc.discountAmount,
      ivaMonto: calc.ivaAmount,
      total: calc.total
    };

    const timer = setTimeout(() => {
      logShadowAudit({
        caso_id: receiptCase.internal_id,
        codigo_caso: receiptCase.id,
        snapshot_data: snapshot,
        guardado_oficial: false
      }).catch(() => {});
    }, 3000);

    return () => clearTimeout(timer);
  }, [discountValue, discountType, applyIva, receiptCase]);

  const handleGenerateReceipt = async () => {
      setReceiptSaving(true);
      const payload = {
         ...calculateReceipt(),
         discountType,
         discountValue: parseFloat(discountValue) || 0,
         applyIva
      };
      
      const res = await saveReceiptData(receiptCase.internal_id, payload);
      setReceiptSaving(false);
      
      if (res.success) {
         logShadowAudit({
           caso_id: receiptCase.internal_id,
           codigo_caso: receiptCase.id,
           snapshot_data: { discountType, discountValue, applyIva },
           guardado_oficial: true
         }).catch(() => {});
         markShadowAuditAsSaved(receiptCase.internal_id).catch(() => {});
         
         toast.success("Recibo generado y caso avanzado a Empaquetado.");
         closeReceiptModal();
         fetchCases();
      } else {
         toast.error(res.error || "Error al generar recibo.");
      }
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><RefreshCw className="animate-spin text-slate-300 w-8 h-8" /></div>;
  }
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => { setCurrentUser(u); loadInitialData(); fetchCases(); }} />;
  }

  // Si el usuario es administrador o dueño y accidentalmente entra a producción (/), lo redirigimos a su panel
  if (currentUser.rol === 'lab_owner' || currentUser.username?.toLowerCase() === 'admin' || currentUser.username?.toLowerCase() === 'legion' || currentUser.username?.toLowerCase() === 'coloraturacorp' || (currentUser.rol && currentUser.rol.includes('Administrativo'))) {
    window.location.href = '/admin';
    return <div className="min-h-screen bg-white flex items-center justify-center"><RefreshCw className="animate-spin text-slate-300 w-8 h-8" /></div>;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await logoutUser();
    setCurrentUser(null);
    setAuthChecked(false);
    window.location.reload();
  };

  // Filtrado de roles para los grupos visuales
  const userRolesStr = currentUser.rol || "";
  const rawRoles = userRolesStr.split(',').map(r => r.trim());
  const isAdmin = rawRoles.some(r => !!r.match(/admin/i));

  // Variable global: casos de Yesos En Proceso/Pausa para mostrar como stack
  const casosYesosEnProceso = cases.filter(c =>
    c.dept === 'Yesos' &&
    (c.status === 'En Proceso' || c.status === 'En Pausa')
  );

  let groupsToRender = [];
  if (activeDept === "all") {
    // Si estamos en TODAS (Monitor Global), renderizar TODOS los departamentos operativos
    groupsToRender = departments;
  } else {
    // Si estamos en Departamentos Operativos, renderizar solo las íreas asignadas al usuario
    if (isAdmin) {
      groupsToRender = departments;
    } else {
      groupsToRender = departments.filter(d => {
         const hasExactId = rawRoles.includes(d.id);
         const hasName = rawRoles.includes(d.name);
         const hasStrippedId = rawRoles.includes(d.id.replace("Digital_", ""));
         return hasExactId || hasName || hasStrippedId || d.id === "Sinterizado";
      });
    }
  }

  // Pre-abrir todos los acordeones en la carga inicial (hacemos un set 1 vez)
  // Como Set no funciona fícil, lo inicializamos solo la primera vez en useEffect si fuera util,
  // pero podemos basarnos predeterminadamente en que false/undefined = "Abierto", true = "Cerrado"
  // para simplificar el estado.
  const isDeptHidden = (deptId) => !!expandedDepts[deptId];



  return (
    <div className="h-[100dvh] overflow-hidden bg-white sm:bg-slate-50 lg:bg-slate-100 flex flex-col font-sans transition-colors duration-300 relative">
      <Toaster position="bottom-center" />
      <NewCaseModal isOpen={isNewCaseModalOpen} onClose={() => setIsNewCaseModalOpen(false)} clients={clients} onActionComplete={fetchCases}/>

      {/* MODAL DE RECIBO / BORRADOR */}
      {receiptCase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-md transition-opacity" onClick={closeReceiptModal}></div>
          <div 
            className="bg-white rounded-[24px] w-full max-w-md relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 -10px 40px -15px rgba(0, 0, 0, 0.1)' }}
          >
             <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white relative z-20">
                <div>
                   <h2 className="text-xl font-black text-slate-800 tracking-tight">Borrador de Recibo</h2>
                   <p className="text-sm font-medium text-slate-500 mt-0.5">Orden #{receiptCase.id}</p>
                </div>
                <button onClick={closeReceiptModal} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                   <X size={20} strokeWidth={2.5}/>
                </button>
             </div>
             
             <div className="p-6 bg-[#f8fafc] flex-1 overflow-y-auto">
                <div className="mb-6 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                   <div className="text-sm">
                      <span className="text-slate-400 block mb-1">Paciente</span>
                      <span className="font-bold text-slate-800">{receiptCase.patient}</span>
                   </div>
                   <div className="w-full h-px bg-slate-50 my-3"></div>
                   <div className="text-sm">
                      <span className="text-slate-400 block mb-1">Doctor/Clínica</span>
                      <span className="font-semibold text-slate-700">{receiptCase.doctor}</span>
                   </div>
                </div>

                <div className="mb-6">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Desglose de Conceptos</h3>
                   <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      {receiptCase.items && receiptCase.items.length > 0 ? receiptCase.items.map((it, idx) => (
                         <div key={idx} className="px-4 py-3 flex justify-between items-center border-b border-slate-50 last:border-0">
                            <div>
                               <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                 <span className="text-blue-500">{it.unidades}x</span>
                                 {it.producto}
                               </div>
                               {it.dientes && <div className="text-xs text-slate-400 font-medium mt-0.5">Piezas: #{Array.isArray(it.dientes) ? it.dientes.join(', ') : it.dientes}</div>}
                            </div>
                            <div className="text-sm font-bold text-slate-700">
                               ${(typeof it.precio_unitario === 'number' ? it.precio_unitario * it.unidades : 0).toFixed(2)}
                            </div>
                         </div>
                      )) : (
                         <div className="p-4 text-center text-sm text-slate-500">Sin materiales registrados.</div>
                      )}
                   </div>
                </div>

                <div className="mb-2">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Ajustes de Cobro</h3>
                   <div className="space-y-3">
                      <div className="flex items-center gap-2">
                         <div className="flex bg-slate-200/60 rounded-lg p-1 shrink-0">
                            <button 
                               onClick={() => { setDiscountType("$"); setDiscountValue(""); }}
                               className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${discountType === "$" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                               <DollarSign size={14} className="inline-block -mt-0.5"/>
                            </button>
                            <button 
                               onClick={() => { setDiscountType("%"); setDiscountValue(""); }}
                               className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${discountType === "%" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                               <Percent size={14} strokeWidth={2.5} className="inline-block -mt-0.5"/>
                            </button>
                         </div>
                         <div className="relative flex-1">
                            <input
                               type="number"
                               placeholder={discountType === "$" ? "Monto a descontar..." : "Porcentaje (ej. 10)"}
                               value={discountValue}
                               onChange={(e) => setDiscountValue(e.target.value)}
                               className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                            />
                         </div>
                      </div>

                      <div 
                         onClick={() => setApplyIva(!applyIva)}
                         className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-slate-200 cursor-pointer hover:border-[#D4AF37]/50 shadow-sm transition-colors"
                      >
                         <span className="text-sm font-bold text-slate-700 select-none">Aplicar 16% IVA</span>
                         <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${applyIva ? "bg-[#0062cc]" : "bg-slate-200"}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all absolute ${applyIva ? "left-[22px]" : "left-[4px]"}`}></div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {(() => {
                const calc = calculateReceipt();
                return (
                   <div className="bg-white border-t border-slate-100 px-6 py-5">
                      <div className="space-y-2 mb-5">
                         <div className="flex justify-between text-sm text-slate-500 font-medium">
                            <span>Subtotal</span>
                            <span>${calc.subtotal.toFixed(2)}</span>
                         </div>
                         {calc.discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-red-500 font-semibold">
                               <span>Descuento</span>
                               <span>-${calc.discountAmount.toFixed(2)}</span>
                            </div>
                         )}
                         {calc.ivaAmount > 0 && (
                            <div className="flex justify-between text-sm text-slate-500 font-medium">
                               <span>IVA (16%)</span>
                               <span>+${calc.ivaAmount.toFixed(2)}</span>
                            </div>
                         )}
                         <div className="w-full h-px bg-slate-100 my-1"></div>
                         <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-slate-800">Total a Cobrar</span>
                            <span className="text-2xl font-black text-[#0062cc] tracking-tight">${calc.total.toFixed(2)}</span>
                         </div>
                      </div>
                      
                      <button
                         disabled={receiptSaving}
                         onClick={handleGenerateReceipt}
                         className="w-full bg-[#1e293b] hover:bg-[#0f172a] disabled:opacity-70 text-white rounded-xl py-3.5 font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                      >
                         {receiptSaving ? <RefreshCw size={18} className="animate-spin" /> : <Calculator size={18} />}
                         {receiptSaving ? "Procesando..." : "Aprobar Recibo y Avanzar"}
                      </button>
                   </div>
                );
             })()}
          </div>
        </div>
      )}

      {/* LAYER 1: LA HOJA DE PAPEL (SCROLLING Y CONTENIDO) */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden mobile-scroll z-0 glass-lines-bg">
        {/* NUEVO VIDRIO GLOBAL (Debajo de las tarjetas, sobre el papel) */}
        <div className="fixed inset-0 bg-slate-50/15 backdrop-blur-[4px] pointer-events-none z-0"></div>
        
        <div style={{ paddingTop: '144px', paddingBottom: '100px' }} className="w-full sm:max-w-[520px] lg:max-w-[680px] mx-auto flex flex-col relative z-10 px-0">
           {loading && cases.length === 0 ? (
               <div className="p-10 text-center text-slate-400 font-medium text-sm">Cargando datos...</div>
           ) : (
               
               

               <div className="flex flex-col">
               {casosYesosEnProceso.length > 0 && activeDept !== "all" && (
                 <StackedCases
                   cases={casosYesosEnProceso}
                   onRefresh={fetchCases}
                   operatorName={currentOperatorName}
                 />
               )}
               
                 {groupsToRender.map(grupo => {
                   // Obtener los casos para este grupo
                   const casosEnGrupo = cases
                     .filter(c => c.dept === grupo.id)
                     .sort(dateTimeSort);

                    // -- Tarjetas Apiladas (solo visible en Escaneo) --
                    // Casos iniciados (En Proceso / En Pausa) en Yesos que aun no fueron terminados.
                    const casosApilados = grupo.id === 'Digital_Escaneo'
                      ? cases
                          .filter(c =>
                            c.dept === 'Yesos' &&
                            (c.status === 'En Proceso' || c.status === 'En Pausa')
                          )
                          .sort(dateTimeSort)
                      : [];
                   
                   const collapsed = isDeptHidden(grupo.id);

                   return (
                     <div key={grupo.id} className="mb-2">
                       <div 
                         onClick={() => toggleDept(grupo.id)}
                         className="flex items-center justify-center py-3 px-4 cursor-pointer select-none group mb-2 mt-4 relative bg-slate-50 mx-4 sm:mx-0 rounded-2xl border border-slate-200 shadow-sm sticky top-[144px] z-30 pointer-events-auto transition-transform active:scale-[0.98]"
                       >
                         <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">{grupo.name.replace("Digital_", "")}</span>
                         <div className="absolute right-2">
                           {collapsed ? <ChevronDown size={20} className="text-slate-300 group-hover:text-[#D4AF37] transition-colors" /> : <ChevronUp size={20} className="text-slate-300 group-hover:text-[#D4AF37] transition-colors" />}
                         </div>
                       </div>

                       {/* Contenido Colapsable */}
                       {!collapsed && (
                         <div className="bg-transparent mt-2">
                           {/* Boton Agregar solo en Recepción */}
                           {grupo.id === "Recepción" && canCreateCases && activeDept !== "all" && (
                             <div className="px-4 pt-4 pb-2">
                               <button 
                                  onClick={() => setIsNewCaseModalOpen(true)}
                                  className="w-full bg-[#D4AF37] hover:bg-yellow-500 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-sm transition-colors"
                               >
                                  <Plus size={18} /> Registrar Nuevo
                               </button>
                             </div>
                           )}

                           
                            {/* Lista de Casos */}
                           {casosEnGrupo.length === 0 && casosApilados.length === 0 ? (
                             <div className="py-6 text-center text-slate-400 font-medium text-sm">
                               No hay casos en {grupo.name.replace("Digital_", "")}
                             </div>
                           ) : casosEnGrupo.length === 0 ? null : (
                             <ul className="flex flex-col">
                               {casosEnGrupo.map((c) => {
                                  const devProps = getDeliveryDateProps(c.fecha_entrega, c.hora_entrega);
                                  const slaColor = getSlaColor(c.hora_llegada, c.dept);
                                  const shadowClass = c.urgent
                                    ? 'shadow-[0_0_15px_rgba(239,68,68,0.4)] border-red-200 ring-1 ring-red-500/20'
                                    : slaColor === 'red'    ? 'shadow-[0_0_10px_rgba(248,113,113,0.3)] border-red-100'
                                    : slaColor === 'yellow' ? 'shadow-[0_0_10px_rgba(250,204,21,0.3)] border-yellow-100'
                                    : slaColor === 'green'  ? 'shadow-[0_0_10px_rgba(74,222,128,0.3)] border-green-100'
                                    : 'shadow-sm border-white/40 hover:shadow-md';
                                  
                                  const cExpanded = !!expandedCases[c.internal_id];
                                  const isReadOnly = activeDept === "all";

                                  return (
                                      <li key={c.internal_id} className={`flex flex-col transition-all bg-white/90 backdrop-blur-md rounded-[2rem] mx-4 sm:mx-0 mb-4 overflow-hidden border ${shadowClass}`}>
                                        <div className="flex items-start px-5 pt-4 pb-3 min-w-0">
                                          {/* Izquierda: Codigo, Fecha/Hora, Paciente */}
                                          <div className="flex-1 flex flex-col min-w-0 pr-4 gap-1.5">
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
                                            <p className="text-[16px] font-bold text-slate-900 truncate tracking-tight">
                                              {c.patient}
                                              {c.doctor && <span className="ml-2 text-[14px] font-medium text-slate-400 tracking-normal">({c.doctor})</span>}
                                            </p>
                                            
                                            {c.items && c.items.length > 0 && (() => {
                                              // AGRUPACIÓN Y FORMATEO
                                              const grouped = {};
                                              
                                              c.items.forEach(item => {
                                                  const p = item.producto ? item.producto.toLowerCase() : "";
                                                  const cat = item.categoria ? item.categoria.toLowerCase() : "";
                                                  
                                                  // 1. Material Base y Color
                                                  let matText = "";
                                                  let matColor = "";
                                                  
                                                  if (cat.includes("zr") || cat.includes("zirconia") || p.includes("zirconia") || p.includes("zr")) {
                                                    matText = "Zr";
                                                    matColor = "text-[#D4AF37]"; // Dorado
                                                  } else if (cat.includes("pmma") || p.includes("pmma")) {
                                                    matText = "(C5O2H8)n";
                                                    matColor = "text-red-500";
                                                  } else if (cat.includes("emax") || cat.includes("litio") || p.includes("emax") || p.includes("litio") || p.includes("lisio4") || p.includes("li2si2o5")) {
                                                    matText = "Li2Si2O5";
                                                    matColor = "text-blue-500";
                                                  } else if (cat.includes("metal") || p.includes("metal")) {
                                                    matText = "Metal";
                                                    matColor = "text-slate-500";
                                                  } else {
                                                    matText = item.producto.split(' ')[0] || "Pieza"; // Fallback
                                                    matColor = "text-slate-600";
                                                  }

                                                  // 2. Extraer sufijo de Tipo (I, Ca, Co) y pegarlo al matText (todo mismo color y negrita)
                                                  if (p.includes("implante") || p.includes("incrustacion") || p.includes("inlay") || p.includes("onlay")) {
                                                      matText += " I";
                                                  } else if (p.includes("carilla")) {
                                                      matText += " Ca";
                                                  } else if (p.includes("corona")) {
                                                      matText += " Co";
                                                  }

                                                  // 3. Translucidez (Subtipo, ej. HT, LT, ML)
                                                  let extraText = "";
                                                  const dashMatch = item.producto.match(/\s-\s([A-Za-z0-9]+)/);
                                                  const parenMatch = item.producto.match(/\(([^)]+)\)/); // Compatibilidad vieja
                                                  let subtipo = "";
                                                  
                                                  if (dashMatch) {
                                                      subtipo = dashMatch[1];
                                                  } else if (parenMatch) {
                                                      subtipo = parenMatch[1].toUpperCase();
                                                  }
                                                  
                                                  if (["HT", "LT", "MT", "MO", "HO", "ML", "Mono"].includes(subtipo)) {
                                                      extraText = subtipo;
                                                  }

                                                  const groupKey = `${matText}|${matColor}|${extraText}`;
                                                  
                                                  if (!grouped[groupKey]) {
                                                      grouped[groupKey] = { matText, matColor, extraText, teeth: [] };
                                                  }
                                                  
                                                  if (item.dientes) {
                                                      // Teeth often come as "11,12" or "11"
                                                      const tArr = item.dientes.split(',').map(s => s.trim()).filter(Boolean);
                                                      grouped[groupKey].teeth.push(...tArr);
                                                  }
                                              });

                                              // Generar la lista final y formatear dientes
                                              const renderedLines = Object.values(grouped).map((group, idx) => {
                                                  // Eliminar duplicados y formatear dientes consecutivos
                                                  let teethStr = "";
                                                  if (group.teeth.length > 0) {
                                                      let sorted = [...new Set(group.teeth)].map(Number).sort((a,b) => a-b);
                                                      let ranges = [];
                                                      let start = sorted[0];
                                                      let prev = sorted[0];
                                                      for (let i = 1; i < sorted.length; i++) {
                                                          let curr = sorted[i];
                                                          if (curr === prev + 1) {
                                                              prev = curr;
                                                          } else {
                                                              ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
                                                              start = curr;
                                                              prev = curr;
                                                          }
                                                      }
                                                      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
                                                      teethStr = ranges.join(", ");
                                                  }

                                                  return (
                                                    <div key={idx} className="flex items-center gap-1.5 truncate mt-0.5">
                                                      <span className={`text-[16px] font-black tracking-tight ${group.matColor}`}>
                                                        {group.matText}
                                                      </span>
                                                      {group.extraText && (
                                                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-100/50 px-1.5 py-0.5 rounded-md tracking-tight shadow-sm">
                                                          {group.extraText}
                                                        </span>
                                                      )}
                                                      {c.color && (
                                                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-md tracking-tight ml-0.5 shadow-sm border border-amber-200/50">
                                                          {c.color}
                                                        </span>
                                                      )}
                                                      {teethStr && (
                                                        <span className="text-[14px] font-medium text-slate-700 truncate ml-0.5">
                                                          #{teethStr}
                                                        </span>
                                                      )}
                                                    </div>
                                                  );
                                              });

                                              return (
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                  {renderedLines}
                                                </div>
                                              );
                                            })()}
                                            
                                            {/* COMENTARIO (opcional) */}
                                            {c.comentarios && c.comentarios.trim() !== "" && (
                                              <div className="mt-1 text-[13px] text-slate-600 leading-snug break-words pr-2">
                                                <span className="font-bold text-slate-700 mr-1">Comentario:</span>
                                                {c.comentarios}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Derecha: Pill de estado del Caso */}
                                          <div className="flex flex-col items-end gap-1.5 min-w-[80px] shrink-0">
                                            <StatusBadge status={c.status} />
                                            {c.status === 'En Proceso' && c.operador_actual && (
                                               <span className="text-[10px] text-slate-600 font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                                                  <User size={10} className="inline mr-1" />{c.operador_actual.split(' ')[0]}
                                               </span>
                                             )}
                                          </div>
                                        </div>

                                        {/* Row Expandible del Caso (Solo si no es monitor global / read_only) */}
                                        {!isReadOnly && (
                                           <CaseActionBar 
                                              onOpenReceipt={openReceiptModal}
                                             currentCase={c} 
                                             onRefresh={fetchCases} 
                                             operatorName={currentOperatorName} 
                                             isExpanded={cExpanded} 
                                             onToggleExpand={() => toggleCase(c.internal_id)} 
                                           />
                                        )}
                                      </li>
                                  );
                               })}
                             </ul>
                           )}
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
           )}
        </div>
      </div>

      {/* LAYER 2: EL VIDRIO OPACO (ZONA FUERA DEL HUECO) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
        {/* Top glass (cubre Lab OS y el menú) */}
        <div className="h-[144px] bg-slate-50/15 backdrop-blur-[4px] w-full transition-all duration-300 border-b border-white/40" />
        
        {/* Middle section (El Hueco) */}
        <div className="flex-1 flex relative w-full">
          {/* Lado izquierdo */}
          <div className="flex-1 bg-slate-50/15 backdrop-blur-[4px] h-full transition-all duration-300 border-r border-white/40 hidden sm:block" />
          
          {/* El Hueco en sí */}
          <div className="w-full sm:max-w-[520px] lg:max-w-[680px] mx-auto bg-transparent h-full sm:shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] px-0 flex flex-col relative pointer-events-none">
             {/* Marco del hueco sin borde visible, solo el espacio libre */}
             <div className="w-full flex-1 relative z-30 pointer-events-none"></div>
          </div>
          
          {/* Lado derecho */}
          <div className="flex-1 bg-slate-50/15 backdrop-blur-[4px] h-full transition-all duration-300 border-l border-white/40 hidden sm:block" />
        </div>
      </div>

      {/* LAYER 3: LOS PAPELES SOLIDOS (TÍTULOS Y BOTONES FLOTANTES) */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center">
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
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeDept === "Producción" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
             >
                Producción
             </button>
             <button 
                onClick={() => setActiveDept("all")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeDept === "all" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
             >
                Monitor Global
             </button>
           </div>
        </div>
      </div>

      {/* Avatar de usuario ΓÇö fijo al pie de pantalla, centrado */}
      {currentUser && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="w-11 h-11 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-700 font-bold text-[15px] hover:bg-slate-50 hover:shadow-xl transition-all active:scale-95 select-none"
          >
            {currentUser.username?.charAt(0).toUpperCase()}
          </button>
        </div>
      )}
    </div>
  );
}
