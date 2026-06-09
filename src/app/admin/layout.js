import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";

export const metadata = {
  title: 'Lab OS - Administración',
};

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="p-8 text-black">
        <h1>No estás autenticado (user es null)</h1>
        <a href="/" className="text-blue-500 underline">Volver</a>
      </div>
    );
  }

  const hasAdminAccess = user.username?.toLowerCase() === 'admin' || user.username?.toLowerCase() === 'coloraturacorp' || user.username?.toLowerCase() === 'legion' || user.rol === 'lab_owner';

  if (!hasAdminAccess) {
    return (
      <div className="p-8 text-black">
        <h1>Acceso Denegado</h1>
        <p>No tienes permiso para ver esta página.</p>
        <pre>{JSON.stringify(user, null, 2)}</pre>
        <a href="/" className="text-blue-500 underline">Volver</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar de Administración */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export const dynamic = 'force-dynamic';
