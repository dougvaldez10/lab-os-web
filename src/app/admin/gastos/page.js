"use client";

import { useState, useEffect } from "react";
import { 
  DollarSign, 
  Calendar, 
  Search, 
  RefreshCw, 
  Plus, 
  X, 
  Save, 
  FileText, 
  UploadCloud, 
  TrendingDown, 
  Tag, 
  Trash2,
  PlusCircle,
  Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import GlassLayout from "@/components/admin/GlassLayout";
import { getGastos, registrarGasto, eliminarGasto } from "@/app/actions/gastos";

const categories = ["Materiales", "Servicios", "Renta", "Nómina", "Equipo", "Mantenimiento", "Otros"];

export default function GastosPanel() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  });

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [comprobanteModalUrl, setComprobanteModalUrl] = useState(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);

  // Form states for new expense
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("Materiales");
  const [proveedor, setProveedor] = useState("");
  const [fechaGasto, setFechaGasto] = useState(() => new Date().toISOString().split("T")[0]);
  const [comprobanteFile, setComprobanteFile] = useState(null);
  
  // Detail items for new expense
  const [detailItems, setDetailItems] = useState([]); // [{ descripcion, cantidad, precio_unitario }]
  const [newDetailDesc, setNewDetailDesc] = useState("");
  const [newDetailQty, setNewDetailQty] = useState("1");
  const [newDetailPrice, setNewDetailPrice] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getGastos({
        startDate,
        endDate,
        category: categoryFilter,
        provider: searchTerm
      });
      if (res.success) {
        setExpenses(res.expenses || []);
      } else {
        toast.error("Error al cargar gastos: " + res.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, categoryFilter, searchTerm]);

  // Handle adding detail item
  const handleAddDetailItem = () => {
    if (!newDetailDesc.trim() || !newDetailPrice) {
      toast.warning("Completa la descripción y el precio unitario.");
      return;
    }
    const qty = parseFloat(newDetailQty) || 1;
    const price = parseFloat(newDetailPrice) || 0;
    const newItem = {
      descripcion: newDetailDesc.trim(),
      cantidad: qty,
      precio_unitario: price,
      subtotal: qty * price
    };

    const updatedItems = [...detailItems, newItem];
    setDetailItems(updatedItems);
    
    // Auto-update total amount
    const total = updatedItems.reduce((acc, it) => acc + it.subtotal, 0);
    setMonto(String(total.toFixed(2)));

    // Reset detail form
    setNewDetailDesc("");
    setNewDetailQty("1");
    setNewDetailPrice("");
  };

  const handleRemoveDetailItem = (idx) => {
    const updatedItems = detailItems.filter((_, i) => i !== idx);
    setDetailItems(updatedItems);
    const total = updatedItems.reduce((acc, it) => acc + it.subtotal, 0);
    setMonto(total > 0 ? String(total.toFixed(2)) : "");
  };

  // Handle submit new expense
  const handleSubmitGasto = async (e) => {
    e.preventDefault();
    if (!concepto.trim() || !monto || parseFloat(monto) <= 0) {
      toast.error("El concepto y un monto válido son obligatorios.");
      return;
    }

    const toastId = toast.loading("Guardando egreso...");
    try {
      const fd = new FormData();
      fd.append("concepto", concepto.trim());
      fd.append("monto", monto);
      fd.append("tipo_producto", categoria);
      fd.append("proveedor", proveedor.trim() || "Genérico");
      fd.append("fecha", fechaGasto);
      if (comprobanteFile) {
        fd.append("comprobante", comprobanteFile);
      }
      if (detailItems.length > 0) {
        fd.append("items", JSON.stringify(detailItems));
      }

      const res = await registrarGasto(fd);
      if (res.success) {
        toast.success("Gasto registrado exitosamente", { id: toastId });
        setIsCreateOpen(false);
        // Reset form
        setConcepto("");
        setMonto("");
        setCategoria("Materiales");
        setProveedor("");
        setFechaGasto(new Date().toISOString().split("T")[0]);
        setComprobanteFile(null);
        setDetailItems([]);
        fetchData();
      } else {
        toast.error(res.error || "No se pudo guardar el gasto", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar el gasto", { id: toastId });
    }
  };

  // Handle delete expense
  const handleDeleteGasto = async (id, title) => {
    if (!window.confirm(`¿Seguro que deseas eliminar permanentemente el gasto "${title}"?`)) return;
    const toastId = toast.loading("Eliminando egreso...");
    try {
      const res = await eliminarGasto(id);
      if (res.success) {
        toast.success("Gasto eliminado correctamente", { id: toastId });
        fetchData();
      } else {
        toast.error(res.error || "No se pudo eliminar el gasto", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de servidor", { id: toastId });
    }
  };

  // Stats summaries
  const totalPeriodo = expenses.reduce((acc, e) => acc + (Number(e.monto) || 0), 0);
  
  // Calculate top category
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.tipo_producto] = (acc[e.tipo_producto] || 0) + (Number(e.monto) || 0);
    return acc;
  }, {});
  let topCategoryName = "Ninguna";
  let topCategoryAmount = 0;
  Object.keys(categoryTotals).forEach(cat => {
    if (categoryTotals[cat] > topCategoryAmount) {
      topCategoryAmount = categoryTotals[cat];
      topCategoryName = cat;
    }
  });

  return (
    <>
      <GlassLayout
        title="Control de Gastos"
        subtitle="Registro y auditoría de egresos, insumos y compras del laboratorio."
        icon={<TrendingDown size={24} className="text-red-400" />}
        iconBg="bg-red-500/10 border-red-500/20"
        scrollbarClass="gastos-scroll"
        scrollbarColor="#ef4444"
        headerActions={
          <>
            <button 
              onClick={() => setIsCreateOpen(true)} 
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm pointer-events-auto"
            >
              <Plus size={18} /> Registrar Gasto
            </button>
            <button 
              onClick={fetchData} 
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm pointer-events-auto"
            >
              <RefreshCw size={20} className={loading ? "animate-spin text-red-500" : ""} />
            </button>
          </>
        }
      >
        <div className="space-y-6 pb-8 relative z-10 pt-4 pointer-events-auto">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500" />
              <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                <DollarSign size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Egresos del Período</span>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
                  ${totalPeriodo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Suma total del rango de fechas activo.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400" />
              <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
                <Tag size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría Principal</span>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1 truncate max-w-[200px]">
                  {topCategoryName}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">${topCategoryAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} gastados.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-400" />
              <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                <Calendar size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gastos Registrados</span>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
                  {expenses.length}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Transacciones listadas en el período.</p>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por concepto o proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-400 outline-none transition-all text-slate-700"
                />
              </div>

              <div className="w-full md:w-56">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-400 outline-none text-slate-600 font-semibold cursor-pointer"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Desde</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none text-slate-600 font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Hasta</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none text-slate-600 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* List and Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {expenses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">No se encontraron gastos en este período.</div>
            ) : (
              <div className="divide-y divide-slate-100 flex flex-col">
                <div className="grid grid-cols-[110px_minmax(200px,2fr)_150px_130px_120px_100px_100px] gap-4 px-6 py-4 items-center bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  <div>Fecha</div>
                  <div>Concepto</div>
                  <div>Proveedor</div>
                  <div>Categoría</div>
                  <div>Monto</div>
                  <div className="text-center">Comprobante</div>
                  <div className="text-right">Acciones</div>
                </div>

                {expenses.map((e) => {
                  const isExpanded = expandedExpenseId === e.id;
                  return (
                    <div key={e.id} className="flex flex-col hover:bg-slate-50/30 transition-colors">
                      <div className="grid grid-cols-[110px_minmax(200px,2fr)_150px_130px_120px_100px_100px] gap-4 px-6 py-4 items-center text-sm">
                        <div className="text-slate-500 font-medium">{e.fecha}</div>
                        <div>
                          <div className="font-bold text-slate-800">{e.concepto}</div>
                          {e.detalles && e.detalles.length > 0 && (
                            <button 
                              onClick={() => setExpandedExpenseId(isExpanded ? null : e.id)}
                              className="text-[10px] text-red-600 hover:text-red-700 font-bold uppercase mt-1 tracking-wider block focus:outline-none"
                            >
                              {isExpanded ? "Ocultar desglose" : `Ver desglose (${e.detalles.length} items)`}
                            </button>
                          )}
                        </div>
                        <div className="text-slate-600 font-semibold">{e.proveedor}</div>
                        <div>
                          <span className="inline-flex bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                            {e.tipo_producto}
                          </span>
                        </div>
                        <div className="font-black text-rose-600">
                          -${Number(e.monto).toFixed(2)}
                        </div>
                        <div className="text-center">
                          {e.comprobante_url ? (
                            <button
                              onClick={() => setComprobanteModalUrl(e.comprobante_url)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all inline-flex cursor-pointer"
                              title="Ver comprobante"
                            >
                              <FileText size={16} />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300 italic">Ninguno</span>
                          )}
                        </div>
                        <div className="text-right">
                          <button
                            onClick={() => handleDeleteGasto(e.id, e.concepto)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all inline-flex cursor-pointer"
                            title="Eliminar gasto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Collapsible details breakdown */}
                      {isExpanded && e.detalles && (
                        <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex flex-col items-center">
                          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl p-4 shadow-inner">
                            <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Detalle de la compra:</h4>
                            <div className="space-y-2">
                              {e.detalles.map((det) => (
                                <div key={det.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                                  <div className="font-semibold text-slate-700">
                                    {det.cantidad}x {det.descripcion}
                                  </div>
                                  <div className="flex gap-4 items-center">
                                    <span className="text-slate-400">c/u: ${Number(det.precio_unitario).toFixed(2)}</span>
                                    <strong className="text-slate-800">${Number(det.subtotal).toFixed(2)}</strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </GlassLayout>

      {/* REGISTRAR GASTO MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-md" onClick={() => setIsCreateOpen(false)}></div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh]"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 -10px 40px -15px rgba(0, 0, 0, 0.1)' }}
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3 shrink-0">
                <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800">Registrar Gasto</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Captura egresos, insumos y compras del laboratorio.</p>
                </div>
                <button onClick={() => setIsCreateOpen(false)} className="ml-auto p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitGasto} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Concepto Principal</label>
                    <input
                      type="text"
                      placeholder="Ej. Compra de resinas, Renta, etc."
                      value={concepto}
                      onChange={(e) => setConcepto(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-400 outline-none transition-all text-slate-800 font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-400 outline-none text-slate-700 font-semibold cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Proveedor</label>
                    <input
                      type="text"
                      placeholder="Nombre del proveedor"
                      value={proveedor}
                      onChange={(e) => setProveedor(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-400 outline-none transition-all text-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</label>
                    <input
                      type="date"
                      value={fechaGasto}
                      onChange={(e) => setFechaGasto(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none text-slate-650 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto Total ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-400 outline-none transition-all text-rose-600 font-black"
                      required
                    />
                  </div>
                </div>

                {/* Subir Comprobante */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comprobante / Recibo (Opcional)</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-4 pb-4">
                        <UploadCloud size={24} className="text-slate-400 mb-1" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center px-2 truncate w-full">
                          {comprobanteFile ? comprobanteFile.name : "Seleccionar foto / PDF de factura"}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setComprobanteFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Breakdown List Section */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desglose de Ítems / Productos (Opcional)</h4>
                  
                  {/* Dynamic Items Input Row */}
                  <div className="flex flex-col md:flex-row gap-2.5 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex-1 space-y-1 w-full">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Descripción</span>
                      <input
                        type="text"
                        placeholder="Nombre o descripción del ítem"
                        value={newDetailDesc}
                        onChange={(e) => setNewDetailDesc(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-400 outline-none text-slate-700"
                      />
                    </div>
                    <div className="w-full md:w-20 space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Cantidad</span>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={newDetailQty}
                        onChange={(e) => setNewDetailQty(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-400 outline-none text-slate-700 font-bold text-center"
                      />
                    </div>
                    <div className="w-full md:w-28 space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Precio Unit.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={newDetailPrice}
                        onChange={(e) => setNewDetailPrice(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-400 outline-none text-slate-700 font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDetailItem}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200 shrink-0 inline-flex items-center justify-center cursor-pointer"
                      title="Agregar producto"
                    >
                      <PlusCircle size={16} />
                    </button>
                  </div>

                  {/* List of breakdown items */}
                  {detailItems.length > 0 && (
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white max-h-[150px] overflow-y-auto">
                      {detailItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center px-4 py-2.5 text-xs">
                          <div className="font-semibold text-slate-700">
                            {item.cantidad}x {item.descripcion}
                          </div>
                          <div className="flex gap-4 items-center">
                            <span className="text-slate-400">c/u: ${item.precio_unitario.toFixed(2)}</span>
                            <strong className="text-slate-800">${item.subtotal.toFixed(2)}</strong>
                            <button
                              type="button"
                              onClick={() => handleRemoveDetailItem(idx)}
                              className="text-red-500 hover:text-red-600 transition-colors p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Save size={14} />
                    Guardar Gasto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VISUALIZAR COMPROBANTE GASTO */}
      <AnimatePresence>
        {comprobanteModalUrl && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0f172a]/45 backdrop-blur-md" onClick={() => setComprobanteModalUrl(null)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="relative bg-white rounded-[24px] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <FileText size={20} className="text-red-500" />
                  Comprobante de Gasto
                </h3>
                <button onClick={() => setComprobanteModalUrl(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              
              <div className="p-6 flex items-center justify-center bg-slate-50 min-h-[300px]">
                {comprobanteModalUrl.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={comprobanteModalUrl} className="w-full h-[50vh] rounded-lg border border-slate-200" title="PDF Comprobante"></iframe>
                ) : (
                  <img src={comprobanteModalUrl} alt="Comprobante" className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-sm" />
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white">
                <button type="button" onClick={() => setComprobanteModalUrl(null)} className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Cerrar
                </button>
                <a 
                  href={comprobanteModalUrl} 
                  download 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5"
                >
                  Descargar
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Toaster position="top-right" richColors />
    </>
  );
}
