"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Edit, Trash2, Plus, RefreshCw, X, Save, Building2, UserCircle, Users } from "lucide-react";
import { toast, Toaster } from "sonner";
import { 
  getAdminClients, createAdminClient, updateAdminClient, deleteAdminClient,
  getAdminDoctors, createAdminDoctor, updateAdminDoctor, deleteAdminDoctor 
} from "@/app/actions/admin-crm";
import GlassLayout from "@/components/admin/GlassLayout";

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

  const handleDelete = async (id, name, type) => {
    if (!window.confirm(`¿Eliminar permanentemente ${name}?`)) return;
    const toastId = toast.loading("Eliminando...");
    const res = type === "clinica" ? await deleteAdminClient(id) : await deleteAdminDoctor(id);
    if (res.success) {
      toast.success("Eliminado correctamente", { id: toastId });
      fetchData();
    } else {
      toast.error(res.error || "Error al eliminar", { id: toastId });
    }
  };

  const openModal = (item = null) => {
    if (item) {
      const clientIds = item.doctor_clinica ? item.doctor_clinica.map(dc => dc.cliente_id) : [];
      setEditingItem({ ...item, cliente_ids: clientIds, isNew: false });
    } else {
      if (activeTab === "clinicas") {
        setEditingItem({ isNew: true, nombre: "", tel_fijo: "", email: "", direccion: "", notacion_dental: "FDI" });
      } else {
        setEditingItem({ isNew: true, trato: "Dr.", nombre: "", apellido: "", cliente_ids: [], telefono: "", email: "" });
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
        direccion: editingItem.direccion,
        notacion_dental: editingItem.notacion_dental || "FDI"
      };
      if (editingItem.isNew) res = await createAdminClient(payload);
      else res = await updateAdminClient(editingItem.id, payload);
    } else {
      const payload = { 
        trato: editingItem.trato, 
        nombre: editingItem.nombre, 
        apellido: editingItem.apellido, 
        cliente_ids: editingItem.cliente_ids || [], 
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
    <>
      <GlassLayout
      title="Directorio"
      subtitle="Gestión de Clínicas y Doctores."
      icon={<Users size={24} className="text-green-400" />}
      iconBg="bg-green-400/10 border-green-400/20"
      scrollbarClass="crm-scroll"
      scrollbarColor="#4ade80"
      headerActions={
        <>
          <button onClick={() => openModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm pointer-events-auto">
            <Plus size={18} /> Agregar {activeTab === "clinicas" ? "Clínica" : "Doctor"}
          </button>
          <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm pointer-events-auto">
            <RefreshCw size={20} className={loading ? "animate-spin text-emerald-500" : ""} />
          </button>
        </>
      }
      tabs={
        <>
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
        </>
      }
      tableHeader={
        activeTab === "clinicas" ? (
           <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_100px] gap-4 px-4 py-3 font-bold text-slate-700 text-sm">
              <div className="px-4">Nombre Clínica</div>
              <div className="px-4">Teléfono</div>
              <div className="px-4">Email</div>
              <div className="px-4">Dirección</div>
              <div className="px-4 text-right">Acciones</div>
           </div>
        ) : (
           <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_100px] gap-4 px-4 py-3 font-bold text-slate-700 text-sm">
              <div className="px-4">Nombre Doctor</div>
              <div className="px-4">Clínica (Asignada)</div>
              <div className="px-4">Teléfono</div>
              <div className="px-4">Email</div>
              <div className="px-4 text-right">Acciones</div>
           </div>
        )
      }
    >
      <Toaster position="bottom-right" />
      {activeTab === "clinicas" ? (
        loading && clientes.length === 0 ? (
           <div className="py-8 text-center text-slate-400">Cargando clínicas...</div>
        ) : clientes.map(c => (
           <div key={c.id} className="relative group">
             <div className="absolute bottom-0 left-[-30vw] right-[-30vw] h-[1px] bg-gradient-to-r from-transparent via-slate-400/70 to-transparent pointer-events-none z-0"></div>
             <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_100px] gap-4 py-3 items-center hover:bg-slate-50/50 transition-colors relative z-10 text-sm">
                <div className="font-bold text-slate-800 px-4">{c.nombre}</div>
                <div className="text-slate-600 px-4">{c.tel_fijo}</div>
                <div className="text-slate-600 px-4">{c.email}</div>
                <div className="text-slate-600 px-4 truncate max-w-[200px]">{c.direccion}</div>
                <div className="text-right px-4">
                  <button onClick={() => openModal(c)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg mr-2"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(c.id, c.nombre, "clinica")} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 size={16} /></button>
                </div>
             </div>
           </div>
        ))
      ) : (
        loading && doctores.length === 0 ? (
           <div className="py-8 text-center text-slate-400">Cargando doctores...</div>
        ) : doctores.map(d => (
           <div key={d.id} className="relative group">
             <div className="absolute bottom-0 left-[-30vw] right-[-30vw] h-[1px] bg-gradient-to-r from-transparent via-slate-400/70 to-transparent pointer-events-none z-0"></div>
             <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_100px] gap-4 py-3 items-center hover:bg-slate-50/50 transition-colors relative z-10 text-sm">
                <div className="font-bold text-slate-800 px-4">{d.trato} {d.nombre} {d.apellido}</div>
                <div className="text-slate-600 px-4">
                  {(d.doctor_clinica || []).map(dc => dc.clientes?.nombre).filter(Boolean).join(", ") || "Sin Clínica"}
                </div>
                <div className="text-slate-600 px-4">{d.telefono}</div>
                <div className="text-slate-600 px-4">{d.email}</div>
                <div className="text-right px-4">
                  <button onClick={() => openModal(d)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg mr-2"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(d.id, d.nombre, "doctor")} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 size={16} /></button>
                </div>
             </div>
           </div>
        ))
      )}
    </GlassLayout>
      
    {/* MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md pointer-events-auto" onClick={() => setEditingItem(null)}></div>
          <div 
            className="bg-white rounded-[24px] w-full max-w-lg relative z-10 flex flex-col pointer-events-auto"
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
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Notación Dental Preferida</label>
                    <select 
                      value={editingItem.notacion_dental || "FDI"} 
                      onChange={e => setEditingItem({...editingItem, notacion_dental: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none font-semibold text-slate-700"
                    >
                      <option value="FDI">FDI (Internacional - ej. 11, 26)</option>
                      <option value="ADA">ADA / Universal (EUA - ej. 8, 14)</option>
                    </select>
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Clínicas a las que pertenece</label>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 bg-white">
                      {clientes.map(c => {
                        const isChecked = (editingItem.cliente_ids || []).includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                const ids = editingItem.cliente_ids || [];
                                if (e.target.checked) {
                                  setEditingItem({ ...editingItem, cliente_ids: [...ids, c.id] });
                                } else {
                                  setEditingItem({ ...editingItem, cliente_ids: ids.filter(id => id !== c.id) });
                                }
                              }}
                              className="rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                            />
                            <span>{c.nombre}</span>
                          </label>
                        );
                      })}
                    </div>
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
    </>
  );
}
