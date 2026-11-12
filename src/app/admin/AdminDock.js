"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingDown,
  ClipboardList,
  Users,
  Wallet,
  BarChart3,
  LogOut,
  UserCog,
  ShieldAlert,
} from "lucide-react";
import { logoutUser, getCurrentUser } from "@/lib/auth";
import { getAuditAlerts } from "@/app/actions/audit";

const MORPH_EASE = [0.22, 1, 0.36, 1];
const HOLD_MS = 2500;
const GLOW_BEFORE_GROW_MS = 200;
const STORAGE_KEY = "labos-admin-dock-labels";

const SUB_MENUS = {
  "/admin/facturacion": [
    { label: "Casos Pendientes", href: "/admin/facturacion?tab=pendientes", tab: "pendientes" },
    { label: "Cuentas por Cobrar", href: "/admin/facturacion?tab=cxc", tab: "cxc" },
    { label: "Historial de Pagos", href: "/admin/facturacion?tab=history", tab: "history" },
  ],
  "/admin/crm": [
    { label: "Clínicas", href: "/admin/crm?tab=clinicas", tab: "clinicas" },
    { label: "Doctores", href: "/admin/crm?tab=doctores", tab: "doctores" },
  ],
};

export default function AdminDock() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchStr = searchParams ? searchParams.toString() : "";
  const [isAdmin, setIsAdmin] = useState(false);
  const [auditCount, setAuditCount] = useState(0);
  const [showLabels, setShowLabels] = useState(false);
  const [isStrip, setIsStrip] = useState(true);
  const [isGlowing, setIsGlowing] = useState(false);
  const [isHopping, setIsHopping] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [activeTabParam, setActiveTabParam] = useState("");

  const pointerInsideRef = useRef(false);
  const hoveredMenuRef = useRef(null);
  const isStripRef = useRef(true);
  const shrinkTimerRef = useRef(null);
  const glowTimerRef = useRef(null);
  const menuHoverTimerRef = useRef(null);
  const hopTimerRef = useRef(null);

  useEffect(() => {
    isStripRef.current = isStrip;
  }, [isStrip]);

  useEffect(() => {
    hoveredMenuRef.current = hoveredMenu;
  }, [hoveredMenu]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setShowLabels(stored === "true");
      }
    } catch {
      // Ignore storage errors
    }

    getCurrentUser().then((user) => {
      const superAdmin =
        user?.is_superadmin ||
        user?.rol === "lab_owner" ||
        user?.username?.toLowerCase() === "legion";
      if (superAdmin) {
        setIsAdmin(true);
        getAuditAlerts().then((res) => {
          if (res.success && res.alerts) {
            setAuditCount(res.alerts.length);
          }
        });
      }
    });

    return () => {
      clearTimeout(shrinkTimerRef.current);
      clearTimeout(glowTimerRef.current);
      clearTimeout(menuHoverTimerRef.current);
      clearTimeout(hopTimerRef.current);
    };
  }, []);

  const clearDockTimers = () => {
    if (shrinkTimerRef.current) {
      clearTimeout(shrinkTimerRef.current);
      shrinkTimerRef.current = null;
    }
    if (glowTimerRef.current) {
      clearTimeout(glowTimerRef.current);
      glowTimerRef.current = null;
    }
  };

  const resetSubmenuAndHover = () => {
    if (menuHoverTimerRef.current) {
      clearTimeout(menuHoverTimerRef.current);
      menuHoverTimerRef.current = null;
    }
    hoveredMenuRef.current = null;
    setHoveredMenu(null);
    setHoveredItem(null);
  };

  const openDockNow = () => {
    clearDockTimers();
    setIsGlowing(false);
    setIsStrip(false);
  };

  const scheduleShrink = () => {
    clearDockTimers();
    setIsGlowing(false);
    shrinkTimerRef.current = setTimeout(() => {
      shrinkTimerRef.current = null;
      if (pointerInsideRef.current || hoveredMenuRef.current !== null) return;
      setIsStrip(true);
    }, HOLD_MS);
  };

  useEffect(() => {
    const params = new URLSearchParams(
      searchStr || (typeof window !== "undefined" ? window.location.search : "")
    );
    setActiveTabParam(params.get("tab") || "");
    resetSubmenuAndHover();
    if (!isStripRef.current && !pointerInsideRef.current) {
      scheduleShrink();
    }
  }, [pathname, searchStr]);

  const handleProximityEnter = () => {
    pointerInsideRef.current = true;
    if (shrinkTimerRef.current) {
      clearTimeout(shrinkTimerRef.current);
      shrinkTimerRef.current = null;
    }
    if (isStripRef.current) {
      setIsGlowing(true);
      if (!glowTimerRef.current) {
        glowTimerRef.current = setTimeout(() => {
          glowTimerRef.current = null;
          if (!pointerInsideRef.current) return;
          setIsGlowing(false);
          setIsStrip(false);
        }, GLOW_BEFORE_GROW_MS);
      }
    } else {
      openDockNow();
    }
  };

  const handleProximityLeave = () => {
    pointerInsideRef.current = false;
    if (glowTimerRef.current) {
      clearTimeout(glowTimerRef.current);
      glowTimerRef.current = null;
    }
    setIsGlowing(false);
    if (hoveredMenuRef.current !== null) return;
    scheduleShrink();
  };

  const handleSubmenuEnter = (href) => {
    if (menuHoverTimerRef.current) {
      clearTimeout(menuHoverTimerRef.current);
      menuHoverTimerRef.current = null;
    }
    hoveredMenuRef.current = href;
    setHoveredMenu(href);
  };

  const handleSubmenuLeave = () => {
    if (menuHoverTimerRef.current) {
      clearTimeout(menuHoverTimerRef.current);
      menuHoverTimerRef.current = null;
    }
    menuHoverTimerRef.current = setTimeout(() => {
      menuHoverTimerRef.current = null;
      hoveredMenuRef.current = null;
      setHoveredMenu(null);
      if (!pointerInsideRef.current) {
        scheduleShrink();
      }
    }, 180);
  };

  const handleSubmenuOptionClick = (tab) => {
    setActiveTabParam(tab);
    pointerInsideRef.current = false;
    resetSubmenuAndHover();
    scheduleShrink();
  };

  const handleToggleLabels = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isStrip) return;
    const next = !showLabels;
    setShowLabels(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Ignore storage errors
    }
    setIsHopping(true);
    if (hopTimerRef.current) {
      clearTimeout(hopTimerRef.current);
    }
    hopTimerRef.current = setTimeout(() => {
      hopTimerRef.current = null;
      setIsHopping(false);
    }, 320);
    openDockNow();
  };

  const handleLogout = async () => {
    const { supabase } = await import("@/lib/supabase");
    await supabase.auth.signOut();
    await logoutUser();
    window.location.href = "/";
  };

  const menuItems = [
    {
      id: "casos",
      href: "/admin",
      label: "Casos",
      icon: ClipboardList,
      accent: "#60a5fa",
      strong: "#2563eb",
      tint: "#eff6ff",
      glowCore: "#bfdbfe",
    },
    {
      id: "finanzas",
      href: "/admin/facturacion",
      label: "Finanzas",
      icon: Wallet,
      accent: "#fbbf24",
      strong: "#b8860b",
      tint: "#fffbeb",
      glowCore: "#fde68a",
    },
    {
      id: "gastos",
      href: "/admin/gastos",
      label: "Gastos",
      icon: TrendingDown,
      accent: "#ef4444",
      strong: "#b91c1c",
      tint: "#fef2f2",
      glowCore: "#fecaca",
    },
    {
      id: "directorio",
      href: "/admin/crm",
      label: "Directorio",
      icon: Users,
      accent: "#4ade80",
      strong: "#16a34a",
      tint: "#f0fdf4",
      glowCore: "#bbf7d0",
    },
  ];

  if (isAdmin) {
    menuItems.push(
      {
        id: "usuarios",
        href: "/admin/usuarios",
        label: "Usuarios",
        icon: UserCog,
        accent: "#fb7185",
        strong: "#e11d48",
        tint: "#fff1f2",
        glowCore: "#fecdd3",
      },
      {
        id: "metricas",
        href: "/admin/analisis",
        label: "Métricas",
        icon: BarChart3,
        accent: "#c084fc",
        strong: "#7c3aed",
        tint: "#faf5ff",
        glowCore: "#e9d5ff",
      },
      {
        id: "auditoria",
        href: "/admin/auditoria",
        label: "Auditoría",
        icon: ShieldAlert,
        accent: "#ef4444",
        strong: "#b91c1c",
        tint: "#fef2f2",
        glowCore: "#fecaca",
        badge: auditCount,
      }
    );
  }

  // Exact horizontal geometry so every SVG glow matches its icon center
  const itemW = showLabels ? 78 : 62;
  const padX = 22;
  const gap = 2;
  const sepTotal = 13; // 1px width + 6px margin left + 6px margin right
  const sepBlock = gap + sepTotal + gap; // 17px between brand/items and items/logout

  const brandCx = padX + itemW / 2;
  const itemsStartX = padX + itemW + sepBlock;
  const itemCenters = menuItems.map((it, idx) => ({
    ...it,
    cx: itemsStartX + idx * (itemW + gap) + itemW / 2,
  }));
  const logoutStartX =
    itemsStartX + menuItems.length * itemW + (menuItems.length - 1) * gap + sepBlock;
  const logoutCx = logoutStartX + itemW / 2;
  const totalInnerWidth = logoutStartX + itemW + padX;

  const svgBlooms = [
    { id: "brand", cx: brandCx, accent: "#ebb305", glowCore: "#fde68a" },
    ...itemCenters,
    { id: "salir", cx: logoutCx, accent: "#64748b", glowCore: "#cbd5e1" },
  ];

  return (
    <div className="hidden md:flex fixed inset-x-0 bottom-0 justify-center z-40 pointer-events-none overflow-visible">
      <div
        onPointerEnter={handleProximityEnter}
        onPointerLeave={handleProximityLeave}
        onPointerDown={() => {
          pointerInsideRef.current = true;
          openDockNow();
        }}
        className="pointer-events-auto px-14 pt-5 pb-[22px] overflow-visible"
      >
        <motion.nav
          aria-label="Navegación de administración"
          initial={false}
          onPointerMove={() => {
            if (!pointerInsideRef.current) {
              handleProximityEnter();
            }
          }}
          animate={{
            height: isStrip ? 22 : 90,
            borderRadius: isStrip ? 11 : 32,
          }}
          transition={{
            duration: 0.4,
            ease: MORPH_EASE,
          }}
          style={{
            paddingLeft: `${padX}px`,
            paddingRight: `${padX}px`,
          }}
          className="relative flex items-center justify-center gap-[2px] select-none overflow-visible"
        >
          {/* CAPA 1: Vidrio con backdrop-blur, isolate y transform-gpu (sin filter:url()) */}
          <div
            className="absolute inset-0 rounded-[inherit] bg-white/[0.23] backdrop-blur-[12px] backdrop-saturate-125 isolate transform-gpu pointer-events-none transition-[border-color,box-shadow] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              border: isStrip
                ? "1px solid rgba(255, 250, 245, 0.55)"
                : "1px solid rgba(255, 255, 255, 0.72)",
              boxShadow: isStrip
                ? "inset 0 2px 3px rgba(255, 226, 214, 0.38), inset 0 -2px 3px rgba(208, 218, 255, 0.32), 0 3px 10px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.05)"
                : "0 10px 36px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.85)",
            }}
          >
            {/* Borde perla mate (cálido arriba, frío abajo) */}
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={
                isStrip
                  ? {
                      background:
                        "linear-gradient(to bottom, rgba(255, 236, 226, 0.62) 0%, rgba(232, 242, 255, 0.28) 36%, rgba(255, 252, 245, 0.08) 48%, rgba(255, 252, 245, 0.08) 52%, rgba(226, 232, 255, 0.26) 64%, rgba(226, 224, 248, 0.58) 100%), linear-gradient(90deg, rgba(255, 226, 210, 0.34) 0%, rgba(255,255,255,0) 16%, rgba(255,255,255,0) 84%, rgba(214, 222, 255, 0.32) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(255,255,255,0.22)",
                      opacity: 0.88,
                    }
                  : {
                      padding: "11px",
                      background:
                        "linear-gradient(180deg, rgba(255, 246, 242, 0.78) 0%, rgba(232, 244, 255, 0.38) 42%, rgba(255, 248, 230, 0.32) 58%, rgba(236, 230, 255, 0.55) 100%), linear-gradient(90deg, rgba(255, 236, 220, 0.50) 0%, rgba(230, 244, 255, 0.12) 22%, rgba(255, 250, 240, 0.08) 50%, rgba(224, 236, 255, 0.14) 78%, rgba(236, 228, 255, 0.46) 100%), linear-gradient(135deg, rgba(255, 214, 228, 0.28), rgba(196, 226, 248, 0.22), rgba(255, 236, 196, 0.22), rgba(214, 206, 245, 0.22))",
                      WebkitMask:
                        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      maskComposite: "exclude",
                      mixBlendMode: "soft-light",
                      opacity: 0.92,
                    }
              }
            />
          </div>

          {/* CAPA 2: Resplandores de color dentro de un <svg> con filtro feTurbulence/feDisplacementMap aplicado DENTRO del <svg> */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none z-[2] transition-opacity duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ opacity: isStrip ? 1 : 0 }}
          >
            <svg
              viewBox={`0 0 ${totalInnerWidth} 22`}
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              className="w-full h-full block"
            >
              <defs>
                <filter
                  id="admin-dock-opal-refract"
                  x="-40%"
                  y="-80%"
                  width="180%"
                  height="260%"
                  colorInterpolationFilters="sRGB"
                >
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.016 0.09"
                    numOctaves="3"
                    seed="4"
                    result="noise"
                  />
                  <feGaussianBlur in="noise" stdDeviation="0.5" result="soft" />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="soft"
                    scale="6"
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="displaced"
                  />
                  <feGaussianBlur in="displaced" stdDeviation="1.6" />
                </filter>

                {svgBlooms.map((b) => (
                  <radialGradient
                    key={`grad-${b.id}`}
                    id={`admin-bloom-grad-${b.id}`}
                    cx="50%"
                    cy="50%"
                    r="50%"
                  >
                    <stop
                      offset="0%"
                      stopColor={b.glowCore}
                      stopOpacity={isGlowing ? "0.98" : "0.82"}
                    />
                    <stop
                      offset="46%"
                      stopColor={b.accent}
                      stopOpacity={isGlowing ? "0.62" : "0.42"}
                    />
                    <stop
                      offset="78%"
                      stopColor={b.accent}
                      stopOpacity={isGlowing ? "0.20" : "0.10"}
                    />
                    <stop offset="100%" stopColor={b.accent} stopOpacity="0" />
                  </radialGradient>
                ))}

                <linearGradient id="admin-strip-seam" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset="20%" stopColor="#ffffff" stopOpacity="0.16" />
                  <stop offset="50%" stopColor="#fffaf0" stopOpacity="0.26" />
                  <stop offset="80%" stopColor="#ffffff" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              <g filter="url(#admin-dock-opal-refract)">
                {svgBlooms.map((b) => (
                  <ellipse
                    key={`bloom-${b.id}`}
                    cx={b.cx}
                    cy={11}
                    rx={isGlowing ? 44 : 39}
                    ry={isGlowing ? 9.5 : 8}
                    fill={`url(#admin-bloom-grad-${b.id})`}
                    style={{
                      transition: "rx 200ms ease, ry 200ms ease, opacity 200ms ease",
                    }}
                  />
                ))}
              </g>

              {/* Costura suave central donde se funden los bordes opalescentes */}
              <rect
                x={24}
                y={9.5}
                width={Math.max(0, totalInnerWidth - 48)}
                height={3}
                rx={1.5}
                fill="url(#admin-strip-seam)"
              />
            </svg>
          </div>

          {/* Contenido del dock (iconos, etiquetas, submenús) */}
          <div
            className="relative z-[8] flex items-center justify-center gap-[2px] transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              opacity: isStrip ? 0 : 1,
              transform: isStrip ? "scaleY(0.35)" : "scaleY(1)",
              pointerEvents: isStrip ? "none" : "auto",
            }}
          >
            {/* Marca Lab OS */}
            <div
              className="flex flex-col items-center justify-center shrink-0 transition-[width] duration-[280ms] ease-out"
              style={{ width: `${itemW}px` }}
            >
              <span
                className="relative flex items-center justify-center bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.06)] overflow-hidden shrink-0 transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: showLabels ? "48px" : "52px",
                  height: showLabels ? "48px" : "52px",
                  borderRadius: showLabels ? "15px" : "16px",
                  transform: isHopping ? "translateY(-8px)" : "translateY(0)",
                }}
              >
                <img
                  src="/apple-touch-icon.png"
                  alt="Lab OS"
                  className="w-full h-full object-cover"
                />
              </span>
              {showLabels && (
                <span className="text-[12px] font-extrabold tracking-[-0.03em] whitespace-nowrap text-[#1e293b] leading-none mt-1">
                  <em className="not-italic text-[#D4AF37]">Lab</em> OS
                </span>
              )}
            </div>

            {/* Separador 1 */}
            <div className="w-px h-9 bg-slate-900/12 mx-[6px] shrink-0 self-center" />

            {/* Ítems de navegación */}
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname?.startsWith(item.href));
              const hasSubmenu = SUB_MENUS[item.href] !== undefined;
              const isSubmenuOpen = hoveredMenu === item.href && !isStrip;
              const isHovered = hoveredItem === item.id || isSubmenuOpen;

              const liftY = isHopping
                ? -8
                : isHovered
                ? showLabels
                  ? -8
                  : -10
                : 0;

              const highlighted = isHovered || isActive;

              return (
                <div
                  key={item.href}
                  style={{ width: `${itemW}px` }}
                  className="relative flex flex-col items-center justify-center transition-[width] duration-[280ms] ease-out"
                  onMouseEnter={() => {
                    setHoveredItem(item.id);
                    if (hasSubmenu) handleSubmenuEnter(item.href);
                  }}
                  onMouseLeave={() => {
                    setHoveredItem((prev) => (prev === item.id ? null : prev));
                    if (hasSubmenu) handleSubmenuLeave();
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={() => {
                      resetSubmenuAndHover();
                    }}
                    className="flex flex-col items-center justify-center w-full focus:outline-none"
                  >
                    <span
                      className="relative flex items-center justify-center shrink-0 transition-all duration-200 ease-out"
                      style={{
                        width: showLabels ? "48px" : "52px",
                        height: showLabels ? "48px" : "52px",
                        borderRadius: showLabels ? "15px" : "16px",
                        transform: `translateY(${liftY}px)`,
                        backgroundColor: highlighted ? item.tint : "#ffffff",
                        border: highlighted
                          ? `1px solid color-mix(in srgb, ${item.accent} 68%, transparent)`
                          : "1px solid #e2e8f0",
                        boxShadow: isHovered
                          ? `0 0 16px color-mix(in srgb, ${item.accent} 50%, transparent), 0 6px 14px color-mix(in srgb, ${item.accent} 18%, transparent)`
                          : isActive
                          ? `0 0 12px color-mix(in srgb, ${item.accent} 36%, transparent), 0 3px 8px color-mix(in srgb, ${item.accent} 14%, transparent)`
                          : "0 1px 2px rgba(15,23,42,0.06)",
                      }}
                    >
                      <Icon
                        size={showLabels ? 26 : 28}
                        strokeWidth={2}
                        style={{
                          color: item.accent,
                          transform:
                            isHovered && !showLabels ? "scale(1.08)" : "scale(1)",
                          filter: isHovered
                            ? `drop-shadow(0 0 6px ${item.accent})`
                            : "none",
                        }}
                        className="transition-all duration-200 ease-out shrink-0"
                      />

                      {item.badge > 0 && (
                        <span
                          className="absolute -top-[6px] -right-[8px] bg-[#ef4444] text-white text-[9px] font-extrabold leading-none min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center z-[2]"
                          style={{
                            boxShadow: "0 0 0 2px rgba(255,255,255,0.7)",
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </span>

                    {/* Nombre debajo del icono */}
                    <span
                      className="block text-center whitespace-nowrap pointer-events-none transition-all duration-200 ease-out"
                      style={
                        showLabels
                          ? {
                              opacity: 1,
                              transform: "translateY(0)",
                              height: "auto",
                              marginTop: "5px",
                              fontSize: "12px",
                              fontWeight: highlighted ? 800 : 600,
                              letterSpacing: "-0.02em",
                              color: highlighted ? item.strong : "#64748b",
                            }
                          : {
                              opacity: isHovered ? 1 : 0,
                              transform: isHovered
                                ? "translateY(0)"
                                : "translateY(-6px)",
                              height: isHovered ? "12px" : "0px",
                              marginTop: isHovered ? "2px" : "0px",
                              fontSize: "9px",
                              fontWeight: 700,
                              letterSpacing: "0.05em",
                              color: item.strong,
                              overflow: "hidden",
                            }
                      }
                    >
                      {item.label}
                    </span>
                  </Link>

                  {/* Submenú en burbuja hacia arriba */}
                  {hasSubmenu && (
                    <AnimatePresence>
                      {isSubmenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, x: "-50%" }}
                          animate={{ opacity: 1, y: 0, x: "-50%" }}
                          exit={{ opacity: 0, y: 8, x: "-50%" }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          onMouseEnter={() => {
                            pointerInsideRef.current = false;
                            handleSubmenuEnter(item.href);
                          }}
                          onMouseLeave={handleSubmenuLeave}
                          onPointerEnter={(e) => {
                            e.stopPropagation();
                            pointerInsideRef.current = false;
                            handleSubmenuEnter(item.href);
                          }}
                          onPointerMove={(e) => {
                            e.stopPropagation();
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                          }}
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.72)",
                            border: "1px solid rgba(255, 255, 255, 0.78)",
                            boxShadow:
                              "0 18px 44px rgba(15,23,42,0.16), 0 2px 6px rgba(15,23,42,0.06)",
                          }}
                          className="absolute bottom-[calc(100%+14px)] left-1/2 z-30 flex flex-col gap-[6px] p-[10px] rounded-[20px] min-w-[200px] backdrop-blur-[12px] backdrop-saturate-125 isolate transform-gpu after:content-[''] after:absolute after:inset-x-0 after:-bottom-4 after:h-4"
                        >
                          <span
                            aria-hidden="true"
                            className="absolute left-1/2 -bottom-[5px] w-[14px] h-[14px] -translate-x-1/2 rotate-45 pointer-events-none"
                            style={{
                              backgroundColor: "rgba(255, 255, 255, 0.90)",
                              borderRight: "1px solid rgba(255,255,255,0.95)",
                              borderBottom: "1px solid rgba(15,23,42,0.08)",
                              boxShadow: "2px 2px 6px rgba(15,23,42,0.06)",
                            }}
                          />
                          {SUB_MENUS[item.href].map((subItem, sIdx) => {
                            const isSubActive =
                              isActive &&
                              (activeTabParam === subItem.tab ||
                                (!activeTabParam && sIdx === 0));
                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                onClick={() => {
                                  handleSubmenuOptionClick(subItem.tab);
                                }}
                                className={`relative z-10 rounded-full px-[18px] py-[9px] text-[12px] font-bold text-center whitespace-nowrap transition-all duration-150 ${
                                  isSubActive
                                    ? "bg-[#fde078]/95 border border-[#d9a216]/45 text-[#1e293b]"
                                    : "bg-white/94 text-[#1e293b] border border-slate-900/[0.06] hover:bg-[#fde078]/90 hover:border-[#d9a216]/40"
                                } shadow-[0_1px_2px_rgba(15,23,42,0.04)]`}
                              >
                                {subItem.label}
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              );
            })}

            {/* Separador 2 */}
            <div className="w-px h-9 bg-slate-900/12 mx-[6px] shrink-0 self-center" />

            {/* Botón Salir */}
            <button
              type="button"
              onClick={handleLogout}
              onMouseEnter={() => setHoveredItem("salir")}
              onMouseLeave={() =>
                setHoveredItem((prev) => (prev === "salir" ? null : prev))
              }
              style={{ width: `${itemW}px` }}
              className="relative flex flex-col items-center justify-center cursor-pointer bg-transparent border-none transition-[width] duration-[280ms] ease-out focus:outline-none"
            >
              <span
                className="relative flex items-center justify-center shrink-0 transition-all duration-200 ease-out"
                style={{
                  width: showLabels ? "48px" : "52px",
                  height: showLabels ? "48px" : "52px",
                  borderRadius: showLabels ? "15px" : "16px",
                  transform: `translateY(${
                    isHopping
                      ? -8
                      : hoveredItem === "salir"
                      ? showLabels
                        ? -8
                        : -10
                      : 0
                  }px)`,
                  backgroundColor:
                    hoveredItem === "salir" ? "#f8fafc" : "#ffffff",
                  border:
                    hoveredItem === "salir"
                      ? "1px solid rgba(100, 116, 139, 0.65)"
                      : "1px solid #e2e8f0",
                  boxShadow:
                    hoveredItem === "salir"
                      ? "0 0 16px rgba(100, 116, 139, 0.45), 0 6px 14px rgba(100, 116, 139, 0.18)"
                      : "0 1px 2px rgba(15,23,42,0.06)",
                }}
              >
                <LogOut
                  size={showLabels ? 24 : 26}
                  strokeWidth={2}
                  className="text-[#475569] transition-all duration-200 ease-out shrink-0"
                  style={{
                    transform:
                      hoveredItem === "salir" && !showLabels
                        ? "scale(1.08)"
                        : "scale(1)",
                    filter:
                      hoveredItem === "salir"
                        ? "drop-shadow(0 0 6px #64748b)"
                        : "none",
                  }}
                />
              </span>

              <span
                className="block text-center whitespace-nowrap pointer-events-none transition-all duration-200 ease-out"
                style={
                  showLabels
                    ? {
                        opacity: 1,
                        transform: "translateY(0)",
                        height: "auto",
                        marginTop: "5px",
                        fontSize: "12px",
                        fontWeight: hoveredItem === "salir" ? 800 : 600,
                        letterSpacing: "-0.02em",
                        color:
                          hoveredItem === "salir" ? "#334155" : "#64748b",
                      }
                    : {
                        opacity: hoveredItem === "salir" ? 1 : 0,
                        transform:
                          hoveredItem === "salir"
                            ? "translateY(0)"
                            : "translateY(-6px)",
                        height: hoveredItem === "salir" ? "12px" : "0px",
                        marginTop: hoveredItem === "salir" ? "2px" : "0px",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        color: "#334155",
                        overflow: "hidden",
                      }
                }
              >
                Salir
              </span>
            </button>
          </div>

          {/* Círculo amarillo #ebb305 de 40px sobre la orilla derecha (mitad dentro / mitad fuera) */}
          <button
            type="button"
            onClick={handleToggleLabels}
            aria-label={
              showLabels
                ? "Ocultar nombres de la barra"
                : "Mostrar nombres de la barra"
            }
            title="Expandir o cerrar la barra"
            className="absolute top-1/2 right-0 w-10 h-10 rounded-full bg-[#ebb305] flex items-center justify-center z-20 cursor-pointer border-none p-0 transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              opacity: isStrip ? 0 : 1,
              pointerEvents: isStrip ? "none" : "auto",
              transform: isStrip
                ? "translate(50%, -50%) scale(0.15)"
                : "translate(50%, -50%) scale(1)",
              boxShadow:
                "0 2px 8px rgba(15,23,42,0.22), 0 1px 2px rgba(15,23,42,0.12), 0 0 0 2px rgba(255,255,255,0.55)",
            }}
          >
            <span
              aria-hidden="true"
              className="w-5 h-5 flex items-center justify-center text-white transition-transform duration-[280ms] ease-out"
              style={{
                transform: showLabels ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </button>
        </motion.nav>
      </div>
    </div>
  );
}
