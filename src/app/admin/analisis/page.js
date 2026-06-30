"use client";

import { useState, useEffect } from "react";
import { 
  Wallet, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  AlertCircle,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import { getBillingStats } from "@/app/actions/billing";
import GlassLayout from "@/components/admin/GlassLayout";

export default function AnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCxC: 0,
    totalRecaudado: 0,
    methods: [],
    recentPayments: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getBillingStats();
      if (res.success) {
        setStats(res.stats);
      } else {
        toast.error("Error al cargar estadísticas: " + res.error);
      }
    } catch (err) {
      toast.error("Error inesperado al cargar datos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GlassLayout
        title="Métricas y Análisis Financiero"
        subtitle="Visualiza el rendimiento de la cobranza, ingresos y métodos de pago."
        icon={<BarChart3 size={24} className="text-purple-500" />}
        iconBg="bg-purple-500/10 border-purple-500/20"
        scrollbarClass="metricas-scroll"
        scrollbarColor="#c084fc"
        headerActions={
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm hover:rotate-180 transition-all duration-500 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? "animate-spin text-purple-500" : ""} />
          </button>
        }
        tableHeader={null}
      >
        <div className="w-full h-full pb-6 relative z-10 pt-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="animate-spin text-purple-500 w-8 h-8" />
              <p className="text-slate-500 font-medium text-sm">Consultando métricas en vivo...</p>
            </div>
          )}

          {!loading && (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-400 group-hover:bg-[#D4AF37] transition-colors" />
                    <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuentas por Cobrar</span>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
                        ${stats.totalCxC.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Suma de saldos pendientes en Facturación.</p>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-400 group-hover:bg-[#D4AF37] transition-colors" />
                    <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Recaudado</span>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
                        ${stats.totalRecaudado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Total de abonos registrados históricamente.</p>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-400 group-hover:bg-[#D4AF37] transition-colors" />
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasa de Cobro</span>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
                        {stats.totalRecaudado + stats.totalCxC > 0 ? (
                          ((stats.totalRecaudado / (stats.totalRecaudado + stats.totalCxC)) * 100).toFixed(1) + "%"
                        ) : (
                          "0.0%"
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Porcentaje de cartera de facturación liquidada.</p>
                    </div>
                  </div>
                </div>

                {/* Sub-grid: Recent payments and distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Recent Payments */}
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col max-h-[400px]">
                    <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Calendar size={16} className="text-[#D4AF37]" />
                      Abonos Recientes
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 metrics-scroll">
                      {stats.recentPayments.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-12">No se han registrado abonos recientes.</p>
                      ) : (
                        stats.recentPayments.map((p) => (
                          <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50/80 border border-slate-100 rounded-xl hover:border-amber-200 transition-colors">
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-700 truncate max-w-[120px]">{p.clinica}</span>
                                <span className="bg-slate-200 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-bold">Folio #{p.folio}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                <span>{p.metodo}</span>
                                <span>•</span>
                                <span>{p.fecha ? new Date(p.fecha).toLocaleDateString() : 'N/A'}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs text-slate-400 block font-medium">por {p.creado_por}</span>
                              <span className="text-sm font-black text-emerald-600">+${Number(p.monto).toFixed(2)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Payment Methods Breakdown */}
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <CreditCard size={16} className="text-[#D4AF37]" />
                        Desglose de Métodos de Pago
                      </h3>

                      <div className="space-y-4">
                        {stats.methods.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-12">Sin datos disponibles.</p>
                        ) : (
                          stats.methods.map((m) => {
                            const percent = stats.totalRecaudado > 0 ? (m.amount / stats.totalRecaudado) * 100 : 0;
                            return (
                              <div key={m.name} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-semibold text-slate-600">
                                  <span>{m.name}</span>
                                  <span>${m.amount.toLocaleString()} ({percent.toFixed(1)}%)</span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-amber-400 to-[#D4AF37] rounded-full"
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="mt-6 bg-slate-50/80 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Los montos desglosados arriba corresponden al monto real capturado en pesos mexicanos (MXN) en el momento del abono. Asegúrate de registrar correctamente la forma de pago (Efectivo/Transferencia) para fines de auditoría.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </GlassLayout>
    </>
  );
}
