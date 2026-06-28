"use client";

import { useState, useEffect, useRef } from "react";
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

  const topSectionRef = useRef(null);
  const [topHeight, setTopHeight] = useState(200);

  useEffect(() => {
    if (topSectionRef.current) {
      setTopHeight(topSectionRef.current.getBoundingClientRect().height);
    }
    // Añadimos un listener de resize para ajustar si cambia la pantalla
    const handleResize = () => {
      if (topSectionRef.current) {
        setTopHeight(topSectionRef.current.getBoundingClientRect().height);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, clientes, doctores]);

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
    <div className="flex-1 relative h-full w-full overflow-hidden bg-slate-50">
      <Toaster position="bottom-right" />

      {/* LAYER 1: LA HOJA DE PAPEL (SCROLLING) */}
      <div className="absolute inset-0 overflow-y-auto crm-scroll z-0">
        <div style={{ paddingTop: `${topHeight}px` }} className="px-4 md:px-8 pb-24 w-full flex flex-col">
          {activeTab === "clinicas" ? (
            loading && clientes.length === 0 ? (
               <div className="py-8 text-center text-slate-400">Cargando clínicas...</div>
            ) : clientes.map(c => (
               <div key={c.id} className="relative group border-b border-slate-100">
                 {/* La línea horizontal que sale del cuadro hacia los lados */}
                 <div className="absolute bottom-[-1px] left-[-100vw] right-[-100vw] h-[1px] bg-slate-200 pointer-events-none z-0"></div>
                 {/* Los datos de la fila */}
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
               <div key={d.id} className="relative group border-b border-slate-100">
                 {/* La línea horizontal que sale del cuadro hacia los lados */}
                 <div className="absolute bottom-[-1px] left-[-100vw] right-[-100vw] h-[1px] bg-slate-200 pointer-events-none z-0"></div>
                 {/* Los datos de la fila */}
                 <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_100px] gap-4 py-3 items-center hover:bg-slate-50/50 transition-colors relative z-10 text-sm">
                    <div className="font-bold text-slate-800 px-4">{d.trato} {d.nombre} {d.apellido}</div>
                    <div className="text-slate-600 px-4">{d.clientes?.nombre || "Sin Clínica"}</div>
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
        </div>
      </div>

      {/* LAYER 2: EL VIDRIO OPACO (ZONA FUERA DEL RECTANGULO) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
        {/* Top glass (cubre la cabecera) */}
        <div style={{ height: `${topHeight}px` }} className="bg-slate-50/30 backdrop-blur-sm w-full transition-all duration-300" />
        
        {/* Middle section (cubre los lados izquierdo y derecho) */}
        <div className="flex-1 flex">
          <div className="w-4 md:w-8 bg-slate-50/30 backdrop-blur-sm h-full transition-all duration-300" />
          <div className="flex-1 bg-transparent h-full" /> {/* EL HUECO (CUTOUT) */}
          <div className="w-4 md:w-8 bg-slate-50/30 backdrop-blur-sm h-full transition-all duration-300" />
        </div>
        
        {/* Bottom glass */}
        <div className="h-4 md:h-8 bg-slate-50/30 backdrop-blur-sm w-full transition-all duration-300" />
      </div>

      {/* LAYER 3: LOS PAPELES SOLIDOS (TÍTULOS, BOTONES Y CABECERAS DE TABLA) */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col">
        <div ref={topSectionRef} className="pointer-events-none flex flex-col pt-4 md:pt-8 px-4 md:px-8">
          
          {/* Título y Tabs - Papel Sólido */}
          <div className="pointer-events-auto bg-slate-50 pb-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 bg-slate-50">
                  <div className="bg-[#D4AF37]/10 p-2 rounded-xl border border-[#D4AF37]/20">
                    <Building2 size={24} className="text-[#D4AF37]" />
                  </div>
                  <span className="bg-slate-50">Directorio CRM</span>
                </h1>
                <p className="text-sm text-slate-500 mt-1 bg-slate-50 w-fit pr-2">Gestión de Clínicas y Doctores.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm pointer-events-auto">
                  <Plus size={18} /> Agregar {activeTab === "clinicas" ? "Clínica" : "Doctor"}
                </button>
                <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm pointer-events-auto">
                  <RefreshCw size={20} className={loading ? "animate-spin text-emerald-500" : ""} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 w-fit pointer-events-auto">
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
          </div>

          {/* Table Header - Papel Sólido */}
          <div className="pointer-events-auto bg-slate-50 border border-slate-200 rounded-t-2xl shadow-sm relative z-30">
            {activeTab === "clinicas" ? (
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
            )}
          </div>
        </div>

        {/* El Marco del Hueco (Bordes del rectángulo) */}
        <div className="flex-1 px-4 md:px-8 pb-4 md:pb-8 pointer-events-none">
          <div className="w-full h-full border-x border-b border-slate-200 rounded-b-2xl pointer-events-none relative z-30"></div>
        </div>
      </div>

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
