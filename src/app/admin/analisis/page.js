"use client";

import { useState, useEffect } from "react";
import { 
  Building2, 
  UserSquare2, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Minus,
  Wallet
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import MaterialChart from "./MaterialChart";

export default function MetricasPage() {
  const [timeFilter, setTimeFilter] = useState("30d");
  const [loading, setLoading] = useState(true);
  
  // States para datos
  const [topClinicas, setTopClinicas] = useState([]);
  const [topDoctores, setTopDoctores] = useState([]);
  const [materialData, setMaterialData] = useState([]);
  const [resumenFinanciero, setResumenFinanciero] = useState({ recaudado: 0, porCobrar: 0 });

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  const fetchData = async () => {
    setLoading(true);
    
    // Configurar fechas según filtro
    const now = new Date();
    let fechaInicioActual = new Date();
    let fechaInicioAnterior = new Date();
    let fechaFinAnterior = new Date();

    if (timeFilter === "30d") {
      fechaInicioActual.setDate(now.getDate() - 30);
      fechaInicioAnterior.setDate(now.getDate() - 60);
      fechaFinAnterior.setDate(now.getDate() - 30);
    } else if (timeFilter === "3m") {
      fechaInicioActual.setMonth(now.getMonth() - 3);
      fechaInicioAnterior.setMonth(now.getMonth() - 6);
      fechaFinAnterior.setMonth(now.getMonth() - 3);
    } else if (timeFilter === "year") {
      fechaInicioActual = new Date(now.getFullYear(), 0, 1);
      fechaInicioAnterior = new Date(now.getFullYear() - 1, 0, 1);
      fechaFinAnterior = new Date(now.getFullYear() - 1, 11, 31);
    }

    const isoActualStart = fechaInicioActual.toISOString();
    const isoActualEnd = now.toISOString();
    const isoPrevStart = fechaInicioAnterior.toISOString();
    const isoPrevEnd = fechaFinAnterior.toISOString();

    try {
      // 1. TOP CLÍNICAS - Periodo Actual
      const { data: casosActuales } = await supabase
        .from('casos_master')
        .select('cliente_id, monto_total, pago_recibido, tipo, clientes(nombre), casos_detalle(unidades)')
        .gte('fecha_ingreso', isoActualStart)
        .lte('fecha_ingreso', isoActualEnd);

      // 1b. TOP CLÍNICAS - Periodo Anterior
      const { data: casosAnteriores } = await supabase
        .from('casos_master')
        .select('cliente_id, casos_detalle(unidades)')
        .gte('fecha_ingreso', isoPrevStart)
        .lte('fecha_ingreso', isoPrevEnd);

      // Procesar Clínicas Actuales
      const clinicasMap = {};
      let totalRecaudado = 0;
      let totalPorCobrar = 0;

      (casosActuales || []).forEach(c => {
        const cId = c.cliente_id;
        const nombre = c.clientes?.nombre || "Desconocido";
        const unidades = c.casos_detalle?.reduce((sum, det) => sum + (det.unidades || 1), 0) || 0;
        
        totalRecaudado += (c.pago_recibido || 0);
        totalPorCobrar += ((c.monto_total || 0) - (c.pago_recibido || 0));

        if (!clinicasMap[cId]) {
          clinicasMap[cId] = { id: cId, nombre, casos: 0, unidades: 0, anterior: 0 };
        }
        clinicasMap[cId].casos += 1;
        clinicasMap[cId].unidades += unidades;
      });

      // Procesar Clínicas Anteriores
      (casosAnteriores || []).forEach(c => {
        const cId = c.cliente_id;
        const unidades = c.casos_detalle?.reduce((sum, det) => sum + (det.unidades || 1), 0) || 0;
        if (clinicasMap[cId]) {
          clinicasMap[cId].anterior += unidades;
        }
      });

      // Convertir a array, ordenar y calcular %
      const topClinicasArr = Object.values(clinicasMap).sort((a, b) => b.unidades - a.unidades).map(c => {
        let diff = 0;
        if (c.anterior === 0 && c.unidades > 0) diff = 100;
        else if (c.anterior > 0) diff = ((c.unidades - c.anterior) / c.anterior) * 100;
        return { ...c, diff };
      });
      setTopClinicas(topClinicasArr);
      setResumenFinanciero({ recaudado: totalRecaudado, porCobrar: totalPorCobrar });

      // 2. TOP DOCTORES
      const doctoresMap = {};
      (casosActuales || []).forEach(c => {
        const docName = c.doctor || "Sin doctor asignado";
        const unidades = c.casos_detalle?.reduce((sum, det) => sum + (det.unidades || 1), 0) || 0;
        
        if (!doctoresMap[docName]) doctoresMap[docName] = { nombre: docName, casos: 0, unidades: 0 };
        doctoresMap[docName].casos += 1;
        doctoresMap[docName].unidades += unidades;
      });
      const topDoctoresArr = Object.values(doctoresMap).sort((a, b) => b.unidades - a.unidades);
      setTopDoctores(topDoctoresArr);

      // 3. DISTRIBUCIÓN POR ORIGEN (Digital vs Análogo)
      const tipoCounts = { "Digital": 0, "Análogo": 0, "Otros": 0 };
      
      (casosActuales || []).forEach(c => {
        const tipoStr = (c.tipo || "").toLowerCase();
        const unidades = c.casos_detalle?.reduce((sum, det) => sum + (det.unidades || 1), 0) || 0;
        
        if (tipoStr.includes("digital")) tipoCounts["Digital"] += unidades;
        else if (tipoStr.includes("fisico") || tipoStr.includes("análogo") || tipoStr.includes("analogo")) tipoCounts["Análogo"] += unidades;
        else tipoCounts["Otros"] += unidades;
      });

      const colors = {
        "Digital": "#3B82F6", // blue-500
        "Análogo": "#D4AF37", // Dorado/Amarillo
        "Otros": "#CBD5E1"    // slate-300
      };

      const chartData = Object.keys(tipoCounts)
        .filter(k => tipoCounts[k] > 0)
        .map(k => ({ name: k, value: tipoCounts[k], color: colors[k] }));
        
      setMaterialData(chartData.sort((a, b) => b.value - a.value));

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER Y FILTRO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Métricas y Análisis</h1>
          <p className="text-slate-500 text-sm mt-1">
            Productividad por clínica, doctor y materiales en el periodo seleccionado.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {[{ id: '30d', label: 'Últ. 30 días' }, { id: '3m', label: 'Últ. 3 meses' }, { id: 'year', label: 'Este año' }].map(opt => (
            <button
              key={opt.id}
              onClick={() => setTimeFilter(opt.id)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeFilter === opt.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-medium">Cargando métricas...</div>
      ) : (
        <>
          {/* TOP SECTIONS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* TOP CLÍNICAS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Top Clínicas</h2>
                  <p className="text-xs text-slate-500">Por unidades producidas</p>
                </div>
              </div>
              <div className="p-0 flex-1">
                {topClinicas.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">Sin datos en el periodo</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {topClinicas.slice(0, 10).map((cli, i) => (
                      <li key={cli.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 font-bold text-sm w-5">{i + 1}.</span>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{cli.nombre}</p>
                            <p className="text-xs text-slate-500">{cli.casos} casos</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-slate-900 text-sm">{cli.unidades} u.</span>
                            {cli.diff > 0 ? (
                              <div className="flex items-center text-emerald-600 text-xs font-bold" title={`+ ${cli.diff.toFixed(1)}% vs anterior`}>
                                <TrendingUp size={12} className="mr-0.5"/> {Math.abs(cli.diff).toFixed(0)}%
                              </div>
                            ) : cli.diff < 0 ? (
                              <div className="flex items-center text-red-500 text-xs font-bold" title={`- ${Math.abs(cli.diff).toFixed(1)}% vs anterior`}>
                                <TrendingDown size={12} className="mr-0.5"/> {Math.abs(cli.diff).toFixed(0)}%
                              </div>
                            ) : (
                              <div className="flex items-center text-slate-400 text-xs font-bold" title="Sin cambio">
                                <Minus size={12} className="mr-0.5"/> 0%
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN (Doctores + Materiales) */}
            <div className="flex flex-col gap-6">
              
              {/* TOP DOCTORES */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <UserSquare2 size={16} />
                  </div>
                  <h2 className="text-md font-bold text-slate-800">Top Doctores</h2>
                </div>
                <div className="p-0">
                  {topDoctores.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Sin datos en el periodo</div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {topDoctores.slice(0, 5).map((doc, i) => (
                        <li key={i} className="p-3 px-5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                          <p className="font-bold text-slate-700 text-sm">{doc.nombre}</p>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 text-sm">{doc.unidades} u.</span>
                            <span className="text-xs text-slate-400 ml-2">({doc.casos} casos)</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* ORIGEN (Digital vs Analogo) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                    <Layers size={16} />
                  </div>
                  <h2 className="text-md font-bold text-slate-800">Distribución Digital vs Análogo</h2>
                </div>
                <div className="p-4 flex-1">
                  <MaterialChart data={materialData} />
                </div>
              </div>

            </div>
          </div>

          {/* RESUMEN FINANCIERO (Secundario) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800">Total Recaudado (Periodo)</p>
                <p className="text-2xl font-black text-emerald-900 mt-1">{formatCurrency(resumenFinanciero.recaudado)}</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-sm">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600">Cuentas por Cobrar</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(resumenFinanciero.porCobrar)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
