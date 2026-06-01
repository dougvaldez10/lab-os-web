"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, Search, RefreshCw, AlertCircle, X, Save } from "lucide-react";
import { toast, Toaster } from "sonner";
import { updateAdminCase, deleteAdminCase } from "@/app/actions/admin-cases";

export default function AdminBoard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCase, setEditingCase] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cases?t=' + new Date().getTime());
      const data = await res.json();
      if (Array.isArray(data)) {
        setCases(data);
      }
    } catch (err) {
      toast.error("Error al cargar casos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleDelete = async (id, codigo) => {
    if (!window.confirm(`┬┐Estís seguro de que deseas eliminar permanentemente el caso ${codigo}? Esta acción no se puede deshacer.`)) {
      return;
    }
    const toastId = toast.loading("Eliminando caso...");
    const res = await deleteAdminCase(id);
    if (res.success) {
      toast.success("Caso eliminado correctamente", { id: toastId });
      fetchCases();
    } else {
      toast.error(res.error || "Error al eliminar", { id: toastId });
    }
  };

  const handleEdit = (c) => {
    setEditingCase({ ...c }); // Copia para editar
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
      doctor: editingCase.doctor,
      color: editingCase.color,
      fecha_entrega: editingCase.fecha_entrega,
      hora_entrega: editingCase.hora_entrega,
      depto_actual: editingCase.dept,
      estado: editingCase.status,
      comentarios: editingCase.comentarios,
      tipo: editingCase.tipo
    };

    const res = await updateAdminCase(editingCase.internal_id, payload);
    setIsSaving(false);

    if (res.success) {
      toast.success("Caso actualizado correctamente", { id: toastId });
      setEditingCase(null);
      fetchCases();
    } else {
      toast.error(res.error || "Error al guardar", { id: toastId });
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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pizarrón Global de Casos</h1>
          <p className="text-sm text-slate-500 mt-1">Vista administrativa. Puedes modificar cualquier detalle del caso.</p>
        </div>
        <button onClick={fetchCases} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">
          <RefreshCw size={20} className={loading ? "animate-spin text-blue-500" : ""} />
        </button>
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
              <h2 className="text-lg font-black text-slate-800">Editar Caso #{editingCase.id}</h2>
              <button onClick={() => setEditingCase(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
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
                  <label className="text-xs font-bold text-slate-500 uppercase">Doctor (Libre)</label>
                  <input type="text" value={editingCase.doctor || ""} onChange={e => setEditingCase({...editingCase, doctor: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" />
                </div>
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
                    <select value={editingCase.tipo || "Anílogo"} onChange={e => setEditingCase({...editingCase, tipo: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none">
                       <option value="Anílogo">Anílogo (Físico)</option>
                       <option value="Digital">Digital</option>
                    </select>
                 </div>
              </div>

              <div className="space-y-1">
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
    </div>
  );
}

export const dynamic = 'force-dynamic';
