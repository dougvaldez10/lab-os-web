"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle2, Clock, Eye, AlertTriangle } from "lucide-react";
import { toast, Toaster } from "sonner";
import { getAuditAlerts, markAuditReviewed } from "@/app/actions/audit";

export default function AuditPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleMarkReviewed = async (id) => {
    const toastId = toast.loading("Marcando como revisado...");
    const res = await markAuditReviewed(id);
    if (res.success) {
      toast.success("Alerta archivada", { id: toastId });
      fetchAlerts();
    } else {
      toast.error(res.error || "Error", { id: toastId });
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 overflow-y-auto">
      <Toaster position="bottom-right" />

      {/* Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-rose-500" size={28} />
            Centro de Auditoría (Sombra)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitoreo de intentos de edición o cambios de precios no guardados oficialmente.
          </p>
        </div>
        <button 
          onClick={fetchAlerts} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? <Clock className="animate-spin" size={16} /> : <Clock size={16} />}
          Actualizar
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-emerald-500 w-12 h-12 mb-3" />
            <h3 className="text-lg font-bold text-slate-800">Todo en orden</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              No hay alertas de edición sospechosa sin revisar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
                <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-500" />
                    <span className="font-bold text-rose-700">
                      Caso #{alert.codigo_caso}
                    </span>
                    <span className="text-xs text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md font-semibold ml-2">
                      Usuario: {alert.admin_name}
                    </span>
                  </div>
                  <div className="text-xs text-rose-500 font-medium flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(alert.creado_en).toLocaleString('es-MX')}
                  </div>
                </div>
                
                <div className="p-4">
                  <p className="text-sm text-slate-600 mb-3">
                    <strong>Evidencia capturada en pantalla (No guardada):</strong>
                  </p>
                  <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(alert.snapshot_data, null, 2)}
                  </pre>
                  
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={() => handleMarkReviewed(alert.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-sm font-bold transition-colors border border-emerald-200"
                    >
                      <Eye size={16} />
                      Marcar como revisado
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
