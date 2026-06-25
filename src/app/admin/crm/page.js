"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Edit, Trash2, Plus, RefreshCw, X, Save, Building2, UserCircle } from "lucide-react";
import { toast, Toaster } from "sonner";
import { 
  getAdminClients, createAdminClient, updateAdminClient, deleteAdminClient,
  getAdminDoctors, createAdminDoctor, updateAdminDoctor, deleteAdminDoctor 
} from "@/app/actions/admin-crm";

export default function AdminCRM() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("clinicas");
  
  const [clientes, setClientes] = useState([]);
  const [doctores, setDoctores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingItem, setEditingItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [resClients, resDocs] = await Promise.all([
      getAdminClients(),
      getAdminDoctors()
    ]);
    if (resClients.success) setClientes(resClients.data);
    else toast.error("Error cargando clínicas");
    
    if (resDocs.success) setDoctores(resDocs.data);
    else toast.error("Error cargando doctores");
    
    setLoading(false);
  };

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    if (tabParam && ["clinicas", "doctores"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    fetchData();
  }, []);

  // DELETE
  const handleDelete = async (id, name, type) => {
    if (!window.confirm(`┬┐Eliminar permanentemente ${name}?`)) return;
    const toastId = toast.loading("Eliminando...");
    const res = type === "clinica" ? await deleteAdminClient(id) : await deleteAdminDoctor(id);
    if (res.success) {
      toast.success("Eliminado correctamente", { id: toastId });
      fetchData();
    } else {
      toast.error(res.error || "Error al eliminar", { id: toastId });
    }
  };

  // EDIT / CREATE
  const openModal = (item = null) => {
    if (item) {
      setEditingItem({ ...item, isNew: false });
    } else {
      if (activeTab === "clinicas") {
        setEditingItem({ isNew: true, nombre: "", tel_fijo: "", email: "", direccion: "" });
      } else {
        setEditingItem({ isNew: true, trato: "Dr.", nombre: "", apellido: "", cliente_id: "", telefono: "", email: "" });
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const toastId = toast.loading("Guardando...");
    
    let res;
    if (activeTab === "clinicas") {
      const payload = { 
        nombre: editingItem.nombre, 
        tel_fijo: editingItem.tel_fijo, 
        email: editingItem.email, 
        direccion: editingItem.direccion 
      };
      if (editingItem.isNew) res = await createAdminClient(payload);
      else res = await updateAdminClient(editingItem.id, payload);
    } else {
      const payload = { 
        trato: editingItem.trato, 
        nombre: editingItem.nombre, 
        apellido: editingItem.apellido, 
        cliente_id: editingItem.cliente_id || null, 
        telefono: editingItem.telefono, 
        email: editingItem.email 
      };
      if (editingItem.isNew) res = await createAdminDoctor(payload);
      else res = await updateAdminDoctor(editingItem.id, payload);
    }

    setIsSaving(false);
    if (res.success) {
      toast.success("Guardado correctamente", { id: toastId });
      setEditingItem(null);
      fetchData();
    } else {
      toast.error(res.error || "Error al guardar", { id: toastId });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      <Toaster position="bottom-right" />
      
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Directorio CRM</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de Clínicas y Doctores.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => openModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm hover-lift">
            <Plus size={18} /> Agregar {activeTab === "clinicas" ? "Clínica" : "Doctor"}
          </button>
          <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm hover:rotate-180 transition-all duration-500 cursor-pointer">
            <RefreshCw size={20} className={loading ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 shrink-0 bg-white p-1.5 rounded-xl border border-slate-200 w-fit">
        <button 
          onClick={() => setActiveTab("clinicas")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'clinicas' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Building2 size={18} /> Clínicas
        </button>
        <button 
          onClick={() => setActiveTab("doctores")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'doctores' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <UserCircle size={18} /> Doctores
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          {activeTab === "clinicas" ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Nombre Clínica</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && clientes.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">Cargando clínicas...</td></tr>
                ) : clientes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">{c.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{c.tel_fijo}</td>
                    <td className="px-4 py-3 text-slate-600">{c.email}</td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">{c.direccion}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openModal(c)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg mr-2"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(c.id, c.nombre, "clinica")} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Nombre Doctor</th>
                  <th className="px-4 py-3">Clínica (Asignada)</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && doctores.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">Cargando doctores...</td></tr>
                ) : doctores.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">{d.trato} {d.nombre} {d.apellido}</td>
                    <td className="px-4 py-3 text-slate-600">{d.clientes?.nombre || "Sin Clínica"}</td>
                    <td className="px-4 py-3 text-slate-600">{d.telefono}</td>
                    <td className="px-4 py-3 text-slate-600">{d.email}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openModal(d)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg mr-2"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(d.id, d.nombre, "doctor")} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setEditingItem(null)}></div>
          <div 
            className="bg-white rounded-[24px] w-full max-w-lg relative z-10 flex flex-col"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 -10px 40px -15px rgba(0, 0, 0, 0.1)' }}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">
                {editingItem.isNew ? "Agregar" : "Editar"} {activeTab === "clinicas" ? "Clínica" : "Doctor"}
              </h2>
              <button onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              {activeTab === "clinicas" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre de Clínica</label>
                    <input type="text" value={editingItem.nombre} onChange={e => setEditingItem({...editingItem, nombre: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                      <input type="text" value={editingItem.tel_fijo || ""} onChange={e => setEditingItem({...editingItem, tel_fijo: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                      <input type="email" value={editingItem.email || ""} onChange={e => setEditingItem({...editingItem, email: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Dirección</label>
                    <textarea value={editingItem.direccion || ""} onChange={e => setEditingItem({...editingItem, direccion: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none resize-none"></textarea>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1 col-span-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Trato</label>
                      <input type="text" value={editingItem.trato || ""} onChange={e => setEditingItem({...editingItem, trato: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" placeholder="Ej. Dr." />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                      <input type="text" value={editingItem.nombre} onChange={e => setEditingItem({...editingItem, nombre: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Apellido</label>
                    <input type="text" value={editingItem.apellido || ""} onChange={e => setEditingItem({...editingItem, apellido: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Clínica a la que pertenece</label>
                    <select value={editingItem.cliente_id || ""} onChange={e => setEditingItem({...editingItem, cliente_id: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none">
                      <option value="">-- Sin Clínica --</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                      <input type="text" value={editingItem.telefono || ""} onChange={e => setEditingItem({...editingItem, telefono: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                      <input type="email" value={editingItem.email || ""} onChange={e => setEditingItem({...editingItem, email: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" />
                    </div>
                  </div>
                </>
              )}

              <div className="mt-4 flex gap-3 justify-end">
                 <button type="button" onClick={() => setEditingItem(null)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">
                   Cancelar
                 </button>
                 <button type="submit" disabled={isSaving} className="px-5 py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md">
                   {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                   Guardar
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
