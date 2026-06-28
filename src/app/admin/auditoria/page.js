"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle2, Clock, Eye, AlertTriangle, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { toast, Toaster } from "sonner";
import { getAuditAlerts, markAuditReviewed } from "@/app/actions/audit";
import GlassLayout from "@/components/admin/GlassLayout";

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
}

export default function AuditPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState({});

  const fetchAlerts = async () => {
    setLoading(true);
    const res = await getAuditAlerts();
    if (res.success) {
      setAlerts(res.alerts || []);
    } else {
      toast.error(res.error || "Error al cargar alertas");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkReviewed = async (id, e) => {
    if (e) e.stopPropagation();
    const toastId = toast.loading("Archivando...");
    const res = await markAuditReviewed(id);
    if (res.success) {
      toast.success("Alerta archivada", { id: toastId });
      setAlerts(alerts.filter(a => a.id !== id));
    } else {
      toast.error(res.error || "Error", { id: toastId });
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <GlassLayout
        title="Centro de Auditoría"
        subtitle="Monitoreo silencioso de cambios no guardados en facturación."
        icon={<ShieldAlert size={24} className="text-rose-500" />}
        iconBg="bg-rose-500/10 border-rose-500/20"
        scrollbarClass="audit-scroll"
        headerActions={
          <button 
            onClick={fetchAlerts} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Clock className="animate-spin" size={16} /> : <Clock size={16} />}
            Actualizar
          </button>
        }
        tableHeader={null}
      >
        <div className="w-full h-full pb-6 relative z-10 pt-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <CheckCircle2 className="mx-auto text-emerald-500 w-12 h-12 mb-3" />
              <h3 className="text-lg font-bold text-slate-800">Todo en orden</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                No hay alertas de edición sospechosa pendientes.
              </p>
            </div>
          ) : (
            <div className="space-y-3 audit-scroll overflow-y-auto">
              {alerts.map((alert) => {
                const snap = alert.snapshot_data || {};
                const isExpanded = expandedIds[alert.id];
                const displayTotal = snap.total || 0;

                return (
                  <div key={alert.id} className="bg-white/80 backdrop-blur-md rounded-xl border border-rose-200 shadow-sm overflow-hidden transition-all duration-200">
                    {/* Tarjeta Colapsada (Clickable) */}
                    <div 
                      onClick={() => toggleExpand(alert.id)}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-rose-100 p-2 rounded-lg">
                          <AlertTriangle size={18} className="text-rose-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-lg">
                              Caso #{alert.codigo_caso}
                            </span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                              Admin: {alert.admin_name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Clock size={12} />
                            {new Date(alert.creado_en).toLocaleString('es-MX')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-slate-500 font-medium">Total intentado</span>
                          <span className="font-bold text-rose-600">{formatCurrency(displayTotal)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </div>
                      </div>
                    </div>
                    
                    {/* Vista Expandida */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-2">
                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">Resumen Financiero</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <div className="text-xs text-slate-500 font-medium">Subtotal</div>
                              <div className="font-bold text-slate-700">{formatCurrency(snap.subtotal || 0)}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <div className="text-xs text-slate-500 font-medium">Descuento</div>
                              <div className="font-bold text-rose-500">
                                {snap.descuentoTipo === 'porcentaje' ? `${snap.descuento || snap.descuentoValor || 0}%` : formatCurrency(snap.descuento || snap.descuentoValor || snap.descuentoMonto || 0)}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <div className="text-xs text-slate-500 font-medium">IVA Aplicado</div>
                              <div className="font-bold text-slate-700">{snap.ivaAplicado || snap.aplicaIva ? 'SÍ' : 'NO'}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-rose-200 bg-rose-50/50">
                              <div className="text-xs text-rose-600 font-bold">Total Final</div>
                              <div className="font-black text-rose-700 text-lg">{formatCurrency(displayTotal)}</div>
                            </div>
                          </div>
                          
                          {snap.detalles && snap.detalles.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-bold text-slate-700 mb-2">Detalle de Productos Editados</h4>
                              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                  <thead className="bg-slate-100 text-slate-600 text-xs">
                                    <tr>
                                      <th className="px-3 py-2 font-medium">Cant.</th>
                                      <th className="px-3 py-2 font-medium">Producto</th>
                                      <th className="px-3 py-2 font-medium">Precio Unit.</th>
                                      <th className="px-3 py-2 font-medium">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {snap.detalles.map((d, i) => {
                                      const hasOriginal = d.precio_original !== undefined && d.precio_original !== null;
                                      const isPriceChanged = hasOriginal && Number(d.precio_original) !== Number(d.precio_unit);

                                      return (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                          <td className="px-3 py-2 text-slate-600">{d.unidades}</td>
                                          <td className="px-3 py-2 text-slate-800 font-medium">
                                            {d.producto}
                                            {d.dientes && <div className="text-[10px] text-slate-400 mt-0.5">Dientes: {d.dientes}</div>}
                                          </td>
                                          <td className="px-3 py-2 text-slate-600">
                                            {isPriceChanged ? (
                                              <div className="flex items-center gap-2">
                                                <span className="text-slate-400 line-through text-xs">{formatCurrency(d.precio_original)}</span>
                                                <span className="text-rose-600 font-bold">{formatCurrency(d.precio_unit)}</span>
                                              </div>
                                            ) : (
                                              <span>{formatCurrency(d.precio_unit)}</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-slate-800 font-bold">{formatCurrency((Number(d.unidades)||0) * (Number(d.precio_unit)||0))}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 flex justify-end gap-3 pt-3 border-t border-slate-200">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(alert.id);
                            }}
                            className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-semibold transition-colors"
                          >
                            Cerrar detalles
                          </button>
                          <button 
                            onClick={(e) => handleMarkReviewed(alert.id, e)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg text-sm font-bold transition-colors shadow-sm"
                          >
                            <CheckCircle2 size={16} />
                            Marcar como revisado
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassLayout>
    </>
  );
}
