"use client";

import { useState, useEffect, useRef } from "react";

/**
 * GlassLayout - A reusable component that implements the Sheet/Glass/Paper architecture.
 *
 * @param {string} title - Main title
 * @param {string} subtitle - Subtitle
 * @param {ReactNode} icon - Icon component (e.g. <Building2 size={24} />)
 * @param {string} iconColor - Icon color class (e.g. "text-green-500")
 * @param {string} iconBg - Icon background wrapper classes (e.g. "bg-green-500/10 border-green-500/20")
 * @param {ReactNode} headerActions - Buttons for the top right
 * @param {ReactNode} tabs - Optional tabs element
 * @param {ReactNode} tableHeader - The grid for the table header
 * @param {string} scrollbarClass - The custom scrollbar class (e.g. "crm-scroll", "casos-scroll")
 * @param {ReactNode} children - The rows/content
 */
export default function GlassLayout({
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-[#D4AF37]",
  iconBg = "bg-[#D4AF37]/10 border-[#D4AF37]/20",
  headerActions,
  tabs,
  subHeader,
  tableHeader,
  tableFooter,
  scrollbarClass = "facturacion-scroll",
  scrollbarColor = "#D4AF37",
  children
}) {
  const topSectionRef = useRef(null);
  const [topHeight, setTopHeight] = useState(200);

  const bottomSectionRef = useRef(null);
  const [bottomHeight, setBottomHeight] = useState(0);

  // Re-measure height when children change (e.g. tabs change)
  useEffect(() => {
    if (topSectionRef.current) {
      setTopHeight(topSectionRef.current.getBoundingClientRect().height);
    }
    if (bottomSectionRef.current) {
      setBottomHeight(bottomSectionRef.current.getBoundingClientRect().height);
    }
    
    const handleResize = () => {
      if (topSectionRef.current) {
        setTopHeight(topSectionRef.current.getBoundingClientRect().height);
      }
      if (bottomSectionRef.current) {
        setBottomHeight(bottomSectionRef.current.getBoundingClientRect().height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [children, tabs, subHeader, tableHeader, tableFooter]);

  return (
    <div className="flex-1 relative h-full w-full overflow-hidden bg-slate-50">
      
      {/* ESTILOS DINAMICOS PARA LA BARRA DE SCROLL */}
      <style dangerouslySetInnerHTML={{__html: `
        .${scrollbarClass} {
          scrollbar-width: thin;
          scrollbar-color: ${scrollbarColor} transparent;
        }
        .${scrollbarClass}::-webkit-scrollbar {
          width: 8px;
        }
        .${scrollbarClass}::-webkit-scrollbar-track {
          background: transparent;
        }
        .${scrollbarClass}::-webkit-scrollbar-thumb {
          background-color: ${scrollbarColor};
          border-radius: 20px;
        }
        /* Líneas horizontales de fondo debajo del vidrio */
        .glass-lines-bg {
          background-image: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 39px,
            rgba(0, 0, 0, 0.03) 40px
          );
          background-size: 100% 40px;
        }
      `}} />

      {/* LAYER 1: LA HOJA DE PAPEL (SCROLLING) */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden ${scrollbarClass} z-0 glass-lines-bg`}>
        <div style={{ paddingTop: `${topHeight}px`, paddingBottom: `calc(${bottomHeight}px + 2rem)` }} className="px-4 md:px-8 w-full flex flex-col relative z-10">
          {children}
        </div>
      </div>

      {/* LAYER 2: EL VIDRIO OPACO (ZONA FUERA DEL RECTANGULO) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
        {/* Top glass (cubre la cabecera) */}
        <div style={{ height: `${topHeight}px` }} className="bg-slate-50/15 backdrop-blur-[4px] w-full transition-all duration-300 border-b border-white/20" />
        
        {/* Middle section (cubre los lados izquierdo y derecho) */}
        <div className="flex-1 flex relative">
          <div className="w-4 md:w-8 bg-slate-50/15 backdrop-blur-[4px] h-full transition-all duration-300 border-r border-white/20" />
          <div className="flex-1 bg-transparent h-full shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]" /> {/* EL HUECO (CUTOUT) */}
          <div className="w-4 md:w-8 bg-slate-50/15 backdrop-blur-[4px] h-full transition-all duration-300 border-l border-white/20" />
        </div>
        
        {/* Bottom glass */}
        <div style={{ height: `max(1rem, ${bottomHeight}px)` }} className="bg-slate-50/15 backdrop-blur-[4px] w-full transition-all duration-300 border-t border-white/20" />
      </div>

      {/* LAYER 3: LOS PAPELES SOLIDOS (TÍTULOS, BOTONES Y CABECERAS DE TABLA) */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col">
        <div ref={topSectionRef} className="pointer-events-none flex flex-col pt-4 md:pt-8 px-4 md:px-8">
          
          {/* Título y Tabs - Papel Sólido (Solo las letras y botones) */}
          <div className="pointer-events-none pb-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  {Icon && (
                    <div className={`p-2 rounded-xl border pointer-events-auto ${iconBg}`}>
                      {Icon}
                    </div>
                  )}
                  <span className="pointer-events-auto">{title}</span>
                </h1>
                {subtitle && (
                  <p className="text-sm text-slate-500 mt-1 w-fit pr-2 pointer-events-auto">{subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-3 pointer-events-auto">
                {headerActions}
              </div>
            </div>

            {tabs && (
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 w-fit pointer-events-auto mb-4">
                {tabs}
              </div>
            )}
          </div>

          {subHeader && (
            <div className="pointer-events-none mb-4">
              {subHeader}
            </div>
          )}

          {/* Table Header - Papel Sólido */}
          {tableHeader && (
            <div className="pointer-events-auto bg-slate-50 border border-slate-200 rounded-t-2xl shadow-sm relative z-30">
              {tableHeader}
            </div>
          )}
        </div>

        {/* El Marco del Hueco (Bordes del rectángulo) */}
        <div className="flex-1 px-4 md:px-8 pointer-events-none relative flex flex-col">
          <div className="w-full flex-1 border-x border-slate-200 pointer-events-none relative z-30"></div>
          {!tableFooter && (
            <div className="w-full h-4 border-x border-b border-slate-200 rounded-b-2xl pointer-events-none relative z-30"></div>
          )}
        </div>
        
        {/* Table Footer - Papel Sólido */}
        <div ref={bottomSectionRef} className="pointer-events-none px-4 md:px-8 pb-4 md:pb-8">
          {tableFooter ? (
            <div className="pointer-events-auto bg-slate-50 border border-slate-200 rounded-b-2xl shadow-sm relative z-30">
              {tableFooter}
            </div>
          ) : (
            <div className="h-0" />
          )}
        </div>
      </div>
    </div>
  );
}
