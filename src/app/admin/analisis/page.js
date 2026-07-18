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
  ChevronUp,
  Search,
  Calendar,
  Filter,
  BarChart3
} from "lucide-react";
import { getMetricsData, getAnnualProductionMetrics } from "@/app/actions/admin-cases";
import { getActiveProductionCases } from "@/app/actions/billing";
import GlassLayout from "@/components/admin/GlassLayout";
import MaterialChart from "./MaterialChart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function MetricasPage() {
  const [timeFilter, setTimeFilter] = useState("30d");
  const [loading, setLoading] = useState(true);
  
  // Custom Filters
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Annual Chart Data
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [annualChartData, setAnnualChartData] = useState([]);
  const [annualLoading, setAnnualLoading] = useState(true);
  
  // States para datos
  const [topClinicas, setTopClinicas] = useState([]);
  const [topDoctores, setTopDoctores] = useState([]);
  const [clinicasChartData, setClinicasChartData] = useState([]);
  const [doctoresChartData, setDoctoresChartData] = useState([]);
  const [clinicasExpanded, setClinicasExpanded] = useState(false);
  const [doctoresExpanded, setDoctoresExpanded] = useState(false);
  const [materialData, setMaterialData] = useState([]);
  const [resumenFinanciero, setResumenFinanciero] = useState({ recaudado: 0, porCobrar: 0 });
  const [sumEnProceso, setSumEnProceso] = useState(0);

  useEffect(() => {
    const fetchProductionSum = async () => {
      try {
        const res = await getActiveProductionCases();
        if (res.success && res.cases) {
          const sum = res.cases.reduce((acc, c) => acc + Number(c.total_caso || 0), 0);
          setSumEnProceso(sum);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProductionSum();
  }, [refreshTrigger]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        const res = await getMetricsData(timeFilter, customStart, customEnd, searchQuery);
        if (!res.success) {
          throw new Error(res.error);
        }
        const { casosActuales, casosAnteriores } = res;

        // Filtrar casos para Clínicas y Doctores (solo pagados)
        const casosActualesPagados = (casosActuales || []).filter(c => c.estado_pago === 'Pagado');
        const casosAnterioresPagados = (casosAnteriores || []).filter(c => c.estado_pago === 'Pagado');

        // Filtrar casos para Materiales (todo excepto cancelados)
        const casosParaMateriales = (casosActuales || []).filter(c => c.estado !== 'Cancelado');

        // Procesar Clínicas Actuales (solo pagados)
        const clinicasMap = {};
        let totalRecaudado = 0;
        let totalPorCobrar = 0;

        casosActualesPagados.forEach(c => {
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

        // Procesar Clínicas Anteriores (solo pagados)
        casosAnterioresPagados.forEach(c => {
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

        // 2. TOP DOCTORES (solo pagados)
        const doctoresMap = {};
        casosActualesPagados.forEach(c => {
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

        // 3. DISTRIBUCIÓN POR ORIGEN (Digital vs Análogo) - incluye no pagados y activos
        const tipoCounts = { "Digital": 0, "Análogo": 0, "Otros": 0 };
        
        casosParaMateriales.forEach(c => {
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
  }, [timeFilter, refreshTrigger]);

  useEffect(() => {
    const fetchAnnualData = async () => {
      setAnnualLoading(true);
      try {
        const res = await getAnnualProductionMetrics(selectedYear);
        if (res.success) {
          setAnnualChartData(res.chartData);
        }
      } catch (err) {
        console.error(err);
      }
      setAnnualLoading(false);
    };
    fetchAnnualData();
  }, [selectedYear]);

  const formatCurrency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <GlassLayout
      title="Métricas y Análisis"
      subtitle="Productividad por clínica, doctor y materiales en el periodo seleccionado."
      icon={<BarChart3 size={24} className="text-purple-500" />}
      iconBg="bg-purple-500/10 border-purple-500/20"
      scrollbarClass="analisis-scroll"
      scrollbarColor="#8B5CF6"
      headerActions={
        <div className="relative group flex items-center justify-center pointer-events-auto">
          <div className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md cursor-help flex items-center gap-2 transition-all duration-300">
             Valor en proceso
             <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 -bottom-10 bg-slate-800 text-white text-xs px-3 py-1.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                ${sumEnProceso.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
             </span>
          </div>
        </div>
      }
    >
      <div className="space-y-6 pb-8 relative z-10 pt-4 pointer-events-auto">
        {/* FILTRO */}
        <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            {[{ id: '30d', label: 'Últ. 30 días' }, { id: '3m', label: 'Últ. 3 meses' }, { id: 'year', label: 'Este año' }, { id: 'custom', label: 'Personalizado' }].map(opt => (
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

        {timeFilter === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 mt-2">
            <div className="flex-1">
               <label className="text-xs font-bold text-slate-500 mb-1 block">Buscar por Folio/Paciente</label>
               <div className="relative">
                 <input 
                   type="text" 
                   placeholder="Ej. Juan Perez, 12345..." 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && setRefreshTrigger(prev => prev + 1)}
                 />
                 <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
               </div>
            </div>
            <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">Desde</label>
               <div className="relative">
                 <input 
                   type="date" 
                   className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                   value={customStart}
                   onChange={(e) => setCustomStart(e.target.value)}
                 />
                 <Calendar size={16} className="absolute left-3 top-2.5 text-slate-400" />
               </div>
            </div>
            <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">Hasta</label>
               <div className="relative">
                 <input 
                   type="date" 
                   className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                   value={customEnd}
                   onChange={(e) => setCustomEnd(e.target.value)}
                 />
                 <Calendar size={16} className="absolute left-3 top-2.5 text-slate-400" />
               </div>
            </div>
            <div className="flex items-end">
               <button onClick={() => setRefreshTrigger(prev => prev + 1)} className="w-full sm:w-auto px-6 py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white rounded-xl font-bold transition-colors shadow-sm">
                 Aplicar
               </button>
            </div>
          </div>
        )}
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
                <MaterialChart data={materialData} emptyMessage="No hay datos de materiales en este periodo" showLegend={false} valueType="units" />
                
                {/* Custom Legend */}
                {materialData.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {materialData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-slate-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                          <span className="text-slate-600 font-semibold truncate">{item.name}</span>
                        </div>
                        <span className="text-slate-900 font-bold flex-shrink-0">{item.value} u.</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* GRÁFICA ANUAL */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Ingresos Anuales del Laboratorio</h2>
                <p className="text-slate-500 text-sm mt-1">Total facturado por mes en el panorama general (suma de todos los trabajos de ese mes).</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500">Año:</label>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {[0, 1, 2].map(offset => {
                    const y = new Date().getFullYear() - offset;
                    return <option key={y} value={y.toString()}>{y}</option>
                  })}
                </select>
              </div>
            </div>

            {annualLoading ? (
              <div className="h-72 flex items-center justify-center text-slate-400">Cargando gráfica anual...</div>
            ) : annualChartData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-400">No hay datos para este año</div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annualChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748B', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748B', fontSize: 12 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F1F5F9' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
                              <p className="text-slate-500 text-xs font-bold mb-1">{payload[0].payload.name} {selectedYear}</p>
                              <p className="text-slate-800 font-bold flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></span>
                                {formatCurrency(payload[0].value)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="ingresos" 
                      radius={[4, 4, 0, 0]} 
                      barSize={40}
                    >
                      {
                        annualChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </GlassLayout>
  );
}
