import { fetchAllLaboratorios } from "@/app/actions/superadmin";
import { Building, Users, Activity } from "lucide-react";

export default async function SuperAdminDashboard() {
  const { data: laboratorios, success } = await fetchAllLaboratorios();
  const labs = success ? laboratorios : [];
  const activeLabs = labs.filter(l => l.estado === 'activo').length;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-white">Panorama General</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Building className="w-6 h-6" />
            </div>
            <h3 className="text-slate-400 font-medium">Laboratorios Totales</h3>
          </div>
          <p className="text-4xl font-bold text-white">{labs.length}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-slate-400 font-medium">Laboratorios Activos</h3>
          </div>
          <p className="text-4xl font-bold text-white">{activeLabs}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-slate-400 font-medium">Usuarios Registrados</h3>
          </div>
          <p className="text-4xl font-bold text-white">--</p>
        </div>
      </div>
    </div>
  );
}
