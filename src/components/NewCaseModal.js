"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus, Check, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { getProducts } from "@/app/actions/products";
import { createNewCase } from "@/app/actions/create-case";

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

export default function NewCaseModal({ isOpen, onClose, clients, onActionComplete }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [items, setItems] = useState([]);
  const [material, setMaterial] = useState('');
  const [producto, setProducto] = useState('');
  const [subtipo, setSubtipo] = useState('');
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

  const handleMaterialChange = (val) => { setMaterial(val); setProducto(''); setSubtipo(''); };

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
    
    // El producto final contiene el subtipo en el nombre para conservar compatibilidad financiera.
    const finalProducto = subtipo ? `${producto} - ${subtipo}` : producto;
    
    setItems([...items, { id: Date.now(), dientes: selectedTeeth.sort(), material, producto: finalProducto, unidades: selectedTeeth.length }]);
    setSelectedTeeth([]);
    setMaterial('');
    setProducto('');
    setSubtipo('');
  };

  const handleRemoveItem = (id) => setItems(items.filter(i => i.id !== id));

  async function handleSubmit(e) {
    e.preventDefault();
    
    let finalItems = [...items];
    
    // Auto-agregar si olvidó pulsar "Añadir Piezas"
    if (material && producto) {
       const hasTeeth = selectedTeeth.length > 0;
       const finalProducto = subtipo ? `${producto} - ${subtipo}` : producto;
       finalItems.push({
         id: Date.now(),
         dientes: hasTeeth ? selectedTeeth.sort() : [],
         material,
         producto: finalProducto,
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
        setItems([]); setSelectedTeeth([]); setMaterial(''); setProducto(''); setSubtipo(''); setSelectedClient(null);
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
                        setSubtipo('');
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
                        setSubtipo('');
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
               <div className="flex-1 w-full space-y-1.5 min-w-[150px]">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Material</label>
                 <select value={material} onChange={(e) => handleMaterialChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] outline-none text-sm font-medium">
                    <option value="">Seleccionar...</option>
                    {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                 </select>
               </div>
               <div className="flex-1 w-full space-y-1.5 min-w-[150px]">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Restauración</label>
                 <select value={producto} onChange={(e) => setProducto(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] outline-none text-sm font-medium" disabled={!material}>
                    <option value="">{material ? 'Seleccionar...' : 'Elige material primero'}</option>
                    {currentProducts.map(p => <option key={p.raw} value={p.raw}>{p.display}</option>)}
                 </select>
               </div>
               <div className="flex-1 w-full space-y-1.5 min-w-[100px]">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                 <select value={subtipo} onChange={(e) => setSubtipo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] outline-none text-sm font-medium" disabled={!material}>
                    <option value="">N/A</option>
                    {(material.toLowerCase().includes('emax') || material.toLowerCase().includes('litio')) && (
                      <optgroup label="Emax / Disilicato">
                        <option value="HT">HT</option>
                        <option value="LT">LT</option>
                        <option value="MT">MT</option>
                        <option value="MO">MO</option>
                      </optgroup>
                    )}
                    {(material.toLowerCase().includes('zr') || material.toLowerCase().includes('zirconia') || material.toLowerCase().includes('pmma')) && (
                      <optgroup label="Zirconia / PMMA">
                        <option value="ML">ML</option>
                        <option value="Mono">Mono</option>
                      </optgroup>
                    )}
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
             {isSubmitting ? <RefreshCw className="animate-spin" size={18}/> : <Check size={18}/>}
             Confirmar y Enviar a Laboratorio
          </button>
        </div>

      </div>
    </div>
  );
}
