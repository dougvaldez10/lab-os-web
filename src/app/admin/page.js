"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, Search, RefreshCw, AlertCircle, X, Save, Plus } from "lucide-react";
import { toast, Toaster } from "sonner";
import { updateAdminCase, deleteAdminCase } from "@/app/actions/admin-cases";
import { getClients, getAllClinics } from "@/app/actions/clients";
import { getProducts } from "@/app/actions/products";
import { getCaseDetailsForEdit, updateCaseProductionDetails } from "@/app/actions/cases";
import NewCaseModal from "@/components/NewCaseModal";

export default function AdminBoard() {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCase, setEditingCase] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [productosCat, setProductosCat] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  
  // Odontogram state for editing
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [material, setMaterial] = useState('Zirconia');
  const [producto, setProducto] = useState('Corona Zirconia');
  const [subtipo, setSubtipo] = useState('');

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [casesRes, clientsData, clinicasData] = await Promise.all([
        fetch('/api/cases?t=' + new Date().getTime()),
        getClients(),
        getAllClinics()
      ]);
      const casesData = await casesRes.json();
      if (Array.isArray(casesData)) {
        setCases(casesData);
      }
      setClients(clientsData || []);
      setClinicas(clinicasData || []);
    } catch (err) {
      toast.error("Error al cargar datos iniciales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleDelete = async (id, codigo) => {
    if (!window.confirm(`┬┐Estís seguro de que deseas eliminar permanentemente el caso ${codigo}? Esta acción no se puede deshacer.`)) {
      return;
    }
    const toastId = toast.loading("Eliminando caso...");
    const res = await deleteAdminCase(id);
    if (res.success) {
      toast.success("Caso eliminado correctamente", { id: toastId });
      fetchInitialData();
    } else {
      toast.error(res.error || "Error al eliminar", { id: toastId });
    }
  };

  const handleEdit = async (c) => {
    setEditingCase({ ...c }); // Copia para editar
    setIsLoadingDetails(true);
    setDetalles([]);
    const [res, prods] = await Promise.all([
      getCaseDetailsForEdit(c.internal_id),
      getProducts()
    ]);
    if (res.success) {
      setDetalles(res.detalles ? res.detalles.map(d => {
        const parts = (d.producto || '').split(' - ');
        const prodBase = parts[0] || '';
        
        // Find material category
        let foundMaterial = 'Zirconia';
        for (const [cat, items] of Object.entries(prods || {})) {
          if (items.some(p => p.raw === prodBase)) {
            foundMaterial = cat;
            break;
          }
        }
        
        return {
          ...d,
          material: foundMaterial,
          producto_base: prodBase,
          subtipo: parts[1] || '',
          dientes: d.dientes ? d.dientes.split(',').map(s => Number(s.trim())).filter(n => n) : []
        };
      }) : []);
    } else {
      toast.error("Error al cargar detalles");
    }
    setProductosCat(prods || {});
    setIsLoadingDetails(false);
  };

  const handleRemoveRow = (id) => {
    setDetalles(detalles.filter(d => d.id !== id));
  };

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
    
    const finalProducto = subtipo ? `${producto} - ${subtipo}` : producto;
    let newPrice = 0;
    const catProds = productosCat[material] || [];
    const found = catProds.find(p => p.raw === producto);
    if (found) newPrice = found.precio;

    setDetalles([...detalles, { 
      id: `temp_${Date.now()}`, 
      dientes: selectedTeeth.sort(),
      material, 
      producto: finalProducto,
      unidades: selectedTeeth.length,
      precio_unit: newPrice
    }]);
    setSelectedTeeth([]);
    setMaterial('Zirconia');
    setProducto('Corona Zirconia');
    setSubtipo('');
  };

  const handleEditItem = (itemToEdit) => {
    let parsedTeeth = [];
    if (Array.isArray(itemToEdit.dientes)) {
      parsedTeeth = itemToEdit.dientes.map(n => Number(n));
    } else if (typeof itemToEdit.dientes === 'string' && itemToEdit.dientes) {
      parsedTeeth = itemToEdit.dientes.split(',').map(s => Number(s.trim())).filter(n => n);
    }
    setSelectedTeeth(parsedTeeth);
    setMaterial(itemToEdit.material || 'Zirconia');
    
    if (itemToEdit.producto) {
      const parts = itemToEdit.producto.split(' - ');
      setProducto(parts[0] || '');
      setSubtipo(parts[1] || '');
    }
    
    handleRemoveRow(itemToEdit.id);
  };

  const upperTeeth = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
  const lowerTeeth = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];
  const addedTeeth = detalles.flatMap(i => i.dientes || []);
  const categoriesList = Object.keys(productosCat);
  const currentProducts = productosCat[material] || [];

  const handleMaterialChange = (mat) => {
    setMaterial(mat);
    const catProds = productosCat[mat] || [];
    if (catProds.length > 0) setProducto(catProds[0].raw);
    else setProducto('');
    setSubtipo('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingCase) return;

    setIsSaving(true);
    const toastId = toast.loading("Guardando cambios...");
    
    // Preparar el payload con los campos editables del master
    const payload = {
      paciente: editingCase.patient,
      codigo: editingCase.id, // el codigo visual se mapeó como 'id' en el frontend
      cliente_id: editingCase.cliente_id,
      doctor: editingCase.doctor,
      color: editingCase.color,
      fecha_entrega: editingCase.fecha_entrega,
      hora_entrega: editingCase.hora_entrega,
      depto_actual: editingCase.dept,
      estado: editingCase.status,
      comentarios: editingCase.comentarios,
      tipo: editingCase.tipo
    };

    // Save Master
    const res = await updateAdminCase(editingCase.internal_id, payload);
    // Save Detalles (updates underlying financial prices)
    const resDet = await updateCaseProductionDetails(editingCase.internal_id, detalles);
    
    setIsSaving(false);

    if (res.success && resDet.success) {
      toast.success("Caso actualizado correctamente", { id: toastId });
      setEditingCase(null);
      fetchInitialData();
    } else {
      toast.error(res.error || resDet.error || "Error al guardar", { id: toastId });
    }
  };

  const filteredCases = cases.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.patient && c.patient.toLowerCase().includes(term)) ||
      (c.id && c.id.toLowerCase().includes(term)) ||
      (c.doctor && c.doctor.toLowerCase().includes(term)) ||
      (c.dept && c.dept.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      <Toaster position="bottom-right" />
      
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Casos en curso</h1>
          <p className="text-sm text-slate-500 mt-1">Vista administrativa. Puedes modificar cualquier detalle del caso.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsNewCaseModalOpen(true)}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md"
          >
            <Plus size={18} />
            Nuevo trabajo
          </button>
          <button onClick={fetchInitialData} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">
            <RefreshCw size={20} className={loading ? "animate-spin text-blue-500" : ""} />
          </button>
        </div>
      </div>

      <div className="mb-4 relative shrink-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por paciente, orden, doctor o depto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none shadow-sm"
        />
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Depto Actual</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">F. Entrega</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && cases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">Cargando casos...</td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">No se encontraron casos.</td>
                </tr>
              ) : (
                filteredCases.map(c => (
                  <tr key={c.internal_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">#{c.id}</td>
                    <td className="px-4 py-3 text-slate-700 font-bold truncate max-w-[200px]">{c.patient}</td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{c.doctor}</td>
                    <td className="px-4 py-3 text-slate-600">{c.dept}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.status === 'En Proceso' ? 'bg-blue-50 text-blue-700' :
                        c.status === 'En Pausa' ? 'bg-red-50 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.fecha_entrega} {c.hora_entrega}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(c)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(c.internal_id, c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      {editingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingCase(null)}></div>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                Editar Caso #{editingCase?.codigo || editingCase?.id}
              </h2>
              <div className="flex items-center gap-4">
                {editingCase?.status && (
                  <span className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${editingCase.status === 'Terminado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {editingCase.status}
                  </span>
                )}
                <button onClick={() => setEditingCase(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSaveEdit} className="overflow-y-auto p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Orden (Código)</label>
                  <input type="text" value={editingCase.id} onChange={e => setEditingCase({...editingCase, id: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Paciente</label>
                  <input type="text" value={editingCase.patient} onChange={e => setEditingCase({...editingCase, patient: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Clínica</label>
                  <select 
                    value={editingCase.cliente_id || ""} 
                    onChange={e => setEditingCase({...editingCase, cliente_id: e.target.value, doctor: ""})} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none"
                  >
                    <option value="" disabled>Seleccione clínica</option>
                    {clinicas.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Doctor (Dentista)</label>
                  <select 
                    value={editingCase.doctor || ""} 
                    onChange={e => setEditingCase({...editingCase, doctor: e.target.value})} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none"
                  >
                    <option value="" disabled>Seleccione doctor...</option>
                    {clients.filter(c => String(c.cliente_id) === String(editingCase.cliente_id)).map(doc => (
                      <option key={doc.id} value={doc.nombre_dentista}>{doc.nombre_dentista}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Color</label>
                  <input type="text" value={editingCase.color || ""} onChange={e => setEditingCase({...editingCase, color: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">F. Entrega</label>
                  <input type="date" value={editingCase.fecha_entrega || ""} onChange={e => setEditingCase({...editingCase, fecha_entrega: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">H. Entrega</label>
                  <input type="time" value={editingCase.hora_entrega || ""} onChange={e => setEditingCase({...editingCase, hora_entrega: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Departamento</label>
                  <select value={editingCase.dept} onChange={e => setEditingCase({...editingCase, dept: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none">
                    <option value="Recepción">Recepción</option>
                    <option value="Yesos">Yesos</option>
                    <option value="Digital_Escaneo">Digital_Escaneo</option>
                    <option value="Digital_Diseno">Digital_Diseno</option>
                    <option value="Digital_Fresado">Digital_Fresado</option>
                    <option value="Sinterizado">Sinterizado</option>
                    <option value="Ajuste">Ajuste</option>
                    <option value="Terminado">Terminado</option>
                    <option value="Inspección">Inspección</option>
                    <option value="Recibo/Factura">Recibo/Factura</option>
                    <option value="Empaquetado">Empaquetado</option>
                    <option value="Envío">Envío</option>
                    <option value="Facturación">Facturación</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
                  <select value={editingCase.status} onChange={e => setEditingCase({...editingCase, status: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none">
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="En Pausa">En Pausa</option>
                    <option value="Terminado">Terminado</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo Protocolo</label>
                    <select value={editingCase.tipo || "Análogo"} onChange={e => setEditingCase({...editingCase, tipo: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none">
                       <option value="Análogo">Análogo (Físico)</option>
                       <option value="Digital">Digital</option>
                    </select>
                 </div>
               <hr className="border-slate-200" />

              {/* Seccion 2: Odontograma y Detalle */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Odontograma Interactivo (Conceptos)</h3>
                  <div className="flex items-center gap-3">
                    {isLoadingDetails && <RefreshCw size={14} className="animate-spin text-slate-400" />}
                    {selectedTeeth.length > 0 && (
                      <button type="button" onClick={clearSelection} className="text-xs font-bold text-slate-400 hover:text-red-500">Limpiar piezas</button>
                    )}
                  </div>
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
                        <option value="" disabled hidden></option>
                        {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                     </select>
                   </div>
                   <div className="flex-1 w-full space-y-1.5 min-w-[150px]">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Restauración</label>
                     <select value={producto} onChange={(e) => setProducto(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] outline-none text-sm font-medium" disabled={!material}>
                        <option value="" disabled hidden></option>
                        {currentProducts.map(p => <option key={p.raw} value={p.raw}>{p.display}</option>)}
                     </select>
                   </div>
                   <div className="flex-1 w-full space-y-1.5 min-w-[100px]">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                     <select value={subtipo} onChange={(e) => setSubtipo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#D4AF37] outline-none text-sm font-medium" disabled={!material}>
                        <option value="">N/A</option>
                        {(material.toLowerCase().includes('emax') || material.toLowerCase().includes('litio')) && (
                          <>
                            <option value="HT">HT</option>
                            <option value="LT">LT</option>
                            <option value="MT">MT</option>
                            <option value="MO">MO</option>
                          </>
                        )}
                        {(material.toLowerCase().includes('zr') || material.toLowerCase().includes('zirconia') || material.toLowerCase().includes('pmma')) && (
                          <>
                            <option value="ML">ML</option>
                            <option value="Mono">Mono</option>
                          </>
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
                {detalles.length > 0 && (
                  <div className="space-y-3">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Especificaciones Añadidas ({detalles.length})</h4>
                     <ul className="flex flex-col gap-2">
                       {detalles.map(item => (
                         <li key={item.id}>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-sm relative group overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D4AF37]"></div>
                            <div className="pl-3">
                              <p className="font-black text-slate-800 text-sm tracking-tight">{item.producto}</p>
                              {item.dientes && item.dientes.length > 0 ? (
                                <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                  <span>Dientes: <span className="font-bold text-slate-700">{Array.isArray(item.dientes) ? item.dientes.join(', ') : item.dientes}</span></span>
                                  <span className="text-slate-400">({item.unidades} un.)</span>
                                </p>
                              ) : (
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Sin piezas específicas ({item.unidades} un.)</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditItem(item)}
                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar especificación"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(item.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar especificación"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        </li>
                       ))}
                     </ul>
                  </div>
                )}
              </div>
              </div>

              <div className="space-y-1 mt-2 border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-500 uppercase">Comentarios</label>
                <textarea rows="3" value={editingCase.comentarios || ""} onChange={e => setEditingCase({...editingCase, comentarios: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none resize-none"></textarea>
              </div>
              
              <div className="mt-4 flex gap-3 justify-end shrink-0">
                 <button type="button" onClick={() => setEditingCase(null)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">
                   Cancelar
                 </button>
                 <button type="submit" disabled={isSaving} className="px-5 py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md">
                   {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                   Guardar Cambios
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE NUEVO TRABAJO */}
      <NewCaseModal 
        isOpen={isNewCaseModalOpen} 
        onClose={() => setIsNewCaseModalOpen(false)} 
        clients={clients} 
        onActionComplete={fetchInitialData} 
      />
    </div>
  );
}

export const dynamic = 'force-dynamic';
