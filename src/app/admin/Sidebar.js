"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Users, Wallet, BarChart3, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { logoutUser } from "@/lib/auth";

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Sync with localStorage on client mount
  useEffect(() => {
    const stored = localStorage.getItem("labos-sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
    setMounted(true);
  }, []);

  const toggleCollapse = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("labos-sidebar-collapsed", String(nextState));
  };

  const menuItems = [
    { href: "/admin", label: "Pizarrón (Casos)", icon: ClipboardList, iconColor: "text-blue-400" },
    { href: "/admin/crm", label: "Directorio CRM", icon: Users, iconColor: "text-green-400" },
    { href: "/admin/facturacion", label: "Facturación", icon: Wallet, iconColor: "text-amber-400" },
    { href: "/admin/analisis", label: "Métricas y Análisis", icon: BarChart3, iconColor: "text-purple-400" },
  ];

  // During SSR or before hydration, use expanded state to prevent layout shift
  const isCollapsed = mounted ? collapsed : false;

  return (
    <aside 
      className={`w-full bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-all duration-300 relative border-r border-slate-800/80 md:h-screen md:sticky md:top-0 ${
        isCollapsed ? "md:w-20" : "md:w-64"
      }`}
    >
      {/* Toggle Button for Desktop */}
      <button
        onClick={toggleCollapse}
        aria-label={isCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
        className="hidden md:flex absolute top-6 -right-3 w-6 h-6 bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-full items-center justify-center cursor-pointer transition-all shadow-md z-50 hover:bg-slate-700"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header / Brand */}
      <div 
        className={`p-4 flex items-center border-b border-slate-800 h-[73px] overflow-hidden ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <img 
            src="/apple-touch-icon.png" 
            alt="Lab OS Logo" 
            className="w-8 h-8 rounded-lg shrink-0 object-contain bg-slate-850 p-0.5 border border-slate-700/50" 
          />
          {!isCollapsed && (
            <h2 className="text-xl font-black text-white tracking-tight whitespace-nowrap animate-fade-in">
              <span className="text-[#D4AF37]">Lab</span> OS
            </h2>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Determine if the item is active
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-250 ${
                isActive
                  ? "bg-slate-800 text-white font-semibold border-l-2 border-[#D4AF37] shadow-inner"
                  : "hover:bg-slate-800/60 hover:text-white text-slate-400"
              } ${isCollapsed ? "justify-center px-0" : ""}`}
            >
              <Icon size={20} className={`${item.iconColor} shrink-0 transition-transform duration-200 hover:scale-110`} />
              {!isCollapsed && (
                <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
        <button
          onClick={async () => {
            await logoutUser();
            window.location.href = "/";
          }}
          title={isCollapsed ? "Cerrar Sesión" : undefined}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-800/70 text-slate-300 hover:bg-red-500 hover:text-white transition-all duration-200 font-medium ${
            isCollapsed ? "justify-center px-0" : "w-full"
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {!isCollapsed && <span className="text-sm whitespace-nowrap">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}
