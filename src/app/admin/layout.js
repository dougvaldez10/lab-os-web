import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";

export const metadata = {
  title: 'Lab OS - Administración',
};

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  // Acceso administrativo: usuarios con rol Administrativo, lab_owner, o nombres conocidos
  const uname = user.username?.toLowerCase();
  const rolStr = user.rol || '';
  const hasAdminAccess = 
    uname === 'admin' || 
    uname === 'legion' || 
    uname === 'coloraturacorp' || 
    rolStr === 'lab_owner' || 
    rolStr.includes('Administrativo');

  if (!hasAdminAccess) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar de Administración */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 h-screen overflow-x-visible overflow-y-auto relative z-0">
        {children}
      </main>
    </div>
  );
}

export const dynamic = 'force-dynamic';
