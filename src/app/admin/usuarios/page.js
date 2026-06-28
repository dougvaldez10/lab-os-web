"use client";

import { useState, useEffect, useRef } from "react";
import { Edit, Trash2, Plus, RefreshCw, X, Save, UserCog, Camera } from "lucide-react";
import { toast, Toaster } from "sonner";
import { 
  getAllUsers, createUserInSystem, updateUserInSystem, deleteUserInSystem 
} from "@/lib/auth";
import GlassLayout from "@/components/admin/GlassLayout";

const allDepartments = [
  "Recepción", "Yesos", "Digital_Escaneo", "Digital_Diseno", "Digital_Fresado", 
  "Sinterizado", "Ajuste", "Terminado", "Inspección", "Facturación", "Administrativo"
];

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingItem, setEditingItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsuarios(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // DELETE
  const handleDelete = async (id, username) => {
    if (!window.confirm(`¿Eliminar permanentemente al usuario ${username}?`)) return;
    const toastId = toast.loading("Eliminando...");
    const res = await deleteUserInSystem(id, username);
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
      setEditingItem({ 
        ...item, 
        isNew: false, 
        password: "", // Only update if typed
        selectedRoles: item.rol ? item.rol.split(",") : [] 
      });
    } else {
      setEditingItem({ 
        isNew: true, 
        username: "", 
        password: "", 
        avatar_base64: null, 
        selectedRoles: [] 
      });
    }
  };

  const handleRoleToggle = (dept) => {
    setEditingItem(prev => {
      const roles = [...prev.selectedRoles];
      if (roles.includes(dept)) {
        return { ...prev, selectedRoles: roles.filter(r => r !== dept) };
      } else {
        return { ...prev, selectedRoles: [...roles, dept] };
      }
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingItem(prev => ({ ...prev, avatar_base64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (editingItem.isNew && (!editingItem.username || !editingItem.password)) {
      toast.error("El usuario y contraseña son obligatorios");
      return;
    }

    if (!editingItem.isNew && !editingItem.username) {
       toast.error("El usuario es obligatorio");
       return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Guardando...");
    
    const rolString = editingItem.selectedRoles.join(",");

    let res;
    if (editingItem.isNew) {
      res = await createUserInSystem(
        editingItem.username, 
        editingItem.password, 
        rolString, 
        editingItem.avatar_base64
      );
    } else {
      res = await updateUserInSystem(
        editingItem.id, 
        editingItem.username, 
        editingItem.password, 
        rolString, 
        editingItem.avatar_base64
      );
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
        title="Gestión de Usuarios"
        subtitle="Configuración local de acceso y roles (Laboratorio Actual)."
        icon={<UserCog size={24} className="text-rose-400" />}
        iconBg="bg-rose-400/10 border-rose-400/20"
        scrollbarClass="usuarios-scroll"
        headerActions={
          <>
            <button onClick={() => openModal()} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm">
              <Plus size={18} /> Agregar Usuario
            </button>
            <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">
              <RefreshCw size={20} className={loading ? "animate-spin text-rose-500" : ""} />
            </button>
          </>
        }
        tableHeader={null} // No table header, we use a grid
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8 relative z-10 pt-4">
          {loading && usuarios.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 font-medium">Cargando usuarios...</div>
          ) : usuarios.map(u => (
            <div key={u.id} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 md:overflow-visible overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              <div className="p-6 flex flex-col items-center relative">
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => openModal(u)} className="p-2 bg-slate-100 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"><Edit size={16} /></button>
                   <button onClick={() => handleDelete(u.id, u.username)} className="p-2 bg-slate-100 hover:bg-red-100 text-red-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>

                <div className="w-20 h-20 rounded-full overflow-hidden shadow-inner ring-4 ring-slate-50 mb-4 bg-slate-100 flex items-center justify-center text-slate-400 text-3xl font-bold">
                   {u.avatar_base64 ? (
                      <img src={u.avatar_base64} alt={u.username} className="w-full h-full object-cover" />
                   ) : (
                      u.username.charAt(0).toUpperCase()
                   )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-800">{u.username}</h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Roles Asignados</p>
                
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                   {u.rol ? u.rol.split(',').map(r => (
                      <span key={r} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200">
                         {r}
                      </span>
                   )) : (
                      <span className="text-xs text-slate-400 italic">Sin roles</span>
                   )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassLayout>

      {/* MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setEditingItem(null)}></div>
          <div 
            className="bg-white rounded-[24px] w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh]"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 -10px 40px -15px rgba(0, 0, 0, 0.1)' }}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                {editingItem.isNew ? "Agregar" : "Editar"} Usuario
              </h2>
              <button onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-6 overflow-y-auto">
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar Column */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                   <div className="w-28 h-28 rounded-full overflow-hidden shadow-inner ring-4 ring-slate-50 bg-slate-100 flex items-center justify-center text-slate-400 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      {editingItem.avatar_base64 ? (
                         <img src={editingItem.avatar_base64} alt="avatar preview" className="w-full h-full object-cover" />
                      ) : (
                         <Camera size={32} className="opacity-50" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Camera size={24} className="text-white" />
                      </div>
                   </div>
                   <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">Tap para<br/>cambiar Foto</p>
                </div>

                {/* Info Column */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre de Usuario</label>
                    <input type="text" value={editingItem.username} onChange={e => setEditingItem({...editingItem, username: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none" required />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                       {editingItem.isNew ? "Contraseña / PIN (Obligatorio)" : "Nueva Contraseña / PIN (Opcional)"}
                    </label>
                    <input 
                       type="password" 
                       value={editingItem.password} 
                       onChange={e => setEditingItem({...editingItem, password: e.target.value})} 
                       className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none" 
                       placeholder={editingItem.isNew ? "Ingresa contraseña o 4 digitos" : "Dejar en blanco para no cambiar"}
                       required={editingItem.isNew} 
                    />
                  </div>
                </div>
              </div>

              {/* Roles */}
              <div className="border-t border-slate-100 pt-4">
                 <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Tipo de Perfil del Usuario</label>
                 <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button 
                      type="button"
                      onClick={() => !editingItem.selectedRoles.includes("Administrativo") && handleRoleToggle("Administrativo")}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${editingItem.selectedRoles.includes("Administrativo") ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      🛡️ Administrativo
                    </button>
                    <button 
                      type="button"
                      onClick={() => editingItem.selectedRoles.includes("Administrativo") && handleRoleToggle("Administrativo")}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!editingItem.selectedRoles.includes("Administrativo") ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      ⚙️ Producción
                    </button>
                 </div>

                 <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Etapas Permitidas (Opcional para Administrativos)</label>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {allDepartments.filter(d => d !== 'Admin' && d !== 'Administrativo').map(dept => {
                       const isSelected = editingItem.selectedRoles.includes(dept);
                       return (
                          <div 
                             key={dept}
                             onClick={() => handleRoleToggle(dept)}
                             className={`cursor-pointer border rounded-xl px-3 py-2 text-sm font-semibold transition-all flex items-center justify-between ${
                                isSelected ? "bg-rose-50 border-rose-200 text-rose-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                             }`}
                          >
                             {dept}
                             {isSelected && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
                          </div>
                       );
                    })}
                 </div>
              </div>

              <div className="mt-2 flex gap-3 justify-end border-t border-slate-100 pt-6">
                 <button type="button" onClick={() => setEditingItem(null)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">
                   Cancelar
                 </button>
                 <button type="submit" disabled={isSaving} className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md">
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

export const dynamic = 'force-dynamic';
