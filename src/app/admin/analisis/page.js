"use client";

import { useState, useEffect } from "react";
import { 
  Building2, 
  UserSquare2, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ChevronDown,
  ChevronUp
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
  const [clinicasExpanded, setClinicasExpanded] = useState(false);
  const [doctoresExpanded, setDoctoresExpanded] = useState(false);
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
          const totalCaso = Number(c.total_caso) || 0;
          
          const pagoRecibido = (c.total_caso || 0) - (c.saldo_pendiente || 0);
          totalRecaudado += pagoRecibido;
          totalPorCobrar += (c.saldo_pendiente || 0);

          if (!clinicasMap[cId]) {
            clinicasMap[cId] = { id: cId, nombre, casos: 0, unidades: 0, ingresos: 0, anterior: 0 };
          }
          clinicasMap[cId].casos += 1;
          clinicasMap[cId].unidades += unidades;
          clinicasMap[cId].ingresos += totalCaso;
        });

        // Procesar Clínicas Anteriores
        (casosAnteriores || []).forEach(c => {
          const cId = c.cliente_id;
          const unidades = c.casos_detalle?.reduce((sum, det) => sum + (det.unidades || 1), 0) || 0;
          if (clinicasMap[cId]) {
            clinicasMap[cId].anterior += unidades;
          }
        });

        // Convertir a array, ordenar por ingresos y calcular %
        const topClinicasArr = Object.values(clinicasMap).sort((a, b) => b.ingresos - a.ingresos).map(c => {
          let diff = 0;
          if (c.anterior === 0 && c.unidades > 0) diff = 100;
          else if (c.anterior > 0) diff = ((c.unidades - c.anterior) / c.anterior) * 100;
          return { ...c, diff };
        });
        setTopClinicas(topClinicasArr);
        setResumenFinanciero({ recaudado: totalRecaudado, porCobrar: totalPorCobrar });

        // Preparar gráfico de Clínicas (Top 6 + Otras)
        const top6Clinicas = topClinicasArr.slice(0, 6);
        const restClinicas = topClinicasArr.slice(6);
        const clinicasColors = ["#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E"];
        const cChartData = top6Clinicas.map((c, i) => ({
          name: c.nombre,
          value: c.ingresos,
          unidades: c.unidades,
          color: clinicasColors[i % clinicasColors.length]
        }));
        if (restClinicas.length > 0) {
          const restIngresos = restClinicas.reduce((sum, c) => sum + c.ingresos, 0);
          const restUnidades = restClinicas.reduce((sum, c) => sum + c.unidades, 0);
          if (restIngresos > 0) {
            cChartData.push({
              name: `Otros (${restClinicas.length} más...)`,
              value: restIngresos,
              unidades: restUnidades,
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
          const totalCaso = Number(c.total_caso) || 0;
          
          if (!doctoresMap[docName]) doctoresMap[docName] = { nombre: docName, casos: 0, unidades: 0, ingresos: 0 };
          doctoresMap[docName].casos += 1;
          doctoresMap[docName].unidades += unidades;
          doctoresMap[docName].ingresos += totalCaso;
        });
        const topDoctoresArr = Object.values(doctoresMap).sort((a, b) => b.ingresos - a.ingresos);
        setTopDoctores(topDoctoresArr);

        // Preparar gráfico de Doctores (Top 6 + Otros)
        const top6Doctores = topDoctoresArr.slice(0, 6);
        const restDoctores = topDoctoresArr.slice(6);
        const doctoresColors = ["#10B981", "#8B5CF6", "#3B82F6", "#EF4444", "#F59E0B", "#EC4899"];
        const dChartData = top6Doctores.map((d, i) => ({
          name: d.nombre,
          value: d.ingresos,
          unidades: d.unidades,
          color: doctoresColors[i % doctoresColors.length]
        }));
        if (restDoctores.length > 0) {
          const restIngresos = restDoctores.reduce((sum, d) => sum + d.ingresos, 0);
          const restUnidades = restDoctores.reduce((sum, d) => sum + d.unidades, 0);
          if (restIngresos > 0) {
            dChartData.push({
              name: `Otros (${restDoctores.length} más...)`,
              value: restIngresos,
              unidades: restUnidades,
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            
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
                <MaterialChart data={clinicasChartData} emptyMessage="Sin datos de clínicas en el periodo" showLegend={false} valueType="currency" />
                
                {/* Custom Interactive Legend */}
                {clinicasChartData.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {clinicasChartData
                      .slice(0, clinicasExpanded ? clinicasChartData.length : 3)
                      .map((item, index) => (
                        <div 
                          key={index} 
                          title={`Ingresos: ${formatCurrency(item.value)}`}
                          className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-slate-50 rounded-lg transition-colors cursor-help"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                            <span className="text-slate-600 font-semibold truncate">{item.name}</span>
                          </div>
                          <span className="text-slate-900 font-bold flex-shrink-0">{item.unidades} u.</span>
                        </div>
                      ))}

                    {/* Show toggle button if there are more than 3 items */}
                    {clinicasChartData.length > 3 && (
                      <button 
                        onClick={() => setClinicasExpanded(!clinicasExpanded)}
                        className="w-full mt-2 py-1.5 text-xs font-bold text-[#D4AF37] hover:text-[#c49f30] flex items-center justify-center gap-1 transition-colors border-t border-slate-100"
                      >
                        {clinicasExpanded ? (
                          <>
                            Mostrar menos <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            Mostrar más <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
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
                <MaterialChart data={doctoresChartData} emptyMessage="Sin datos de doctores en el periodo" showLegend={false} valueType="currency" />
                
                {/* Custom Interactive Legend */}
                {doctoresChartData.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {doctoresChartData
                      .slice(0, doctoresExpanded ? doctoresChartData.length : 3)
                      .map((item, index) => (
                        <div 
                          key={index} 
                          title={`Ingresos: ${formatCurrency(item.value)}`}
                          className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-slate-50 rounded-lg transition-colors cursor-help"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                            <span className="text-slate-600 font-semibold truncate">{item.name}</span>
                          </div>
                          <span className="text-slate-900 font-bold flex-shrink-0">{item.unidades} u.</span>
                        </div>
                      ))}

                    {/* Show toggle button if there are more than 3 items */}
                    {doctoresChartData.length > 3 && (
                      <button 
                        onClick={() => setDoctoresExpanded(!doctoresExpanded)}
                        className="w-full mt-2 py-1.5 text-xs font-bold text-[#D4AF37] hover:text-[#c49f30] flex items-center justify-center gap-1 transition-colors border-t border-slate-100"
                      >
                        {doctoresExpanded ? (
                          <>
                            Mostrar menos <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            Mostrar más <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
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
                <MaterialChart data={materialData} emptyMessage="No hay datos de materiales en este periodo" showLegend={true} />
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
