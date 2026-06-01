import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Users } from "lucide-react";
import LogoutButton from "./LogoutButton";

export const metadata = {
  title: 'Lab OS - Administración',
};

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const hasAdminAccess = user.username?.toLowerCase() === 'admin' || user.username?.toLowerCase() === 'coloraturacorp';

  if (!hasAdminAccess) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar de Administración */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="text-[#D4AF37]">Admin</span> OS
          </h2>
        </div>

        <nav className="flex-1 py-4 px-3 flex flex-col gap-2">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors">
            <ClipboardList size={20} className="text-blue-400" />
            <span className="font-medium">Pizarrón (Casos)</span>
          </Link>
          <Link href="/admin/crm" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors">
            <Users size={20} className="text-green-400" />
            <span className="font-medium">Directorio CRM</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}
