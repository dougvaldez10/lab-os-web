import { fetchAllLaboratorios } from "@/app/actions/superadmin";
import { Building, ShieldCheck, ShieldAlert } from "lucide-react";

export default async function LaboratoriosPage() {
  const { data: laboratorios, success } = await fetchAllLaboratorios();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Gestión de Laboratorios</h1>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          + Nuevo Laboratorio
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-800">
              <th className="p-4 text-slate-400 font-medium">ID</th>
              <th className="p-4 text-slate-400 font-medium">Nombre del Laboratorio</th>
              <th className="p-4 text-slate-400 font-medium">Estado</th>
              <th className="p-4 text-slate-400 font-medium">Fecha de Creación</th>
              <th className="p-4 text-slate-400 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {success && laboratorios.map((lab) => (
              <tr key={lab.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                <td className="p-4 text-slate-300">#{lab.id}</td>
                <td className="p-4 font-medium text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                    <Building className="w-4 h-4 text-indigo-400" />
                  </div>
                  {lab.nombre}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    lab.estado === 'activo' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {lab.estado === 'activo' ? <ShieldCheck className="w-3 h-3"/> : <ShieldAlert className="w-3 h-3"/>}
                    {lab.estado.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-slate-400">
                  {new Date(lab.fecha_creacion).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                    Configurar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!success || laboratorios.length === 0) && (
          <div className="p-8 text-center text-slate-500">
            No se encontraron laboratorios.
          </div>
        )}
      </div>
    </div>
  );
}
