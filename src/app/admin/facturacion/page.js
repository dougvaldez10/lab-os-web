"use client";

import { useState, useEffect } from "react";
import { 
  Wallet, 
  History, 
  ChevronRight, 
  Search, 
  RefreshCw, 
  ArrowLeft, 
  DollarSign, 
  User, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  PlusCircle, 
  TrendingUp, 
  Building2, 
  FileText,
  AlertCircle,
  X,
  UploadCloud,
  Edit
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { 
  getBillingSummary, 
  getBillingHistory, 
  registrarAbono,
  registerGlobalPayment
} from "@/app/actions/billing";
import { getAllClinics } from "@/app/actions/clients";
import { toggleCaseIVA } from "@/app/actions/cases";
import EditCaseModal from "./EditCaseModal";

export default function BillingPanel() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState("cxc"); // cxc, history, analytics
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [adminName, setAdminName] = useState("");

  // States for CxC
  const [clinics, setClinics] = useState([]);
  const [allClinics, setAllClinics] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null); // Level 2 selection
  const [searchTerm, setSearchTerm] = useState("");

  // States for History
  const [historyCases, setHistoryCases] = useState([]);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [expandedCaseId, setExpandedCaseId] = useState(null);

  // Modals state
  const [abonoModal, setAbonoModal] = useState(null);
  const [globalAbonoModal, setGlobalAbonoModal] = useState(false);
  const [editModalCase, setEditModalCase] = useState(null);

  // Form states for Single Payment (Abono)
  const [montoAbono, setMontoAbono] = useState("");
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [submittingAbono, setSubmittingAbono] = useState(false);

  // Form states for Global Payment
  const [isGlobalPaymentOpen, setIsGlobalPaymentOpen] = useState(false);
  const [globalClienteId, setGlobalClienteId] = useState("");
  const [globalMonto, setGlobalMonto] = useState("");
  const [globalMetodo, setGlobalMetodo] = useState("Transferencia");
  const [globalComprobante, setGlobalComprobante] = useState(null);
  const [globalPickerSearch, setGlobalPickerSearch] = useState("");
  const [globalPickerOpen, setGlobalPickerOpen] = useState(false);
  const [submittingGlobal, setSubmittingGlobal] = useState(false);

  // Stats for analytics
  const [stats, setStats] = useState({ totalCxC: 0, totalRecaudado: 0, recentPayments: [], methods: [] });

  // Fetch current user and main data
  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) {
        setCurrentUser(user);
        setAdminName(user.username || "");
      }
    });
    fetchData();
  }, [activeTab]);

  // Manejar el boton "Atras" del navegador o mouse
  useEffect(() => {
    const handlePopState = (e) => {
      if (!e.state || !e.state.clinicSelected) {
        setSelectedClinic(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectClinic = (cli) => {
    setSelectedClinic(cli);
    window.history.pushState({ clinicSelected: true }, "", window.location.pathname + "?clinic=" + cli.id);
  };

  const handleBackToClinics = () => {
    setSelectedClinic(null);
    if (window.history.state && window.history.state.clinicSelected) {
       window.history.back();
    } else {
       window.history.pushState(null, "", window.location.pathname);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const allRes = await getAllClinics();
      if (allRes) setAllClinics(allRes);

      if (activeTab === "cxc") {
        const res = await getBillingSummary();
        if (res.success) {
          setClinics(res.clinics || []);
          setCases(res.cases || []);
        } else {
          toast.error("Error al cargar cuentas por cobrar: " + res.error);
        }
      } else if (activeTab === "history") {
        const res = await getBillingHistory();
        if (res.success) {
          setHistoryCases(res.cases || []);
        } else {
          toast.error("Error al cargar historial: " + res.error);
        }
      }
    } catch (err) {
      toast.error("Error inesperado al cargar datos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAbono = (c) => {
    setAbonoModal(c);
    setMontoAbono(String(c.saldo_pendiente));
    setMetodoPago("Transferencia");
    if (currentUser) {
      setAdminName(currentUser.username || "");
    }
  };

  const handleOpenEdit = (c) => {
    setEditModalCase(c);
  };

  const handleToggleIVA = async (c, isChecked) => {
    const toastId = toast.loading(isChecked ? "Aplicando IVA..." : "Removiendo IVA...");
    try {
      const res = await toggleCaseIVA(c.id, isChecked);
      if (res.success) {
        toast.success(isChecked ? "IVA aplicado al caso" : "IVA removido", { id: toastId });
        setCases(prev => prev.map(item => {
          if (item.id === c.id) {
            return { ...item, iva_aplicado: isChecked, total_caso: res.newTotal, saldo_pendiente: res.newSaldo };
          }
          return item;
        }));
      } else {
        toast.error("Error al actualizar IVA: " + res.error, { id: toastId });
      }
    } catch (err) {
      toast.error("Error de red", { id: toastId });
    }
  };

  const handleRegisterAbono = async (e) => {
    e.preventDefault();
    if (!abonoModal) return;
    
    const abonoVal = parseFloat(montoAbono);
    if (isNaN(abonoVal) || abonoVal <= 0) {
      toast.error("Por favor ingresa un monto válido mayor a 0");
      return;
    }

    if (abonoVal > abonoModal.saldo_pendiente) {
      if (!window.confirm(`El monto ingresado ($${abonoVal}) es mayor que el saldo pendiente del caso ($${abonoModal.saldo_pendiente}). ¿Deseas registrar un saldo a favor o prefieres ajustar el abono al total del saldo pendiente?`)) {
        return;
      }
    }

    setSubmittingAbono(true);
    const toastId = toast.loading("Registrando abono...");
    
    try {
      const res = await registrarAbono({
        id_caso: abonoModal.id,
        monto_abono: abonoVal,
        metodo_pago: metodoPago,
        admin_name: adminName || "Admin"
      });

      if (res.success) {
        toast.success("Abono registrado correctamente", { id: toastId });
        setAbonoModal(null);
        // Refrescar datos
        fetchData();
        // Si teníamos una clínica seleccionada en drill-down, actualizar su balance o datos
        if (selectedClinic) {
          // Si el caso actual se liquidó por completo, y ya no hay casos pendientes para esta clínica
          // opcionalmente podemos refrescar. El fetchData actualizará las listas
          // Buscar si la clínica seleccionada aún tiene casos pendientes.
          const updatedSummary = await getBillingSummary();
          if (updatedSummary.success) {
            setClinics(updatedSummary.clinics || []);
            setCases(updatedSummary.cases || []);
            const stillExists = updatedSummary.clinics.find(cl => cl.id === selectedClinic.id);
            if (!stillExists) {
              setSelectedClinic(null); // Regresa a Nivel 1 si ya no tiene deuda
            } else {
              setSelectedClinic(stillExists);
            }
          }
        }
      } else {
        toast.error(res.error || "No se pudo registrar el abono", { id: toastId });
      }
    } catch (err) {
      toast.error("Error al procesar la solicitud", { id: toastId });
      console.error(err);
    } finally {
      setSubmittingAbono(false);
    }
  };

  const handleRegisterGlobalPayment = async (e) => {
    e.preventDefault();
    if (!globalClienteId) {
      toast.error("Por favor selecciona una clínica");
      return;
    }
    const montoVal = parseFloat(globalMonto);
    if (isNaN(montoVal) || montoVal <= 0) {
      toast.error("Por favor ingresa un monto válido mayor a 0");
      return;
    }

    setSubmittingGlobal(true);
    const toastId = toast.loading("Procesando pago global FIFO...");

    try {
      const fd = new FormData();
      fd.append('cliente_id', String(globalClienteId));
      fd.append('monto_abono', String(montoVal));
      fd.append('metodo_pago', globalMetodo);
      fd.append('admin_name', adminName || "Admin");
      if (globalComprobante) {
        fd.append('comprobante', globalComprobante);
      }

      const res = await registerGlobalPayment(fd);
      if (res.success) {
        toast.success(`Pago registrado. Se saldaron ${res.casosSaldadosCount} casos automáticamente.`, { 
          id: toastId,
          duration: 5000 
        });
        setIsGlobalPaymentOpen(false);
        setGlobalClienteId("");
        setGlobalMonto("");
        setGlobalComprobante(null);
        fetchData();
      } else {
        toast.error(res.error || "Error al registrar el pago global", { id: toastId });
      }
    } catch (err) {
      toast.error("Error inesperado al registrar el pago", { id: toastId });
      console.error(err);
    } finally {
      setSubmittingGlobal(false);
    }
  };

  // Global picker searches through ALL clinics
  const filteredPickerClinics = allClinics.filter(cl => 
    cl.nombre.toLowerCase().includes(globalPickerSearch.toLowerCase())
  );

  // Filtrado de Clínicas (CxC Nivel 1)
  const filteredClinics = clinics.filter(cl => 
    cl.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Casos de la clínica seleccionada (CxC Nivel 2)
  const selectedClinicCases = cases.filter(c => c.cliente_id === selectedClinic?.id);

  // Filtrado de Historial
  const filteredHistory = historyCases.filter(c => 
    c.codigo.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
    c.paciente.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
    c.clientes?.nombre.toLowerCase().includes(historySearchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 overflow-y-auto">
      <Toaster position="bottom-right" />

      {/* Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Wallet className="text-[#D4AF37]" size={28} />
            Módulo Financiero y Facturación
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración de cuentas por cobrar, registro de abonos y control de historial de pagos.
          </p>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-amber-500" : ""} />
          Actualizar Datos
        </button>
      </div>

      {/* Tabs Navigation (Framer Motion) */}
      <div className="flex border-b border-slate-200 mb-6 shrink-0 relative p-1 bg-slate-200/50 rounded-xl max-w-md">
        {[
          { id: "cxc", label: "Cuentas por Cobrar", icon: Wallet },
          { id: "history", label: "Historial de Pagos", icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedClinic(null); // Reset Level 2 CxC on tab change
              }}
              className={`flex-1 relative flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-colors duration-200 ${
                isActive ? "text-slate-900 z-10" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={16} className={isActive ? "text-[#D4AF37]" : ""} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 min-h-0">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="animate-spin text-[#D4AF37] w-8 h-8" />
            <p className="text-slate-500 font-medium text-sm">Consultando base de datos en vivo...</p>
          </div>
        )}

        {!loading && (
          <AnimatePresence mode="wait">
            {/* PESTAÑA 1: CUENTAS POR COBRAR (CxC) */}
            {activeTab === "cxc" && (
              <motion.div
                key="cxc-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                {/* CxC - Nivel 1: Resumen de Clínicas */}
                {!selectedClinic ? (
                  <div className="flex-1 flex flex-col">
                    {/* Buscador y Botón de Pago Global */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-4 shrink-0">
                      <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Buscar clínica con deuda..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none shadow-sm transition-all"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setIsGlobalPaymentOpen(true);
                          setGlobalClienteId("");
                          setGlobalMonto("");
                          setGlobalComprobante(null);
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 via-[#D4AF37] to-amber-500 hover:from-[#B8860B] hover:to-[#D4AF37] text-white rounded-xl text-sm font-black transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95 duration-200 cursor-pointer"
                      >
                        <PlusCircle size={18} />
                        Registrar Pago Global
                      </button>
                    </div>

                    {filteredClinics.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <CheckCircle2 className="mx-auto text-emerald-500 w-12 h-12 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800">¡Al día!</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                          No se encontraron clínicas con saldo pendiente acumulado en el departamento de Facturación.
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-x-auto flex-1">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                              <tr>
                                <th className="px-6 py-4">Clínica</th>
                                <th className="px-6 py-4">Casos</th>
                                <th className="px-6 py-4">Balance</th>
                                <th className="px-6 py-4 text-right">Detalle</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredClinics.map((cli) => (
                                <tr key={cli.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => handleSelectClinic(cli)}>
                                  <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 text-[#D4AF37] flex items-center justify-center font-black group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                                      {cli.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="group-hover:text-[#D4AF37] transition-colors">{cli.nombre}</span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 font-medium">
                                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                      {cli.casos_count} {cli.casos_count === 1 ? 'caso' : 'casos'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    {cli.total_deuda < 0 ? (
                                      <span className="inline-flex items-center gap-1.5 font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-sm">
                                        ↑ Saldo a favor ${Math.abs(cli.total_deuda).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    ) : (
                                      <span className="font-black text-rose-600">
                                        ${cli.total_deuda.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button className="p-1.5 bg-slate-50 group-hover:bg-amber-50 text-slate-400 group-hover:text-[#D4AF37] rounded-lg transition-colors inline-flex">
                                      <ChevronRight size={18} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* CxC - Nivel 2: Detalle de Casos de la Clínica */
                  <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Breadcrumbs / Header */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2 text-xs md:text-sm">
                        <button 
                          onClick={handleBackToClinics}
                          className="text-slate-500 hover:text-[#D4AF37] font-semibold transition-colors flex items-center gap-1"
                        >
                          Facturación
                        </button>
                        <ChevronRight size={14} className="text-slate-400" />
                        <span className="text-slate-800 font-bold max-w-[200px] truncate">
                          {selectedClinic.nombre}
                        </span>
                      </div>

                      <button 
                        onClick={handleBackToClinics}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm transition-colors"
                      >
                        <ArrowLeft size={14} />
                        Volver
                      </button>
                    </div>

                    {/* Tabla de Casos */}
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                          <tr>
                            <th className="px-6 py-4">Folio</th>
                            <th className="px-6 py-4">Paciente</th>
                            <th className="px-6 py-4">Fecha Entrega</th>
                            <th className="px-6 py-4">IVA (8%)</th>
                            <th className="px-6 py-4">Total</th>
                            <th className="px-6 py-4">Saldo Pendiente</th>
                            <th className="px-6 py-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedClinicCases.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                No hay casos con saldo pendiente para esta clínica.
                              </td>
                            </tr>
                          ) : (
                            selectedClinicCases.map((c) => (
                              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-800">
                                  #{c.codigo}
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-700">
                                  {c.paciente}
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-xs">
                                  {c.fecha_entrega ? (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={12} className="text-slate-400" />
                                      {c.fecha_entrega}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={c.iva_aplicado || false} 
                                    onChange={(e) => handleToggleIVA(c, e.target.checked)} 
                                    className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37] rounded cursor-pointer border-slate-300" 
                                  />
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                  ${c.total_caso
                                    ? (c.iva_aplicado
                                        ? (Number(c.total_caso) / 1.08).toFixed(2)
                                        : Number(c.total_caso).toFixed(2))
                                    : "0.00"}
                                </td>
                                <td className="px-6 py-4">
                                  {Number(c.saldo_pendiente) < 0 ? (
                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1 text-xs">
                                      ↑ Saldo a favor ${Math.abs(Number(c.saldo_pendiente)).toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1 text-xs">
                                      <DollarSign size={12} className="text-rose-500" />
                                      {Number(c.saldo_pendiente).toFixed(2)}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                  {currentUser?.username?.toLowerCase() === 'coloraturacorp' && (
                                    <button
                                      title="Editar Caso"
                                      onClick={() => handleOpenEdit(c)}
                                      className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 rounded-lg transition-all"
                                    >
                                      <Edit size={18} />
                                    </button>
                                  )}
                                  <button
                                    title="Registrar Abono"
                                    onClick={() => handleOpenAbono(c)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-emerald-600 hover:text-emerald-800 rounded-lg transition-all"
                                  >
                                    <PlusCircle size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Resumen final en pie de tabla */}
                    <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-200 flex justify-between items-center shrink-0">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {selectedClinic.total_deuda < 0 ? 'Saldo a Favor Clínica:' : 'Total Acumulado Clínica:'}
                      </span>
                      <span className={`text-lg font-black ${selectedClinic.total_deuda < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {selectedClinic.total_deuda < 0 ? '↑ ' : ''}
                        ${Math.abs(selectedClinic.total_deuda).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* PESTAÑA 2: HISTORIAL DE CASOS PAGADOS */}
            {activeTab === "history" && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                {/* Buscador */}
                <div className="mb-4 relative max-w-md shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por folio, paciente o clínica..."
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none shadow-sm transition-all"
                  />
                </div>

                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                        <tr>
                          <th className="px-6 py-4">Folio</th>
                          <th className="px-6 py-4">Clínica</th>
                          <th className="px-6 py-4">Paciente</th>
                          <th className="px-6 py-4">Fecha Entrega</th>
                          <th className="px-6 py-4">Total</th>
                          <th className="px-6 py-4">Estado Pago</th>
                          <th className="px-6 py-4 text-right">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredHistory.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                              No se encontraron registros de casos pagados.
                            </td>
                          </tr>
                        ) : (
                          filteredHistory.map((c) => {
                            const isExpanded = expandedCaseId === c.id;
                            return (
                              <>
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-800">
                                    #{c.codigo}
                                  </td>
                                  <td className="px-6 py-4 font-semibold text-slate-700 max-w-[200px] truncate">
                                    {c.clientes?.nombre || "N/A"}
                                  </td>
                                  <td className="px-6 py-4 text-slate-700 font-medium">
                                    {c.paciente}
                                  </td>
                                  <td className="px-6 py-4 text-slate-500 text-xs">
                                    {c.fecha_entrega || "—"}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-slate-800">
                                    ${Number(c.total_caso).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 text-[10px]">
                                      Pagado
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => setExpandedCaseId(isExpanded ? null : c.id)}
                                      className="text-xs font-bold text-slate-500 hover:text-[#D4AF37] px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                                    >
                                      {isExpanded ? "Ocultar Abonos" : "Ver Abonos"}
                                    </button>
                                  </td>
                                </tr>
                                
                                {/* Desglose de Abonos Expandible */}
                                {isExpanded && (
                                  <tr className="bg-slate-50/50">
                                    <td colSpan="7" className="px-6 py-4">
                                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-inner max-w-3xl">
                                        <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">Historial de abonos registrados:</h4>
                                        {(!c.pagos || c.pagos.length === 0) ? (
                                          <p className="text-xs text-slate-400">No hay pagos registrados para este caso.</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {c.pagos.map((p) => (
                                              <div key={p.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                                                <div className="flex items-center gap-2">
                                                  <Calendar size={13} className="text-slate-400" />
                                                  <span className="text-slate-600 font-medium">
                                                    {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha sin registrar'}
                                                  </span>
                                                  <span className="text-slate-300">|</span>
                                                  <CreditCard size={13} className="text-slate-400" />
                                                  <span className="bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-bold text-[10px]">
                                                    {p.metodo_pago}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                  <span className="text-slate-500">
                                                    Registrado por: <strong className="text-slate-700">{p.creado_por || "Admin"}</strong>
                                                  </span>
                                                  <span className="text-sm font-black text-emerald-600">
                                                    +${Number(p.monto_abono).toFixed(2)}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PESTAÑA 3: METRICAS Y ANALISIS */}
            {activeTab === "analytics" && (
              <motion.div
                key="analytics-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 pb-6 overflow-y-auto"
              >
                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group">
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

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group">
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

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group">
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
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col max-h-[400px]">
                    <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Calendar size={16} className="text-[#D4AF37]" />
                      Abonos Recientes
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {stats.recentPayments.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-12">No se han registrado abonos recientes.</p>
                      ) : (
                        stats.recentPayments.map((p) => (
                          <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-amber-200 transition-colors">
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
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
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

                    <div className="mt-6 bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Los montos desglosados arriba corresponden al monto real capturado en pesos mexicanos (MXN) en el momento del abono. Asegúrate de registrar correctamente la forma de pago (Efectivo/Transferencia) para fines de auditoría.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* REGISTRAR ABONO MODAL */}
      {abonoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setAbonoModal(null)}
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-[#D4AF37] rounded-lg">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Registrar Abono</h3>
                <p className="text-xs text-slate-500 mt-0.5">Caso #{abonoModal.codigo} â€” Paciente: {abonoModal.paciente}</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterAbono} className="p-6 space-y-4">
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Saldo Pendiente actual</span>
                  <strong className="text-slate-800 text-sm font-black">${Number(abonoModal.saldo_pendiente).toFixed(2)}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block font-medium">
                    Total del Caso
                    {abonoModal.iva_aplicado && (
                      <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">+IVA 8%</span>
                    )}
                  </span>
                  <strong className="text-slate-700 font-bold">
                    ${(abonoModal.iva_aplicado
                      ? (Number(abonoModal.total_caso || 0) / 1.08)
                      : Number(abonoModal.total_caso || 0)
                    ).toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto a abonar ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Monto del pago"
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Método de pago</label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all text-slate-700 font-semibold"
                >
                  <option value="Transferencia">Transferencia bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registrado por (Admin Name)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Nombre del administrador"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all font-medium text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setAbonoModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAbono}
                  className="flex-1 py-2.5 bg-[#D4AF37] hover:bg-[#B8860B] text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {submittingAbono ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Confirmar Abono
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* REGISTRAR PAGO GLOBAL MODAL */}
      {isGlobalPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsGlobalPaymentOpen(false)}
          />

          {/* Modal Container (Glassmorphism design) */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white/90 backdrop-blur-md rounded-2xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden flex flex-col border border-white/20"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-[#D4AF37] rounded-lg">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Motor de Cobranza Global</h3>
                <p className="text-xs text-slate-500 mt-0.5">Distribución FIFO (First In First Out) por clínica</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterGlobalPayment} className="p-6 space-y-4">
              {/* Clinic Picker */}
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clínica Deudora</label>
                {globalClienteId ? (
                  <div className="flex items-center justify-between bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800">
                    <span className="flex items-center gap-2">
                      <Building2 size={16} className="text-[#D4AF37]" />
                      {allClinics.find(cl => cl.id === globalClienteId)?.nombre}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setGlobalClienteId("");
                        setGlobalMonto("");
                      }} 
                      className="p-1 hover:bg-amber-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Escribe para buscar clínica con deuda..."
                      value={globalPickerSearch}
                      onChange={(e) => {
                        setGlobalPickerSearch(e.target.value);
                        setGlobalPickerOpen(true);
                      }}
                      onFocus={() => setGlobalPickerOpen(true)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all text-slate-700"
                    />
                    
                    {globalPickerOpen && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50">
                        {filteredPickerClinics.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-slate-400 text-center">
                            {globalPickerSearch ? "No se encontraron clínicas deudoras" : "Escribe el nombre de una clínica"}
                          </div>
                        ) : (
                          filteredPickerClinics.map(cl => {
                            const clinicWithDebt = clinics.find(c => c.id === cl.id);
                            return (
                              <button
                                key={cl.id}
                                type="button"
                                onClick={() => {
                                  setGlobalClienteId(cl.id);
                                  setGlobalPickerSearch("");
                                  setGlobalPickerOpen(false);
                                  setGlobalMonto(clinicWithDebt ? String(clinicWithDebt.total_deuda) : "");
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-bold text-slate-700 flex justify-between items-center transition-colors cursor-pointer"
                              >
                                <span>{cl.nombre}</span>
                                {clinicWithDebt && (
                                  <span className="text-rose-500 font-black">${clinicWithDebt.total_deuda.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Monto */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto Recibido ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Monto total del pago"
                    value={globalMonto}
                    onChange={(e) => setGlobalMonto(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Método de pago */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Método de pago</label>
                <select
                  value={globalMetodo}
                  onChange={(e) => setGlobalMetodo(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all text-slate-700 font-semibold"
                >
                  <option value="Transferencia">Transferencia bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Dropzone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comprobante de Pago (Opcional)</label>
                {globalComprobante ? (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-slate-700 truncate min-w-0">
                      <FileText size={16} className="text-slate-400 shrink-0" />
                      <span className="font-semibold truncate text-xs">{globalComprobante.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">({(globalComprobante.size / 1024).toFixed(1)} KB)</span>
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setGlobalComprobante(null)} 
                      className="p-1 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => document.getElementById('global-comprobante-input').click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setGlobalComprobante(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-dashed border-2 border-slate-200 hover:border-amber-400 bg-slate-50/50 p-5 rounded-xl text-center cursor-pointer transition-colors flex flex-col items-center gap-1.5 group"
                  >
                    <UploadCloud size={28} className="text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                    <span className="text-xs font-bold text-slate-600">Arrastra o haz clic para subir comprobante</span>
                    <span className="text-[10px] text-slate-400">PDF, PNG, JPG hasta 5MB</span>
                    <input 
                      id="global-comprobante-input"
                      type="file" 
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setGlobalComprobante(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Responsable */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registrado por (Admin Name)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Nombre del administrador"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all font-medium text-slate-700"
                    required
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsGlobalPaymentOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingGlobal}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 via-[#D4AF37] to-amber-500 hover:from-[#B8860B] hover:to-[#D4AF37] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submittingGlobal ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Registrar Pago
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL EDICION DE CASO */}
      {editModalCase && (
        <EditCaseModal
          caseData={editModalCase}
          onClose={() => setEditModalCase(null)}
          onUpdated={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}

