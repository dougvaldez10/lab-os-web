import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";
import AdminDock from "./AdminDock";

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
    <div className="min-h-screen md:h-screen bg-slate-50 flex flex-col font-sans relative overflow-hidden md:pb-[34px]">
      {/* Menú móvil (pantallas chicas) */}
      <Sidebar />

      {/* Área de contenido principal (en escritorio termina ~34px antes del borde inferior) */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50 h-screen md:h-full overflow-hidden relative">
        {children}
      </main>

      {/* Barra flotante inferior (solo escritorio md+) */}
      <AdminDock />
    </div>
  );
}

export const dynamic = 'force-dynamic';
