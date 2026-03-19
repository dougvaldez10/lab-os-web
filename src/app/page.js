"use client";

import { useEffect, useState, useRef } from "react";
import { 
  MoreVertical, Play, CheckCircle2, PauseCircle, Plus, RefreshCw, X, ChevronDown
} from "lucide-react";
import { updateCaseState } from "./actions/cases";
import { createNewCase } from "./actions/create-case";
import { getClients } from "./actions/clients";
import { getProducts } from "./actions/products";
import { getCurrentUser, loginUser, logoutUser } from "@/lib/auth";
import { Toaster, toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const departments = [
  { id: "Recepción", name: "Recepción" },
  { id: "Yesos", name: "Yesos" },
  { id: "Digital_Escaneo", name: "Escaneo" },
  { id: "Digital_Diseno", name: "Diseño" },
  { id: "Digital_Fresado", name: "Fresado" },
  { id: "Zirconia (CAM)", name: "Zirconia (CAM)" },
  { id: "Impresión 3D", name: "Impresión 3D" },
  { id: "Cerámica", name: "Cerámica" },
  { id: "Ajuste", name: "Ajuste" },
  { id: "Terminado", name: "Terminado" },
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

function OperativeActionMenu({ currentCase, onRefresh, operatorName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fileProgress, setFileProgress] = useState(null); // 0-100
  const [fileDirection, setFileDirection] = useState(null); // 'upload' | 'download'
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  const dept = currentCase.dept;
  const showUploadEscaneo = dept === 'Digital_Escaneo';
  const showDownloadEscaneo = dept === 'Digital_Diseno';
  const showUploadDiseno = dept === 'Digital_Diseno';
  const showDownloadDiseno = dept === 'Digital_Fresado';

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

  // Upload via fetch con progreso (XMLHttpRequest)
  const handleUpload = async (sourceDept) => {
    setIsOpen(false);
    fileInputRef.current.dataset.sourceDept = sourceDept;
    fileInputRef.current.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const sourceDept = e.target.dataset.sourceDept;
    const caseId = currentCase.internal_id;

    // Upload con XMLHttpRequest para progreso real
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

  // Download con progreso
  const handleDownload = async (fromDept) => {
    setIsOpen(false);
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
      // Descargar cada archivo con progreso
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
    <div className="relative" ref={menuRef}>
      {/* Barra de progreso pegada al borde derecho */}
      <FileProgressBar progress={fileProgress} direction={fileDirection} />

      {/* Input oculto para selección de archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.ply,.obj,.3ds"
        className="hidden"
        onChange={onFileSelected}
      />

      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="w-11 h-11 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors active:bg-slate-200"
      >
        {isUpdating ? <RefreshCw size={18} className="animate-spin" /> : <MoreVertical size={20} />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
          {/* Acciones de proceso */}
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

          {/* Acciones de archivos — según departamento */}
          {(showUploadEscaneo || showUploadDiseno || showDownloadEscaneo || showDownloadDiseno) && (
            <div className="border-t border-slate-100 mt-1 pt-1">
              {showDownloadEscaneo && (
                <button
                  onClick={() => handleDownload('Digital_Escaneo')}
                  className="w-full text-left px-4 py-3 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-medium"
                >
                  <span className="text-base">⬇</span> Descargar de Escaneo
                </button>
              )}
              {showDownloadDiseno && (
                <button
                  onClick={() => handleDownload('Digital_Diseno')}
                  className="w-full text-left px-4 py-3 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-medium"
                >
                  <span className="text-base">⬇</span> Descargar de Diseño
                </button>
              )}
              {showUploadEscaneo && (
                <button
                  onClick={() => handleUpload('Digital_Escaneo')}
                  className="w-full text-left px-4 py-3 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-medium"
                >
                  <span className="text-base">⬆</span> Cargar Archivos
                </button>
              )}
              {showUploadDiseno && (
                <button
                  onClick={() => handleUpload('Digital_Diseno')}
                  className="w-full text-left px-4 py-3 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-medium"
                >
                  <span className="text-base">⬆</span> Cargar Diseño
                </button>
              )}
            </div>
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
  };

  const handleRemoveItem = (id) => setItems(items.filter(i => i.id !== id));

  async function handleSubmit(e) {
    e.preventDefault();
    if (items.length === 0) {
       const proceed = window.confirm("¿Guardar orden SIN piezas ni materiales anotados?");
       if (!proceed) return;
    }

    setIsSubmitting(true);
    const formData = new FormData(e.target);
    formData.append('items', JSON.stringify(items));

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
      <div className="w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white shrink-0 shadow-sm z-10">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">Constructor de Casos</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Scrollable Form */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-8 bg-slate-50/50">
          
          {/* Seccion 1: Cabecera Info Basica */}
          <form id="new-case-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
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
          </form>

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
                  {upperTeeth.map((tooth, idx) => (
                    <button type="button" key={tooth} onClick={() => toggleTooth(tooth)}
                      className={`
                        w-9 h-11 flex items-center justify-center font-bold text-[13px] rounded-lg border-2 transition-all
                        ${idx === 7 ? 'mr-4' : ''} 
                        ${selectedTeeth.includes(tooth) 
                          ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#B8860B] shadow-sm transform scale-105' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}
                      `}
                    >
                      {tooth}
                    </button>
                  ))}
                </div>
                {/* Divisor Visual Archos */}
                <div className="w-full h-px bg-slate-100 my-1"></div>
                {/* Inferior */}
                <div className="flex gap-1 justify-center w-full">
                  {lowerTeeth.map((tooth, idx) => (
                    <button type="button" key={tooth} onClick={() => toggleTooth(tooth)}
                      className={`
                        w-9 h-11 flex items-center justify-center font-bold text-[13px] rounded-lg border-2 transition-all
                        ${idx === 7 ? 'mr-4' : ''} 
                        ${selectedTeeth.includes(tooth) 
                          ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#B8860B] shadow-sm transform scale-105' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}
                      `}
                    >
                      {tooth}
                    </button>
                  ))}
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
          </div>
          
        </div>

        {/* Footer Fixed */}
        <div className="px-5 py-4 border-t border-slate-100 bg-white shrink-0 mt-auto">
          <button 
            form="new-case-form" 
            disabled={isSubmitting} 
            type="submit" 
            className={`w-full py-4 rounded-xl font-bold text-[15px] text-white bg-slate-900 hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg ${isSubmitting ? 'opacity-70 pointer-events-none' : ''}`}
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await loginUser(username, password);
    if (res.success) {
      toast.success("¡Bienvenido, " + res.user.nombre_completo + "!");
      onLoginSuccess(res.user);
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Toaster position="bottom-center" />
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Lab OS</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Acceso a la Nube Restringido</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Usuario</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="ej: vanessa" autoFocus className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] outline-none text-sm font-semibold transition-all"/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" onKeyDown={e => { if (e.key === 'Enter') handleSubmit(e); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] outline-none text-sm font-semibold transition-all"/>
          </div>
          <button disabled={loading} type="submit" className="w-full py-3.5 mt-2 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-black transition-colors flex items-center justify-center">
            {loading ? <RefreshCw className="animate-spin w-5 h-5"/> : "Iniciar Sesión"}
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
  const [authChecked, setAuthChecked] = useState(false);
  const [clients, setClients] = useState([]);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

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

  const dateTimeSort = (a, b) => {
     // a.fecha_entrega formato YYYY-MM-DD, a.hora_entrega formato HH:mm (24h)
     const timeA = a.hora_entrega ? a.hora_entrega : '23:59';
     const timeB = b.hora_entrega ? b.hora_entrega : '23:59';
     
     const dateA = new Date(`${a.fecha_entrega}T${timeA}`);
     const dateB = new Date(`${b.fecha_entrega}T${timeB}`);
     
     return dateA - dateB;
  };

  const filteredCases = activeDept === "all" 
     ? [...cases].sort(dateTimeSort) 
     : cases.filter(c => c.dept === activeDept).sort(dateTimeSort);
  
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

  // Filtrado Inteligente de Departamentos
  const userRoles = currentUser?.rol?.split(',').map(r => r.trim().toLowerCase()) || [];
  const isAdmin = userRoles.includes('admin') || userRoles.includes('administrador') || userRoles.includes('administración');
  const allowedDepartments = departments.filter(d => 
     isAdmin || userRoles.includes(d.name.toLowerCase()) || userRoles.includes(d.id.toLowerCase())
  );

  // ============================================================
  //  Helper: SLA Semáforo — tiempos acordados por Douglas
  // ============================================================
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
    const units = Math.max(1, total_unidades);
    const slaMins = cfg.baseMin + (cfg.perUnit * units);

    const pct = cfg.byDays
      ? diffMins / slaMins  // slaMins = 480 = 1 día laboral
      : diffMins / slaMins;

    if (pct < 0.8) return 'green';
    if (pct < 1.0) return 'yellow';
    return 'red';
  };

  const currentOperatorName = currentUser ? (currentUser.nombre_completo || currentUser.username) : null;

  return (
    <div className="min-h-screen bg-white sm:bg-slate-50 lg:bg-slate-100 flex flex-col font-sans transition-colors duration-300">
      <Toaster position="bottom-center" />
      <NewCaseModal isOpen={isNewCaseModalOpen} onClose={() => setIsNewCaseModalOpen(false)} clients={clients} onActionComplete={fetchCases}/>

      {/* 3 etapas responsivas: mobile full-width | sm tarjeta pequeña | lg tarjeta ancha */}
      <main className="
        flex-1 w-full bg-white flex flex-col overflow-hidden
        transition-all duration-300
        sm:max-w-[520px] sm:mx-auto sm:my-3 sm:rounded-2xl sm:shadow-lg sm:ring-1 sm:ring-slate-200/60 sm:min-h-[calc(100vh-1.5rem)]
        lg:max-w-[680px] lg:my-6 lg:shadow-2xl lg:ring-slate-200/80 lg:min-h-[calc(100vh-3rem)]
      ">
        
        {/* Header — logo centrado, spinner a la derecha */}
        <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-center relative shrink-0 h-14 bg-white">
          {/* Logo clickeable — navega a TODAS */}
          <h1
            className="font-bold text-xl tracking-tight text-slate-900 cursor-pointer select-none"
            onClick={() => setActiveDept('all')}
            title="Ver todos los casos"
          >
            Lab OS
          </h1>
          {/* Spinner de recarga — esquina derecha */}
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <RefreshCw size={14} className="animate-spin text-slate-300" />
            </div>
          )}
        </header>

        {/* Big Select Navigation */}
        <div className="px-4 py-3 border-b border-slate-100 bg-white shrink-0">
           <div className="relative">
             <select 
                value={activeDept}
                onChange={(e) => setActiveDept(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-center font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none shadow-sm text-[15px]"
             >
                <option value="all">TODAS (Monitor Global)</option>
                <optgroup label="Departamentos Operativos">
                  {allowedDepartments.map((d) => (
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
        <div className="flex-1 overflow-y-auto w-full pb-24">
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
                    const slaColor = c.status === 'En Proceso' ? getSlaColor(c.hora_inicio, c.dept, c.total_unidades) : null;
                    // Borde izquierdo: urgente tiene prioridad, luego semáforo SLA
                    const borderClass = c.urgent
                      ? 'border-l-4 border-red-500 pl-3'
                      : slaColor === 'red'    ? 'border-l-4 border-red-400 pl-3'
                      : slaColor === 'yellow' ? 'border-l-4 border-yellow-400 pl-3'
                      : slaColor === 'green'  ? 'border-l-4 border-green-400 pl-3'
                      : 'border-l-4 border-transparent pl-3';
                    
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
                               <div className="flex flex-col items-end gap-1.5 min-w-[80px]">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                     {departments.find(d=>d.id===c.dept)?.name || c.dept || 'N/A'}
                                  </span>
                                  <StatusBadge status={c.status} />
                                  {c.status === 'En Proceso' && c.operador_actual && (
                                     <span className="text-[10px] text-slate-600 font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                                        👤 {c.operador_actual.split(' ')[0]}
                                     </span>
                                   )}
                               </div>
                               
                               {activeDept !== "all" && (
                                 <OperativeActionMenu currentCase={c} onRefresh={fetchCases} operatorName={currentOperatorName} />
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
