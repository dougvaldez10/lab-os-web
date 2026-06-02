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

  const hasAdminAccess = user.username?.toLowerCase() === 'admin' || user.username?.toLowerCase() === 'coloraturacorp';

  if (!hasAdminAccess) {
    redirect('/');
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
