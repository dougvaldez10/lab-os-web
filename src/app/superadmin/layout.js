import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Building, Users, LogOut } from "lucide-react";
import LogoutButton from "@/app/admin/LogoutButton";

export const metadata = {
  title: 'Modo Dios - Super Admin',
};

export default async function SuperAdminLayout({ children }) {
  const user = await getCurrentUser();

  if (!user || !user.is_superadmin) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar de Super Admin */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            God Mode
          </span>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <Link href="/superadmin" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/superadmin/laboratorios" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
            <Building className="w-5 h-5" />
            <span>Laboratorios</span>
          </Link>
        </nav>

        <div className="mt-auto border-t border-slate-800 pt-4">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export const dynamic = 'force-dynamic';
