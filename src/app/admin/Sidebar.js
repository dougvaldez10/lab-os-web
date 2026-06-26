"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Users, Wallet, BarChart3, ChevronLeft, ChevronRight, LogOut, UserCog, ShieldAlert } from "lucide-react";
import { logoutUser, getCurrentUser } from "@/lib/auth";
import { getAuditAlerts } from "@/app/actions/audit";

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [auditCount, setAuditCount] = useState(0);

  // Sync with localStorage on client mount
  useEffect(() => {
    const stored = localStorage.getItem("labos-sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
    setMounted(true);

    // Fetch user role and audit counts
    getCurrentUser().then(user => {
      const superAdmin = user?.is_superadmin || user?.rol === 'lab_owner' || user?.username?.toLowerCase() === 'legion';
      if (superAdmin) {
        setIsAdmin(true);
        getAuditAlerts().then(res => {
          if (res.success && res.alerts) {
            setAuditCount(res.alerts.length);
          }
        });
      }
    });
  }, []);

  const toggleCollapse = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("labos-sidebar-collapsed", String(nextState));
  };

  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);

  const handleMouseEnter = (href) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoveredMenu(href);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setHoveredMenu(null);
    }, 200);
    setHoverTimeout(timeout);
  };

  const subMenus = {
    "/admin/facturacion": [
      { label: "Casos Pendientes", href: "/admin/facturacion?tab=pendientes" },
      { label: "Cuentas por Cobrar", href: "/admin/facturacion?tab=cxc" },
      { label: "Historial de Pagos", href: "/admin/facturacion?tab=history" }
    ],
    "/admin/crm": [
      { label: "Clínicas", href: "/admin/crm?tab=clinicas" },
      { label: "Doctores", href: "/admin/crm?tab=doctores" }
    ]
  };

  const popoverVariants = {
    hidden: {
      opacity: 0,
      scaleX: 0.1,
      scaleY: 0.4,
      x: -30,
      originX: 0,
      originY: 0.5,
    },
    visible: {
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 25,
        staggerChildren: 0.02,
        delayChildren: 0.01
      }
    },
    exit: {
      opacity: 0,
      scale: 0.85,
      x: -10,
      transition: {
        duration: 0.12,
        ease: "easeOut"
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.92, 
      x: -8,
      originX: 0
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      x: 0,
      transition: { 
        type: "spring", 
        stiffness: 350, 
        damping: 25 
      }
    }
  };

  const menuItems = [
    { href: "/admin", label: "Casos", icon: ClipboardList, iconColor: "text-blue-400" },
    { href: "/admin/facturacion", label: "Finanzas", icon: Wallet, iconColor: "text-amber-400" },
    { href: "/admin/crm", label: "Directorio", icon: Users, iconColor: "text-green-400" },
    { href: "/admin/usuarios", label: "Usuarios", icon: UserCog, iconColor: "text-rose-400" },
    { href: "/admin/analisis", label: "Métricas", icon: BarChart3, iconColor: "text-purple-400" },
  ];

  if (isAdmin) {
    menuItems.push({ href: "/admin/auditoria", label: "Auditoría", icon: ShieldAlert, iconColor: "text-red-500", badge: auditCount });
  }

  // During SSR or before hydration, use expanded state to prevent layout shift
  const isCollapsed = mounted ? collapsed : false;

  return (
    <aside 
      className={`w-full bg-slate-900 text-slate-300 flex flex-row md:flex-col shrink-0 transition-all duration-300 relative border-b md:border-b-0 md:border-r border-slate-800/80 md:h-screen md:sticky md:top-0 z-50 ${
        isCollapsed ? "md:w-20" : "md:w-64"
      } items-center md:items-stretch`}
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
        className={`p-2 md:p-4 flex items-center md:border-b border-slate-800 h-14 md:h-[73px] overflow-hidden shrink-0 ${
          isCollapsed ? "md:justify-center" : "md:justify-between"
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <img 
            src="/apple-touch-icon.png" 
            alt="Lab OS Logo" 
            className="w-8 h-8 rounded-lg shrink-0 object-contain bg-slate-850 p-0.5 border border-slate-700/50" 
          />
          <h2 className={`text-xl font-black text-white tracking-tight whitespace-nowrap animate-fade-in hidden md:block ${isCollapsed ? 'md:hidden' : ''}`}>
            <span className="text-[#D4AF37]">Lab</span> OS
          </h2>
        </div>
      </div>

      {/* Navigation */}
      <nav 
        className="flex-1 py-1 px-1 md:py-4 md:px-3 flex flex-row md:flex-col gap-1 md:gap-2 overflow-x-auto overflow-y-hidden md:overflow-visible"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style dangerouslySetInnerHTML={{__html: `nav::-webkit-scrollbar { display: none; }`}} />
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Determine if the item is active
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
          const hasSubmenu = subMenus[item.href] !== undefined;
          const isHovered = hoveredMenu === item.href;

          return (
            <div
              key={item.href}
              className="relative"
              onMouseEnter={() => hasSubmenu && handleMouseEnter(item.href)}
              onMouseLeave={() => hasSubmenu && handleMouseLeave()}
            >
              <Link
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`relative flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-xl transition-all duration-250 ${
                  isActive
                    ? "bg-slate-800 text-white font-semibold md:border-l-2 md:border-b-0 border-b-2 border-[#D4AF37] shadow-inner"
                    : "hover:bg-slate-800/60 hover:text-white text-slate-400"
                } justify-center md:justify-start ${isCollapsed ? "md:justify-center md:px-0" : ""}`}
              >
                <Icon size={20} className={`${item.iconColor} shrink-0 transition-transform duration-200 hover:scale-110`} />
                
                <span className={`font-medium text-sm whitespace-nowrap flex-1 hidden md:block ${isCollapsed ? 'md:hidden' : ''}`}>
                  {item.label}
                </span>
                
                {/* Badge for Desktop Expanded */}
                {item.badge > 0 && (
                  <span className={`bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full hidden md:block ${isCollapsed ? 'md:hidden' : ''}`}>
                    {item.badge}
                  </span>
                )}
                
                {/* Badge for Mobile and Desktop Collapsed */}
                {item.badge > 0 && (
                  <div className={`absolute bottom-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse block md:hidden ${isCollapsed ? 'md:block' : ''}`}></div>
                )}
              </Link>

              {/* Popover Bubble Menu (Desktop Only) */}
              {hasSubmenu && (
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      variants={popoverVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="hidden md:flex absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-[100] flex-col gap-2 p-3 bg-slate-900/55 border border-slate-700/30 backdrop-blur-md rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[180px]"
                    >
                      {subMenus[item.href].map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setHoveredMenu(null)}
                          className="block"
                        >
                          <motion.div
                            variants={itemVariants}
                            whileHover={{ scale: 1.03, backgroundColor: "rgba(212, 175, 55, 0.2)", borderColor: "rgba(212, 175, 55, 0.5)", color: "#ffffff" }}
                            className="px-5 py-2.5 bg-slate-800/65 text-slate-300 rounded-full text-xs font-bold text-center border border-slate-700/30 shadow-sm whitespace-nowrap cursor-pointer"
                          >
                            {subItem.label}
                          </motion.div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-1 md:p-4 md:border-t border-slate-800 flex flex-col gap-2 shrink-0">
        <button
          onClick={async () => {
            const { supabase } = await import('@/lib/supabase');
            await supabase.auth.signOut();
            await logoutUser();
            window.location.href = "/";
          }}
          title="Cerrar Sesión"
          className={`flex items-center gap-2.5 px-3 py-2.5 md:px-4 rounded-xl bg-slate-800/70 text-slate-300 hover:bg-red-500 hover:text-white transition-all duration-200 font-medium justify-center ${
            isCollapsed ? "md:px-0" : "md:w-full"
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          <span className={`text-sm whitespace-nowrap hidden md:block ${isCollapsed ? 'md:hidden' : ''}`}>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
