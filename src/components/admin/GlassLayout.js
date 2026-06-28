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
  tableHeader,
  scrollbarClass = "crm-scroll",
  children
}) {
  const topSectionRef = useRef(null);
  const [topHeight, setTopHeight] = useState(200);

  // Re-measure height when children change (e.g. tabs change)
  useEffect(() => {
    if (topSectionRef.current) {
      setTopHeight(topSectionRef.current.getBoundingClientRect().height);
    }
    
    const handleResize = () => {
      if (topSectionRef.current) {
        setTopHeight(topSectionRef.current.getBoundingClientRect().height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [children, tabs, tableHeader]);

  return (
    <div className="flex-1 relative h-full w-full overflow-hidden bg-slate-50">
      
      {/* LAYER 1: LA HOJA DE PAPEL (SCROLLING) */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden ${scrollbarClass} z-0`}>
        <div style={{ paddingTop: `${topHeight}px` }} className="px-4 md:px-8 pb-24 w-full flex flex-col">
          {children}
        </div>
      </div>

      {/* LAYER 2: EL VIDRIO OPACO (ZONA FUERA DEL RECTANGULO) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
        {/* Top glass (cubre la cabecera) */}
        <div style={{ height: `${topHeight}px` }} className="bg-slate-50/30 backdrop-blur-sm w-full transition-all duration-300" />
        
        {/* Middle section (cubre los lados izquierdo y derecho) */}
        <div className="flex-1 flex">
          <div className="w-4 md:w-8 bg-slate-50/30 backdrop-blur-sm h-full transition-all duration-300" />
          <div className="flex-1 bg-transparent h-full" /> {/* EL HUECO (CUTOUT) */}
          <div className="w-4 md:w-8 bg-slate-50/30 backdrop-blur-sm h-full transition-all duration-300" />
        </div>
        
        {/* Bottom glass */}
        <div className="h-4 md:h-8 bg-slate-50/30 backdrop-blur-sm w-full transition-all duration-300" />
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

          {/* Table Header - Papel Sólido */}
          <div className="pointer-events-auto bg-slate-50 border border-slate-200 rounded-t-2xl shadow-sm relative z-30">
            {tableHeader}
          </div>
        </div>

        {/* El Marco del Hueco (Bordes del rectángulo) */}
        <div className="flex-1 px-4 md:px-8 pb-4 md:pb-8 pointer-events-none">
          <div className="w-full h-full border-x border-b border-slate-200 rounded-b-2xl pointer-events-none relative z-30"></div>
        </div>
      </div>
    </div>
  );
}
