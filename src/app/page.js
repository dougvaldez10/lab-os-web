"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Search, Star, MessageSquare, Clipboard, MoreHorizontal, LogOut, ChevronDown, Check, RefreshCw, Layers, Smile, Shield, Smartphone, Package, Target, Sun, X, Calculator, DollarSign, Percent } from "lucide-react";
import { getAllUsers, loginUser } from "@/lib/auth";
import { generateReceipt } from "@/app/actions/receipts";
import { Toaster, toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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

// Selector Personalizado Inteligente Extirpado de Modal
const ClientSelect = ({ clients, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filtered = clients.filter(c => {
     const term = search.toLowerCase();
     return (c.nombre?.toLowerCase().includes(term) || c.nombre_dentista?.toLowerCase().includes(term));
  });

  const selectedClient = clients.find(c => c.id === selected);

  return (
    <div className="relative">
      <input type="hidden" name="cliente_id" value={selected || ''} required />
      
      <div 
        onClick={() => setOpen(!open)}
        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 hover:border-[#D4AF37] transition-colors cursor-pointer flex items-center justify-between shadow-sm h-[46px]"
      >
        <span className="truncate">
          {selectedClient ? (
            <span className="flex items-baseline gap-2 truncate">
              <span className="text-sm font-bold truncate">{selectedClient.nombre_dentista || selectedClient.nombre}</span>
              {selectedClient.nombre_dentista && <span className="text-xs text-slate-400 truncate hidden sm:inline-block">({selectedClient.nombre})</span>}
            </span>
          ) : (
            <span className="text-slate-400 text-sm">Buscar doctor o clínica...</span>
          )}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
               <input 
                 autoFocus 
                 type="text" 
                 placeholder="Escribe para buscar..." 
                 className="w-full bg-white rounded-lg px-3 py-2 text-sm border border-slate-200 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 onClick={e => e.stopPropagation()}
               />
            </div>
            <div className="overflow-y-auto custom-scrollbar">
               {filtered.length === 0 ? (
                 <div className="p-4 text-sm text-slate-400 text-center flex flex-col items-center gap-1">
                    <span>Sin resultados</span>
                 </div>
               ) : (
                 filtered.map(c => (
                   <div 
                     key={c.id} 
                     onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
                     className="px-4 py-2.5 hover:bg-[#D4AF37]/10 cursor-pointer border-b border-slate-50 last:border-0 transition-colors flex flex-col"
                   >
                     <span className="font-bold text-slate-800 text-sm">{c.nombre_dentista ? (c.nombre_dentista.toLowerCase().includes('dr') ? c.nombre_dentista : 'Dr. ' + c.nombre_dentista) : c.nombre}</span>
                     {c.nombre_dentista && <span className="text-xs text-slate-500 font-medium">{c.nombre}</span>}
                   </div>
                 ))
               )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function StatusBadge({ status }) {
  if (status === 'En Proceso') return <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 whitespace-nowrap">En Proceso</span>;
  if (status === 'En Pausa') return <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10 whitespace-nowrap">En Pausa</span>;
  if (status === 'Terminado') return <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20 whitespace-nowrap">Terminado</span>;
  return <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 whitespace-nowrap">Pendiente</span>;
}

// Barra de progreso vertical en el borde derecho de la tarjeta
function FileProgressBar({ progress, direction }) {
  if (progress === null || progress === undefined) return null;
  const isUpload = direction === 'upload'; // upload = abajo→arriba, download = arriba→abajo
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
        toast.success(`Archivo "${file.name}" cargado ✓`);
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
      toast.success(`${files.length} archivo(s) descargado(s) ✓`);
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
               <CheckCircle2 size={14} className="text-green-600" /> Terminar Proceso
             </button>
          )}
          
          <button 
            onClick={() => handleAction('PAUSE', 'Pausando...', `Caso ${currentCase.id} en Pausa`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm font-medium"
          >
            <PauseCircle size={14} className="text-red-600" /> Pausar
          </button>

          {/* Archivos Dinamicos */}
          {showDownloadEscaneo && (
            <button onClick={() => handleDownload('Digital_Escaneo')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-100 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors shadow-sm font-medium">
              <DownloadCloud size={14} /> Descargar
            </button>
          )}
          {showDownloadDiseno && (
            <button onClick={() => handleDownload('Digital_Diseno')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-100 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors shadow-sm font-medium">
              <DownloadCloud size={14} /> Descargar
            </button>
          )}
          
          {showUploadEscaneo && (
            <button onClick={() => handleUpload('Digital_Escaneo')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-100 rounded-lg text-sm text-green-700 hover:bg-green-50 transition-colors shadow-sm font-medium">
              <UploadCloud size={14} /> Cargar
            </button>
          )}
          {showUploadDiseno && (
            <button onClick={() => handleUpload('Digital_Diseno')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-100 rounded-lg text-sm text-green-700 hover:bg-green-50 transition-colors shadow-sm font-medium">
              <UploadCloud size={14} /> Cargar
            </button>
          )}
        </div>
      )}
    </div>
  );
}


function NewCaseModal({ isOpen, onClose, clients, onActionComplete }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [items, setItems] = useState([]);
  const [material, setMaterial] = useState('');
  const [producto, setProducto] = useState('');
  const [productsMap, setProductsMap] = useState({});
  const [tipo, setTipo] = useState('Análogo');

  // Cargar catálogo de productos desde Supabase al abrir el modal
  useEffect(() => {
    if (isOpen && Object.keys(productsMap).length === 0) {
      getProducts().then(data => setProductsMap(data));
    }
  }, [isOpen]);

  const categoriesList = Object.keys(productsMap).sort();
  
  const getFilteredProducts = () => {
    const allProductsForMaterial = productsMap[material] || [];
    const filtered = allProductsForMaterial.filter(p => {
      const isDigitalInName = p.raw.toLowerCase().includes('digital');
      return tipo === 'Digital' ? isDigitalInName : !isDigitalInName;
    });
    // Regla de respaldo: Si el filtro se queda vacío, mostramos todos
    return filtered.length > 0 ? filtered : allProductsForMaterial;
  };
  
  const currentProducts = material ? getFilteredProducts() : [];

  const handleMaterialChange = (val) => { setMaterial(val); setProducto(''); };

  const upperTeeth = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
  const lowerTeeth = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];
  
  const addedTeeth = items.flatMap(item => item.dientes);

  const toggleTooth = (t) => {
    if (selectedTeeth.includes(t)) setSelectedTeeth(selectedTeeth.filter(x => x !== t));
    else setSelectedTeeth([...selectedTeeth, t]);
  };

  const clearSelection = () => setSelectedTeeth([]);

  const handleAddItem = () => {
    if (selectedTeeth.length === 0) {
       toast.error("Selecciona al menos una pieza dental.");
       return;
    }
    if (!material || !producto) {
       toast.error("Selecciona el material y producto.");
       return;
    }
    setItems([...items, { id: Date.now(), dientes: selectedTeeth.sort(), material, producto, unidades: selectedTeeth.length }]);
    setSelectedTeeth([]);
    setMaterial('');
    setProducto('');
  };

  const handleRemoveItem = (id) => setItems(items.filter(i => i.id !== id));

  async function handleSubmit(e) {
    e.preventDefault();
    
    let finalItems = [...items];
    
    // Auto-agregar si olvidó pulsar "Añadir Piezas"
    if (material && producto) {
       const hasTeeth = selectedTeeth.length > 0;
       finalItems.push({
         id: Date.now(),
         dientes: hasTeeth ? selectedTeeth.sort() : [],
         material,
         producto,
         unidades: hasTeeth ? selectedTeeth.length : 1
       });
    }

    if (finalItems.length === 0) {
       const proceed = window.confirm("¿Guardar orden SIN piezas ni materiales anotados?");
       if (!proceed) return;
    }

    setIsSubmitting(true);
    const formData = new FormData(e.target);
    formData.append('items', JSON.stringify(finalItems));

    const loadingToast = toast.loading(`Registrando caso complejo...`);
    
    try {
      const result = await createNewCase(formData);
      if (result.success) {
        toast.success(`Registrado con éxito. Pasa a: ${result.deptoAsignado}.`, { id: loadingToast });
        setItems([]); setSelectedTeeth([]); setMaterial(''); setProducto(''); setSelectedClient(null);
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 p-0 sm:p-4 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white shrink-0 shadow-sm z-10">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">Constructor de Casos</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Scrollable Form */}
        <form id="new-case-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-8 bg-slate-50/50">
            
            {/* Seccion 1: Cabecera Info Basica */}
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente / Doctor</label>
                <ClientSelect clients={clients} selected={selectedClient} onChange={setSelectedClient} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paciente</label>
                <input type="text" name="paciente" required placeholder="Nombre completo" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-sm font-medium shadow-sm"/>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">No. Orden</label>
                 <input type="text" name="codigo" required placeholder="Ej. A-1234" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-sm font-medium shadow-sm"/>
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Color</label>
                 <input type="text" name="color" placeholder="Ej. A2" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-sm font-medium shadow-sm"/>
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">F. Entrega</label>
                 <input type="date" name="fecha_entrega" required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-sm font-medium shadow-sm"/>
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">H. Entrega</label>
                  <select
                    name="hora_entrega"
                    defaultValue="14:00"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-sm font-medium shadow-sm"
                  >
                    {Array.from({ length: 27 }, (_, i) => {
                      const totalMin = 7 * 60 + i * 30;
                      const h24 = Math.floor(totalMin / 60);
                      const m = totalMin % 60;
                      const value = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                      const h12 = h24 % 12 || 12;
                      const ampm = h24 < 12 ? 'AM' : 'PM';
                      const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
                      return <option key={value} value={value}>{label}</option>;
                    })}
                  </select>
               </div>
            </div>

            <div className="space-y-2 mt-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Protocolo de Entrada</label>
               <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl bg-white hover:border-[#D4AF37] cursor-pointer transition-colors shadow-sm">
                    <input 
                      type="radio" 
                      name="tipo" 
                      value="Análogo" 
                      required 
                      className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
                      checked={tipo === 'Análogo'}
                      onChange={(e) => {
                        setTipo(e.target.value);
                        setMaterial('');
                        setProducto('');
                      }}
                    />
                    <div className="flex flex-col">
                       <span className="text-sm font-bold text-slate-800 leading-tight">Físico (Análogo)</span>
                       <span className="text-xs text-slate-500">Impresión &gt; Yesos</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl bg-white hover:border-blue-500 cursor-pointer transition-colors shadow-sm">
                    <input 
                      type="radio" 
                      name="tipo" 
                      value="Digital" 
                      required 
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      checked={tipo === 'Digital'}
                      onChange={(e) => {
                        setTipo(e.target.value);
                        setMaterial('');
                        setProducto('');
                      }}
                    />
                    <div className="flex flex-col">
                       <span className="text-sm font-bold text-slate-800 leading-tight">Digital</span>
                       <span className="text-xs text-slate-500">STL &gt; Diseño</span>
                    </div>
                  </label>
               </div>
              </div>
            </div>

          <hr className="border-slate-200" />

          {/* Seccion 2: Odontograma y Detalle */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Odontograma Interactivo</h3>
              {selectedTeeth.length > 0 && (
                <button type="button" onClick={clearSelection} className="text-xs font-bold text-slate-400 hover:text-red-500">Limpiar piezas</button>
              )}
            </div>

            {/* Grilla FDI */}
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
              <div className="min-w-[600px] flex flex-col gap-2 items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-inner">
                {/* Superior */}
                <div className="flex gap-1 justify-center w-full">
                  {upperTeeth.map((tooth, idx) => {
                    const isSelected = selectedTeeth.includes(tooth);
                    const isAdded = addedTeeth.includes(tooth);
                    return (
                      <button type="button" key={tooth} onClick={() => toggleTooth(tooth)}
                        className={`
                          w-9 h-11 flex items-center justify-center font-bold text-[13px] rounded-lg border-2 transition-all
                          ${idx === 7 ? 'mr-4' : ''} 
                          ${isSelected 
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#B8860B] shadow-sm transform scale-105' 
                            : isAdded
                              ? 'bg-[#D4AF37]/10 border-transparent text-[#B8860B]/70'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}
                        `}
                      >
                        {tooth}
                      </button>
                    );
                  })}
                </div>
                {/* Divisor Visual Archos */}
                <div className="w-full h-px bg-slate-100 my-1"></div>
                {/* Inferior */}
                <div className="flex gap-1 justify-center w-full">
                  {lowerTeeth.map((tooth, idx) => {
                    const isSelected = selectedTeeth.includes(tooth);
                    const isAdded = addedTeeth.includes(tooth);
                    return (
                      <button type="button" key={tooth} onClick={() => toggleTooth(tooth)}
                        className={`
                          w-9 h-11 flex items-center justify-center font-bold text-[13px] rounded-lg border-2 transition-all
                          ${idx === 7 ? 'mr-4' : ''} 
                          ${isSelected 
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#B8860B] shadow-sm transform scale-105' 
                            : isAdded
                              ? 'bg-[#D4AF37]/10 border-transparent text-[#B8860B]/70'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}
                        `}
                      >
                        {tooth}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selector de Materiales y Agregar */}
            <div className="bg-slate-100/50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-end">
               <div className="flex-1 w-full space-y-1.5">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Material</label>
                 <select value={material} onChange={(e) => handleMaterialChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] outline-none text-sm font-medium">
                    <option value="">Seleccionar...</option>
                    {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                 </select>
               </div>
               <div className="flex-1 w-full space-y-1.5">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Producto (Restauración)</label>
                 <select value={producto} onChange={(e) => setProducto(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] outline-none text-sm font-medium" disabled={!material}>
                    <option value="">{material ? 'Seleccionar...' : 'Elige material primero'}</option>
                    {currentProducts.map(p => <option key={p.raw} value={p.display}>{p.display}</option>)}
                 </select>
               </div>
               <button 
                 type="button" 
                 onClick={handleAddItem}
                 className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#B8860B] text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
               >
                 <Plus size={16} /> Añadir Piezas
               </button>
            </div>

            {/* Listado de Items en "Pills" */}
            {items.length > 0 && (
              <div className="space-y-3">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Especificaciones Añadidas ({items.length})</h4>
                 <ul className="flex flex-col gap-2">
                   {items.map(item => (
                     <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm gap-3">
                        <div className="flex flex-col min-w-0">
                           <span className="text-sm font-black text-slate-800 capitalize leading-tight">{item.producto} de {item.material}</span>
                           <span className="text-xs text-slate-500 font-medium truncate mt-0.5">Dientes: <span className="font-bold text-slate-700">{item.dientes.join(', ')}</span> ({item.unidades} un.)</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg shrink-0 self-end sm:self-center transition-colors">
                           <X size={16} />
                        </button>
                     </li>
                   ))}
                 </ul>
              </div>
            )}

            {/* Comentarios del Caso */}
            <div className="space-y-1.5 mt-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instrucciones Adicionales (Comentarios)</label>
              <textarea 
                name="comentarios" 
                rows="2" 
                placeholder="Ej. El doctor prefiere un color más cálido en incisal..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] outline-none text-sm font-medium shadow-sm resize-none transition-all placeholder:text-slate-400"
              ></textarea>
            </div>

          </div>
          </div>
        </form>

        {/* Footer Fixed */}
        <div className="px-6 py-5 border-t border-slate-100 bg-white shrink-0 mt-auto">
          <button 
            form="new-case-form" 
            disabled={isSubmitting} 
            type="submit" 
            className={`w-full py-4 rounded-2xl font-bold text-[15px] text-white bg-slate-900 hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg ${isSubmitting ? 'opacity-70 pointer-events-none' : ''}`}
          >
             {isSubmitting ? <RefreshCw className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>}
             Confirmar y Enviar a Laboratorio
          </button>
        </div>

      </div>
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
        
        const usageStr = localStorage.getItem("lab_os_user_freq");
        const usage = usageStr ? JSON.parse(usageStr) : {};

        const sortedUsers = [...allUsers].sort((a, b) => {
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
      } finally {
        setLoadingUsers(false);
      }
    }
    load();
  }, []);

  // Handle PIN input
  const handlePinChange = async (e) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    if (val.length <= 4) {
       setPin(val);
       if (val.length === 4) {
          setLoading(true);
          const res = await loginUser(selectedUser.username, val);
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
                onLoginSuccess(res.user);
             }, 1500);
          } else {
             toast.error(res.error);
             setPin("");
             setLoading(false);
             if (pinInputRef.current) pinInputRef.current.focus();
          }
       }
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
                        
                        <div className={`mt-5 w-32 text-center transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                           <p className="text-sm font-bold text-slate-800 truncate">{user.username}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{user.rol?.split(',')[0] || 'Personal'}</p>
                        </div>
                     </div>
                  );
               })}
            </div>

            {/* PIN Input Area */}
            <div className={`transition-all duration-500 transform ${selectedUser && !loading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
               <div className="flex flex-col items-center relative">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Ingresa tu PIN</p>
                  
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
                  
                  {loading && (
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
  const [activeDept, setActiveDept] = useState("Producción");
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [clients, setClients] = useState([]);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  
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

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cases');
      const data = await res.json();
      if (!data.error) {
        setCases(data);
      }
    } catch (err) { } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    fetchCases();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'casos_master' }, () => {
        fetchCases();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const dateTimeSort = (a, b) => {
     const timeA = a.hora_entrega ? a.hora_entrega : '23:59';
     const timeB = b.hora_entrega ? b.hora_entrega : '23:59';
     const dateA = new Date(`${a.fecha_entrega}T${timeA}`);
     const dateB = new Date(`${b.fecha_entrega}T${timeB}`);
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

  const SLA_CONFIG = {
    Yesos:           { baseMin: 160,  perUnit: 0,  byDays: false },
    Digital_Escaneo: { baseMin: 20,   perUnit: 10, byDays: false },
    Digital_Diseno:  { baseMin: 15,   perUnit: 15, byDays: false },
    Digital_Fresado: { baseMin: 0,    perUnit: 40, byDays: false },
    Ajuste:          { baseMin: 20,   perUnit: 10, byDays: false },
    Sinterizado:     { baseMin: 480,  perUnit: 0,  byDays: false },
    Ceramica:        { baseMin: 480,  perUnit: 0,  byDays: true  },
  };

  const getSlaColor = (horaInicio, depto, total_unidades = 1) => {
    if (!horaInicio) return null;
    const cfg = SLA_CONFIG[depto];
    if (!cfg) return null;
    const startObj = new Date(horaInicio);
    if (isNaN(startObj)) return null;
    const diffMins = (new Date() - startObj) / 60000;
    const slaMins = cfg.baseMin + (cfg.perUnit * Math.max(1, total_unidades));
    const pct = diffMins / slaMins;
    if (pct < 0.8) return 'green';
    if (pct < 1.0) return 'yellow';
    return 'red';
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><RefreshCw className="animate-spin text-slate-300 w-8 h-8" /></div>;
  }
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => { setCurrentUser(u); loadInitialData(); fetchCases(); }} />;
  }

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setAuthChecked(false);
    window.location.reload();
  };

  // Filtrado de roles para los grupos visuales
  const userRolesStr = currentUser.rol || "";
  const rawRoles = userRolesStr.split(',').map(r => r.trim());
  const isAdmin = rawRoles.some(r => !!r.match(/admin/i));

  let groupsToRender = [];
  if (activeDept === "all") {
    // Si estamos en TODAS (Monitor Global), renderizar TODOS los departamentos operativos
    groupsToRender = departments;
  } else {
    // Si estamos en Departamentos Operativos, renderizar solo las áreas asignadas al usuario
    if (isAdmin) {
      groupsToRender = departments;
    } else {
      groupsToRender = departments.filter(d => rawRoles.includes(d.id) || d.id === "Sinterizado");
    }
  }

  // Pre-abrir todos los acordeones en la carga inicial (hacemos un set 1 vez)
  // Como Set no funciona fácil, lo inicializamos solo la primera vez en useEffect si fuera util,
  // pero podemos basarnos predeterminadamente en que false/undefined = "Abierto", true = "Cerrado"
  // para simplificar el estado.
  const isDeptHidden = (deptId) => !!expandedDepts[deptId];

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

  const handleGenerateReceipt = async () => {
      setReceiptSaving(true);
      const payload = {
         ...calculateReceipt(),
         discountType,
         discountValue: parseFloat(discountValue) || 0,
         applyIva
      };
      
      const res = await generateReceipt(receiptCase.internal_id, payload);
      setReceiptSaving(false);
      
      if (res.success) {
         toast.success("Recibo generado y caso avanzado a Empaquetado.");
         closeReceiptModal();
         fetchCases();
      } else {
         toast.error(res.error || "Error al generar recibo.");
      }
  };

  return (
    <div className="min-h-screen bg-white sm:bg-slate-50 lg:bg-slate-100 flex flex-col font-sans transition-colors duration-300">
      <Toaster position="bottom-center" />
      <NewCaseModal isOpen={isNewCaseModalOpen} onClose={() => setIsNewCaseModalOpen(false)} clients={clients} onActionComplete={fetchCases}/>

      {/* MODAL DE RECIBO / BORRADOR */}
      {receiptCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm transition-opacity" onClick={closeReceiptModal}></div>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
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

      <main className="
        flex-1 w-full bg-white flex flex-col overflow-hidden
        transition-all duration-300 relative
        sm:max-w-[520px] sm:mx-auto sm:my-3 sm:rounded-2xl sm:shadow-lg sm:ring-1 sm:ring-slate-200/60 sm:min-h-[calc(100vh-1.5rem)]
        lg:max-w-[680px] lg:my-6 lg:shadow-2xl lg:ring-slate-200/80 lg:min-h-[calc(100vh-3rem)]
      ">
        
        {/* Header — logo centrado, spinner a la derecha */}
        <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-center relative shrink-0 h-14 bg-white z-20">
          <h1
            className="font-bold text-xl tracking-tight text-slate-900 cursor-pointer select-none"
            onClick={() => setActiveDept("Producción")}
            title="Volver a Inicio"
          >
            Lab OS
          </h1>
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <RefreshCw size={14} className="animate-spin text-slate-300" />
            </div>
          )}
        </header>

        {/* Big Select Navigation */}
        <div className="px-4 py-3 border-b border-slate-100 bg-white shrink-0 z-20">
           <div className="relative">
             <select 
                value={activeDept}
                onChange={(e) => setActiveDept(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-center font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none shadow-sm text-[15px]"
             >
                <option value="Producción">Producción</option>
                <option value="all">TODAS (Monitor Global)</option>
             </select>
             <div className="absolute right-4 top-4 text-slate-400 pointer-events-none">
                <ChevronDown size={20} />
             </div>
           </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto w-full pb-24 relative z-10 bg-[#f8fafc]">
           {loading && cases.length === 0 ? (
               <div className="p-10 text-center text-slate-400 font-medium text-sm">Cargando datos...</div>
           ) : (
               <div className="flex flex-col">
                 {groupsToRender.map(grupo => {
                   // Obtener los casos para este grupo
                   const casosEnGrupo = cases
                     .filter(c => c.dept === grupo.id)
                     .sort(dateTimeSort);
                   
                   const collapsed = isDeptHidden(grupo.id);

                   return (
                     <div key={grupo.id} className="mb-2">
                       <div 
                         onClick={() => toggleDept(grupo.id)}
                         className="flex items-center justify-center py-4 px-2 cursor-pointer select-none group border-b-2 border-slate-100 hover:border-[#D4AF37] transition-colors mb-4 mt-6 relative"
                       >
                         <span className="text-[15px] font-black text-slate-900 uppercase tracking-widest">{grupo.name.replace("Digital_", "")}</span>
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
                           {casosEnGrupo.length === 0 ? (
                             <div className="py-6 text-center text-slate-400 font-medium text-sm">
                               No hay casos en {grupo.name.replace("Digital_", "")}
                             </div>
                           ) : (
                             <ul className="flex flex-col">
                               {casosEnGrupo.map((c) => {
                                  const devProps = getDeliveryDateProps(c.fecha_entrega, c.hora_entrega);
                                  const slaColor = c.status === 'En Proceso' ? getSlaColor(c.hora_inicio, c.dept, c.total_unidades) : null;
                                  const borderClass = c.urgent
                                    ? 'border-l-4 border-red-500 pl-3'
                                    : slaColor === 'red'    ? 'border-l-4 border-red-400 pl-3'
                                    : slaColor === 'yellow' ? 'border-l-4 border-yellow-400 pl-3'
                                    : slaColor === 'green'  ? 'border-l-4 border-green-400 pl-3'
                                    : 'border-l-4 border-transparent pl-3';
                                  
                                  const cExpanded = !!expandedCases[c.internal_id];
                                  const isReadOnly = activeDept === "all";

                                  return (
                                      <li key={c.internal_id} className={`flex flex-col border border-slate-100 transition-colors bg-white rounded-2xl shadow-sm mb-3 hover:shadow-md ${borderClass.replace('border-l-4', 'border-l-4')}`}>
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

                                                  // 3. Translucidez (HT, LT, etc.)
                                                  let extraText = "";
                                                  const parenMatch = item.producto.match(/\(([^)]+)\)/);
                                                  if (parenMatch) {
                                                     const val = parenMatch[1].toUpperCase();
                                                     if (["HT", "LT", "MT", "MO", "HO"].includes(val)) {
                                                         extraText += ` (${val})`;
                                                     }
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
                                                    <div key={idx} className="flex items-baseline gap-1.5 truncate mt-0.5">
                                                      <span className={`text-[16px] font-black tracking-tight ${group.matColor}`}>
                                                        {group.matText}
                                                      </span>
                                                      {group.extraText && (
                                                        <span className="text-[14px] font-medium text-slate-700 tracking-tight">
                                                          {group.extraText}
                                                        </span>
                                                      )}
                                                      {c.color && (
                                                        <span className="text-[12px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-md tracking-tight ml-0.5 shadow-sm border border-amber-200/50">
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
                                                  👤 {c.operador_actual.split(' ')[0]}
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

      </main>

      {/* Avatar de usuario — fijo al pie de pantalla, centrado */}
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
