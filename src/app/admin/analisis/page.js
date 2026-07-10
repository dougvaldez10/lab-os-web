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
import { getMetricsData } from "@/app/actions/admin-cases";
import MaterialChart from "./MaterialChart";

export default function MetricasPage() {
  const [timeFilter, setTimeFilter] = useState("30d");
  const [loading, setLoading] = useState(true);
  
  // States para datos
  const [topClinicas, setTopClinicas] = useState([]);
  const [topDoctores, setTopDoctores] = useState([]);
  const [clinicasChartData, setClinicasChartData] = useState([]);
  const [doctoresChartData, setDoctoresChartData] = useState([]);
  const [materialData, setMaterialData] = useState([]);
  const [resumenFinanciero, setResumenFinanciero] = useState({ recaudado: 0, porCobrar: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        const res = await getMetricsData(timeFilter);
        if (!res.success) {
          throw new Error(res.error);
        }
        const { casosActuales, casosAnteriores } = res;

        // Procesar Clínicas Actuales
        const clinicasMap = {};
        let totalRecaudado = 0;
        let totalPorCobrar = 0;

        (casosActuales || []).forEach(c => {
          const cId = c.cliente_id;
          const nombre = c.clientes?.nombre || "Desconocido";
          const unidades = c.casos_detalle?.reduce((sum, det) => sum + (det.unidades || 1), 0) || 0;
          
          const pagoRecibido = (c.total_caso || 0) - (c.saldo_pendiente || 0);
          totalRecaudado += pagoRecibido;
          totalPorCobrar += (c.saldo_pendiente || 0);

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

        // Preparar gráfico de Clínicas (Top 5 + Otras)
        const top5Clinicas = topClinicasArr.slice(0, 5);
        const restClinicas = topClinicasArr.slice(5);
        const clinicasColors = ["#3B82F6", "#10B981", "#6366F1", "#8B5CF6", "#EC4899"];
        const cChartData = top5Clinicas.map((c, i) => ({
          name: c.nombre,
          value: c.unidades,
          color: clinicasColors[i % clinicasColors.length]
        }));
        if (restClinicas.length > 0) {
          const restUnidades = restClinicas.reduce((sum, c) => sum + c.unidades, 0);
          if (restUnidades > 0) {
            cChartData.push({
              name: "Otras",
              value: restUnidades,
              color: "#CBD5E1"
            });
          }
        }
        setClinicasChartData(cChartData);

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

        // Preparar gráfico de Doctores (Top 5 + Otros)
        const top5Doctores = topDoctoresArr.slice(0, 5);
        const restDoctores = topDoctoresArr.slice(5);
        const doctoresColors = ["#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#0EA5E9"];
        const dChartData = top5Doctores.map((d, i) => ({
          name: d.nombre,
          value: d.unidades,
          color: doctoresColors[i % doctoresColors.length]
        }));
        if (restDoctores.length > 0) {
          const restUnidades = restDoctores.reduce((sum, d) => sum + d.unidades, 0);
          if (restUnidades > 0) {
            dChartData.push({
              name: "Otros",
              value: restUnidades,
              color: "#CBD5E1"
            });
          }
        }
        setDoctoresChartData(dChartData);

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

    fetchData();
  }, [timeFilter]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* CLÍNICAS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Building2 size={16} />
                </div>
                <div>
                  <h2 className="text-md font-bold text-slate-800">Clínicas</h2>
                </div>
              </div>
              <div className="p-4 flex-1">
                <MaterialChart data={clinicasChartData} emptyMessage="Sin datos de clínicas en el periodo" />
              </div>
            </div>

            {/* DOCTORES */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <UserSquare2 size={16} />
                </div>
                <div>
                  <h2 className="text-md font-bold text-slate-800">Doctores</h2>
                </div>
              </div>
              <div className="p-4 flex-1">
                <MaterialChart data={doctoresChartData} emptyMessage="Sin datos de doctores en el periodo" />
              </div>
            </div>

            {/* DIGITAL VS ANÁLOGO */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <Layers size={16} />
                </div>
                <div>
                  <h2 className="text-md font-bold text-slate-800">Digital vs Análogo</h2>
                </div>
              </div>
              <div className="p-4 flex-1">
                <MaterialChart data={materialData} emptyMessage="No hay datos de materiales en este periodo" />
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
