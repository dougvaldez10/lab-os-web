"use client";

import { useState, useEffect } from "react";
import { 
  Wallet, 
  History, 
  ChevronRight, 
  Search, 
  RefreshCw, 
  Plus,
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
  Edit,
  Calculator,
  Percent,
  Send,
  Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { 
  getBillingSummary, 
  getBillingHistory, 
  registrarAbono,
  registerGlobalPayment,
  applyCustomDistribution,
  getPendingFacturacionCases,
  markCaseAsSent
} from "@/app/actions/billing";
import { getAllClinics } from "@/app/actions/clients";
import { toggleCaseIVA, updateCaseDiscount, getCaseDetailsForEdit } from "@/app/actions/cases";
import { generateReceipt } from "@/app/actions/receipts";
import { getAuditAlerts, logShadowAudit, markShadowAuditAsSaved } from "@/app/actions/audit";
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

  // States for Pendientes de Pago (Facturación)
  const [pendingCases, setPendingCases] = useState([]);
  const [sendingCaseId, setSendingCaseId] = useState(null);
  const [confirmSendModal, setConfirmSendModal] = useState(null); // caso a confirmar envío
  const [sentCaseId, setSentCaseId] = useState(null); // fila con animación de enviado

  // States for History
  const [historyCases, setHistoryCases] = useState([]);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [expandedCaseId, setExpandedCaseId] = useState(null);

  // Modals state
  const [abonoModal, setAbonoModal] = useState(null);
  const [globalAbonoModal, setGlobalAbonoModal] = useState(false);
  const [editModalCase, setEditModalCase] = useState(null);
  const [receiptCase, setReceiptCase] = useState(null);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [discountType, setDiscountType] = useState("$");
  const [discountValue, setDiscountValue] = useState("");
  const [applyIva, setApplyIva] = useState(false);

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

  // Custom allocations for CxC Level 2
  const [customAllocations, setCustomAllocations] = useState({}); // { [caseId]: Number }
  const [submittingCustomDistribution, setSubmittingCustomDistribution] = useState(false);
  const [isEditReceiptMode, setIsEditReceiptMode] = useState(false);

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

      if (activeTab === "pendientes") {
        const res = await getPendingFacturacionCases();
        if (res.success) {
          setPendingCases(res.cases || []);
        } else {
          toast.error("Error al cargar casos pendientes: " + res.error);
        }
      } else if (activeTab === "cxc") {
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
        toast.success(`Pago registrado. Se agregaron $${montoVal.toFixed(2)} al saldo a favor de la clínica.`, { 
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

  const handleToggleCaseSelection = (caseId, pendingBalance, currentWalletBalance) => {
    setCustomAllocations(prev => {
      const copy = { ...prev };
      if (copy[caseId] !== undefined) {
        delete copy[caseId];
      } else {
        const currentTotalAssigned = Object.values(copy).reduce((acc, val) => acc + val, 0);
        const currentRemaining = Math.max(0, currentWalletBalance - currentTotalAssigned);
        const fillAmount = Math.min(pendingBalance, currentRemaining);
        copy[caseId] = Math.round(fillAmount * 100) / 100;
      }
      return copy;
    });
  };

  const handleUpdateAllocationAmount = (caseId, amountStr, pendingBalance) => {
    const amt = parseFloat(amountStr);
    setCustomAllocations(prev => {
      const copy = { ...prev };
      if (isNaN(amt) || amt <= 0) {
        copy[caseId] = 0;
      } else {
        copy[caseId] = Math.min(pendingBalance, amt);
      }
      return copy;
    });
  };

  const handleApplyCustomDistribution = async () => {
    if (!selectedClinic) return;
    
    const filteredAllocations = {};
    let totalAssigned = 0;
    for (const caseId in customAllocations) {
      const amt = Number(customAllocations[caseId]) || 0;
      if (amt > 0) {
        filteredAllocations[caseId] = amt;
        totalAssigned += amt;
      }
    }

    if (Object.keys(filteredAllocations).length === 0) {
      toast.error("Por favor asigna un abono a al menos un caso.");
      return;
    }

    const currentClinicData = allClinics.find(cl => cl.id === selectedClinic.id) || selectedClinic;
    const walletBalance = Number(currentClinicData?.saldo_favor) || 0;

    if (totalAssigned > (walletBalance + 0.01)) {
      toast.error(`El total asignado ($${totalAssigned.toFixed(2)}) supera el saldo a favor disponible ($${walletBalance.toFixed(2)}).`);
      return;
    }

    setSubmittingCustomDistribution(true);
    const toastId = toast.loading("Aplicando distribución de pagos...");
    
    try {
      const creator = currentUser ? (currentUser.username || currentUser.email) : adminName || "Admin";
      const res = await applyCustomDistribution(selectedClinic.id, filteredAllocations, creator);
      if (res.success) {
        toast.success("Distribución aplicada correctamente.", { id: toastId });
        setCustomAllocations({});
        await fetchData();
      } else {
        toast.error(res.error || "Error al aplicar la distribución.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado al aplicar distribución.", { id: toastId });
    } finally {
      setSubmittingCustomDistribution(false);
    }
  };

  const handleMarkAsSent = async (caso) => {
    // Abrir modal de confirmación en lugar de window.confirm
    setConfirmSendModal(caso);
  };

  const handleConfirmSend = async () => {
    const caso = confirmSendModal;
    if (!caso) return;
    setConfirmSendModal(null);
    setSendingCaseId(caso.id);
    const toastId = toast.loading("Marcando como enviado...");
    try {
      const res = await markCaseAsSent(caso.id);
      if (res.success) {
        // Primero mostrar animación de éxito en la fila
        setSentCaseId(caso.id);
        toast.success(
          `✅ Caso #${caso.codigo} enviado correctamente. Fecha de cobro: ${res.dateSent}`,
          { id: toastId, duration: 5000 }
        );
        // Esperar animación antes de refrescar
        setTimeout(() => {
          setSentCaseId(null);
          fetchData();
        }, 1200);
      } else {
        toast.error("Error al marcar envío: " + res.error, { id: toastId });
      }
    } catch (err) {
      toast.error("Error de servidor.", { id: toastId });
    } finally {
      setSendingCaseId(null);
    }
  };

  const openReceiptModal = async (caso) => {
    const toastId = toast.loading("Cargando detalles del caso...");
    try {
      const res = await getCaseDetailsForEdit(caso.id);
      let items = [];
      let discountVal = 0;
      
      if (res.success) {
        items = res.detalles?.map(d => ({
          unidades: d.unidades,
          producto: d.producto,
          precio_unitario: Number(d.precio_unit) || 0,
          dientes: d.dientes
        })) || [];
        discountVal = Number(res.master?.descuento) || 0;
      }
      
      setReceiptCase({
        id: caso.codigo,
        internal_id: caso.id,
        patient: caso.paciente,
        doctor: caso.doctor || caso.clientes?.nombre,
        items: items,
        total_caso: caso.total_caso || 0,
        iva_aplicado: caso.iva_aplicado
      });
      setDiscountType("$");
      setDiscountValue(discountVal > 0 ? String(discountVal) : "");
      setApplyIva(caso.iva_aplicado || false);
      toast.dismiss(toastId);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar detalles.", { id: toastId });
    }
  };

  const closeReceiptModal = () => {
    setReceiptCase(null);
  };

  const calculateReceipt = () => {
    if (!receiptCase) return { subtotal: 0, discountAmount: 0, ivaAmount: 0, total: 0 };
    
    // Subtotal basado en detalles si existen, si no total_caso
    const subtotal = receiptCase.items && receiptCase.items.length > 0
      ? receiptCase.items.reduce((acc, it) => acc + (Number(it.unidades) * Number(it.precio_unitario)), 0)
      : Number(receiptCase.total_caso);
    
    const disc = parseFloat(discountValue) || 0;
    const discountAmount = discountType === "%" 
      ? subtotal * (disc / 100) 
      : disc;
      
    const subtotalConDescuento = Math.max(0, subtotal - discountAmount);
    const ivaAmount = receiptCase.iva_aplicado ? (subtotalConDescuento * 0.08) : 0;
    const total = subtotalConDescuento + ivaAmount;
    
    return { subtotal, discountAmount, ivaAmount, total };
  };

  // Shadow Audit Sombra for Receipt Modal
  useEffect(() => {
    if (!receiptCase) return;
    
    const calc = calculateReceipt();
    const snapshot = {
      descuentoTipo: discountType,
      descuentoValor: discountValue,
      aplicaIva: applyIva,
      subtotal: calc.subtotal,
      descuentoMonto: calc.discountAmount,
      ivaMonto: calc.ivaAmount,
      total: calc.total
    };

    const timer = setTimeout(() => {
      logShadowAudit({
        caso_id: receiptCase.internal_id,
        codigo_caso: receiptCase.id,
        snapshot_data: snapshot,
        guardado_oficial: false
      }).catch(() => {});
    }, 3000);

    return () => clearTimeout(timer);
  }, [discountValue, discountType, applyIva, receiptCase]);

  const printReceipt = (calc, customCaseObj = null) => {
    const activeCase = customCaseObj || receiptCase;
    if (!activeCase) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Por favor permite las ventanas emergentes (pop-ups) para imprimir el recibo.");
      return;
    }

    const itemsHtml = activeCase.items && activeCase.items.length > 0 
      ? activeCase.items.map(it => `
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
          <div>
            <div style="font-weight: bold; font-size: 14px;">
              <span style="color: #3b82f6;">${it.unidades}x</span> ${it.producto}
            </div>
            ${it.dientes ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">Piezas: #${Array.isArray(it.dientes) ? it.dientes.join(', ') : it.dientes}</div>` : ''}
          </div>
        </div>
      `).join('')
      : '<div style="padding: 10px; text-align: center; color: #64748b; font-size: 14px;">Sin materiales detallados.</div>';

    const discountHtml = calc.discountAmount > 0 
      ? `
      <div class="total-row" style="color: #ef4444; font-weight: 600;">
        <span>Descuento</span>
        <span>-$${calc.discountAmount.toFixed(2)}</span>
      </div>
      `
      : '';

    const ivaHtml = calc.ivaAmount > 0 
      ? `
      <div class="total-row" style="color: #64748b; font-weight: 500;">
        <span>IVA (8%)</span>
        <span>+$${calc.ivaAmount.toFixed(2)}</span>
      </div>
      `
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo - Orden #${activeCase.id}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; color: #0f172a; margin: 0; padding: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: 900; margin: 0; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
            .info-box { background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; display: flex; gap: 40px;}
            .info-item { display: flex; flex-direction: column; gap: 4px;}
            .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; }
            .info-value { font-size: 16px; font-weight: 700; }
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 15px; }
            .totals { margin-top: 40px; border-top: 2px solid #f1f5f9; padding-top: 20px; width: 300px; margin-left: auto; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .total-row.final { font-size: 20px; font-weight: 900; color: #0062cc; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            @media print {
              body { padding: 0; }
              @page { margin: 2cm; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>
                <h1 class="title">RECIBO</h1>
                <p class="subtitle">Laboratorio Dental Lab OS</p>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Orden #${activeCase.id}</h2>
                <p class="subtitle">Fecha: ${new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div class="info-box">
              <div class="info-item">
                <span class="info-label">Paciente</span>
                <span class="info-value">${activeCase.patient}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Doctor/Clínica</span>
                <span class="info-value">${activeCase.doctor}</span>
              </div>
            </div>

            <h3 class="section-title">Desglose de Conceptos</h3>
            <div>
              ${itemsHtml}
            </div>

            <div class="totals">
              <div class="total-row">
                <span style="color: #64748b; font-weight: 500;">Subtotal Base</span>
                <span>$${calc.subtotal.toFixed(2)}</span>
              </div>
              ${discountHtml}
              ${ivaHtml}
              <div class="total-row final">
                <span>Total a Cobrar</span>
                <span>$${calc.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div style="margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p>Gracias por su preferencia.</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSaveAdjustments = async () => {
      if (!receiptCase) return;
      setReceiptSaving(true);
      const toastId = toast.loading("Guardando ajustes de cobro...");
      try {
         const calc = calculateReceipt();
         const res = await updateCaseDiscount(receiptCase.internal_id, discountValue || 0, discountType);
         if (res.success) {
            toast.success("Ajustes de cobro guardados correctamente.", { id: toastId });
            closeReceiptModal();
            fetchData();
         } else {
            toast.error(res.error || "Error al guardar los ajustes.", { id: toastId });
         }
      } catch (err) {
         console.error(err);
         toast.error("Error inesperado al guardar ajustes.", { id: toastId });
      } finally {
         setReceiptSaving(false);
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

  // Calcular total pendiente para las clínicas filtradas
  const filteredClinicIds = new Set(filteredClinics.map(cl => cl.id));
  const filteredCases = cases.filter(c => filteredClinicIds.has(c.cliente_id));
  const totalGeneral = filteredCases.reduce((acc, c) => {
    return acc + (Number(c.saldo_pendiente) || 0);
  }, 0);

  // Casos de la clínica seleccionada (CxC Nivel 2)
  const selectedClinicCases = cases.filter(c => c.cliente_id === selectedClinic?.id);

  // Filtrado de Historial
  const filteredHistory = historyCases.filter(c => 
    c.codigo.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
    c.paciente.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
    c.clientes?.nombre.toLowerCase().includes(historySearchTerm.toLowerCase())
  );

  // Calcular total de casos pendientes
  const totalPendientes = pendingCases.reduce((acc, c) => acc + (Number(c.saldo_pendiente) || 0), 0);

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsGlobalPaymentOpen(true);
              setGlobalClienteId("");
              setGlobalMonto("");
              setGlobalComprobante(null);
            }}
            title="Registrar Pago"
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white rounded-xl font-bold shadow-md hover-lift transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Registrar Pago
          </button>
          <button 
            onClick={fetchData} 
            disabled={loading}
            title="Actualizar Datos"
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm hover:rotate-180 transition-all duration-500 cursor-pointer disabled:opacity-50 flex items-center justify-center"
          >
            <RefreshCw size={20} className={loading ? "animate-spin text-amber-500" : ""} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 mb-6 shrink-0 bg-white p-1.5 rounded-xl border border-slate-200 w-fit max-w-full overflow-x-auto">
        {[
          { id: "pendientes", label: "Casos Pendientes", icon: FileText },
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
                isActive ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={18} className={isActive ? "text-slate-900" : "text-slate-400"} />
              <span>{tab.label}</span>
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
            {/* PESTAÑA PENDIENTES DE PAGO */}
            {activeTab === "pendientes" && (
              <motion.div
                key="pendientes-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4">Folio</th>
                          <th className="px-6 py-4">Clínica / Paciente</th>
                          <th className="px-6 py-4">Descripción</th>
                          <th className="px-6 py-4">Llegada a Facturación</th>
                          <th className="px-6 py-4">Saldo Pendiente</th>
                          <th className="px-6 py-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pendingCases.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                              No hay casos pendientes sin enviar.
                            </td>
                          </tr>
                        ) : (
                          pendingCases.map((c) => {
                            const isSent = sentCaseId === c.id;
                            const isSending = sendingCaseId === c.id;
                            return (
                              <tr
                                key={c.id}
                                className={`transition-all duration-500 ${
                                  isSent
                                    ? "bg-emerald-50 scale-[0.99] opacity-60"
                                    : "hover:bg-slate-50/50"
                                }`}
                              >
                                <td className="px-6 py-4 font-bold text-slate-800">
                                  #{c.codigo}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-slate-800">{c.clientes?.nombre || "N/A"}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{c.paciente}</div>
                                </td>
                                <td className="px-6 py-4">
                                  {c.casos_detalle?.map((d, i) => (
                                    <div key={i} className="text-xs font-medium text-slate-600">
                                      <span className="font-bold text-slate-800">{d.unidades}x</span> {d.producto} {d.material && `(${d.material})`}
                                    </div>
                                  ))}
                                  {(!c.casos_detalle || c.casos_detalle.length === 0) && <span className="text-slate-400 text-xs">Sin detalles</span>}
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                                  {isSent ? (
                                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                      <CheckCircle2 size={14} className="text-emerald-500" /> Enviado
                                    </span>
                                  ) : c.fecha_entrega ? (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={12} className="text-slate-400" />
                                      {c.fecha_entrega}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                      <AlertCircle size={12} /> Esperando Envío
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1 text-xs">
                                    <DollarSign size={12} className="text-rose-500" />
                                    {Number(c.saldo_pendiente).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                     <button
                                       onClick={() => {
                                         setIsEditReceiptMode(true);
                                         handleOpenEdit(c);
                                       }}
                                       disabled={isSent}
                                       className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
                                     >
                                       <FileText size={14} /> Recibo
                                     </button>
                                    <button
                                      onClick={() => handleMarkAsSent(c)}
                                      disabled={isSending || isSent}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                                        isSent
                                          ? "bg-emerald-500 text-white cursor-default"
                                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                                      }`}
                                    >
                                      {isSending ? (
                                        <RefreshCw size={14} className="animate-spin" />
                                      ) : isSent ? (
                                        <CheckCircle2 size={14} />
                                      ) : (
                                        <Send size={14} />
                                      )}
                                      {isSent ? "Enviado" : "Enviar"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {pendingCases.length > 0 && (
                    <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-200 flex justify-between items-center shrink-0">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider cursor-help" title="Total Acumulado Sin Enviar">
                        Total:
                      </span>
                      <span className="text-lg font-black text-rose-600">
                        ${totalPendientes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

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
                    {/* Buscador */}
                    <div className="mb-4 shrink-0">
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
                                    <span className="group-hover:text-[#D4AF37] group-hover:translate-x-1.5 transition-all duration-200 inline-block">{cli.nombre}</span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 font-medium">
                                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                      {cli.casos_count} {cli.casos_count === 1 ? 'caso' : 'casos'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    {cli.total_deuda < 0 ? (
                                      <span className="font-black text-emerald-600">
                                        ${Math.abs(cli.total_deuda).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    ) : (
                                      <span className="font-black text-rose-600">
                                        ${cli.total_deuda.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button className="p-1.5 bg-slate-50 group-hover:bg-amber-50 text-slate-400 group-hover:text-[#D4AF37] rounded-lg transition-all group-hover:translate-x-0.5 inline-flex">
                                      <ChevronRight size={18} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Resumen General de Cuentas por Cobrar */}
                        <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-200 flex justify-between items-center shrink-0">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider cursor-help" title="Total General Pendiente (Con y Sin IVA)">
                            Total:
                          </span>
                          <span className={`text-lg font-black ${totalGeneral < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
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

                    {/* Cartera / Saldo a Favor de la clínica */}
                    {(() => {
                      const currentClinicData = allClinics.find(cl => cl.id === selectedClinic.id) || selectedClinic;
                      const walletBalance = Number(currentClinicData?.saldo_favor) || 0;
                      const totalAssigned = Object.keys(customAllocations).reduce((acc, caseId) => acc + (Number(customAllocations[caseId]) || 0), 0);
                      const remainingToDistribute = walletBalance - totalAssigned;

                      return (
                        <div className="px-6 py-4 bg-amber-50/40 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 text-[#D4AF37] rounded-xl border border-amber-100 shadow-sm">
                              <Wallet size={20} />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cartera / Saldo a Favor Disponible</div>
                              <div className={`text-lg font-black mt-0.5 ${remainingToDistribute < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                ${remainingToDistribute.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto">
                            <button
                              onClick={handleApplyCustomDistribution}
                              disabled={submittingCustomDistribution || Object.keys(customAllocations).length === 0 || remainingToDistribute < -0.01}
                              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                            >
                              {submittingCustomDistribution ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              Aplicar Distribución
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tabla de Casos */}
                    <div className="flex-1 overflow-x-auto">
                      {(() => {
                        const currentClinicData = allClinics.find(cl => cl.id === selectedClinic.id) || selectedClinic;
                        const walletBalance = Number(currentClinicData?.saldo_favor) || 0;

                        return (
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                              <tr>
                                <th className="px-6 py-4 text-center w-12">Asignar</th>
                                <th className="px-6 py-4">Folio</th>
                                <th className="px-6 py-4">Paciente</th>
                                <th className="px-6 py-4">Fecha Entrega</th>
                                <th className="px-6 py-4 text-center">IVA (8%)</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Saldo Pendiente</th>
                                <th className="px-6 py-4">Abonar ($)</th>
                                <th className="px-6 py-4 text-right">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedClinicCases.length === 0 ? (
                                <tr>
                                  <td colSpan="9" className="px-6 py-8 text-center text-slate-400">
                                    No hay casos con saldo pendiente para esta clínica.
                                  </td>
                                </tr>
                              ) : (
                                selectedClinicCases.map((c) => {
                                  const isAllocated = customAllocations[c.id] !== undefined;
                                  const allocatedAmount = customAllocations[c.id] !== undefined ? customAllocations[c.id] : "";

                                  return (
                                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-6 py-4 text-center">
                                        <input 
                                          type="checkbox" 
                                          checked={isAllocated} 
                                          onChange={() => handleToggleCaseSelection(c.id, Number(c.saldo_pendiente), walletBalance)} 
                                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded cursor-pointer border-slate-300" 
                                        />
                                      </td>
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
                                            <DollarSign size={12} className="text-emerald-500" />
                                            {Math.abs(Number(c.saldo_pendiente)).toFixed(2)}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1 text-xs">
                                            <DollarSign size={12} className="text-rose-500" />
                                            {Number(c.saldo_pendiente).toFixed(2)}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          min="0"
                                          max={Number(c.saldo_pendiente)}
                                          placeholder="0.00"
                                          value={allocatedAmount}
                                          disabled={!isAllocated}
                                          onChange={(e) => handleUpdateAllocationAmount(c.id, e.target.value, Number(c.saldo_pendiente))}
                                          className="w-24 bg-white disabled:bg-slate-50 border border-slate-200 disabled:border-slate-100 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                      </td>
                                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                          title="Ajustes de Cobro"
                                          onClick={() => openReceiptModal(c)}
                                          className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 rounded-lg transition-all cursor-pointer"
                                        >
                                          <Edit size={18} />
                                        </button>
                                        <button
                                          title="Registrar Abono"
                                          onClick={() => handleOpenAbono(c)}
                                          className="inline-flex items-center justify-center w-8 h-8 text-emerald-600 hover:text-emerald-800 rounded-lg transition-all"
                                        >
                                          <PlusCircle size={18} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>

                    {/* Resumen final en pie de tabla */}
                    <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-200 flex justify-between items-center shrink-0">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {selectedClinic.total_deuda < 0 ? 'Saldo a Favor Clínica:' : 'Total Acumulado Clínica:'}
                      </span>
                      <span className={`text-lg font-black ${selectedClinic.total_deuda < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
          <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-md transition-opacity" onClick={() => setAbonoModal(null)}></div>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[24px] w-full max-w-md relative z-10 overflow-hidden flex flex-col"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 -10px 40px -15px rgba(0, 0, 0, 0.1)' }}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-[#D4AF37] rounded-lg">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Registrar Abono</h3>
                <p className="text-xs text-slate-500 mt-0.5">Caso #{abonoModal.codigo} — Paciente: {abonoModal.paciente}</p>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-md transition-opacity" onClick={() => setIsGlobalPaymentOpen(false)}></div>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white/90 backdrop-blur-md rounded-[24px] w-full max-w-md relative z-10 overflow-hidden flex flex-col border border-white/20"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 -10px 40px -15px rgba(0, 0, 0, 0.1)' }}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-[#D4AF37] rounded-lg">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800">Motor de Cobranza Global</h3>
                <p className="text-xs text-slate-500 mt-0.5">El pago se sumará a la cartera / saldo a favor de la clínica</p>
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
                            const saldoFavor = Number(cl.saldo_favor) || 0;
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
                                <div className="flex items-center gap-3">
                                  {saldoFavor > 0 && (
                                    <span className="text-emerald-500 font-black">+{saldoFavor.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                                  )}
                                  {clinicWithDebt && (
                                    <span className="text-rose-500 font-black">${clinicWithDebt.total_deuda.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                  )}
                                </div>
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
          isReceiptMode={isEditReceiptMode}
          onPrintReceipt={printReceipt}
          onClose={() => {
            setEditModalCase(null);
            setIsEditReceiptMode(false);
          }}
          onUpdated={() => {
            fetchData();
          }}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE ENVÍO */}
      <AnimatePresence>
        {confirmSendModal && (
          <motion.div
            key="confirm-send-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
              onClick={() => setConfirmSendModal(null)}
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-white rounded-[24px] w-full max-w-sm relative z-10 overflow-hidden"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 -10px 40px -15px rgba(0, 0, 0, 0.1)' }}
            >
              {/* Header verde */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Send size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-black text-lg leading-tight">Confirmar Envío</h2>
                  <p className="text-emerald-100 text-xs mt-0.5">Se registrará la fecha de hoy para cobro</p>
                </div>
              </div>

              {/* Info del caso */}
              <div className="px-6 py-5">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Folio</span>
                    <span className="font-black text-slate-800">#{confirmSendModal.codigo}</span>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Clínica</span>
                    <span className="font-semibold text-slate-700 text-sm max-w-[160px] text-right truncate">{confirmSendModal.clientes?.nombre || "N/A"}</span>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Paciente</span>
                    <span className="font-semibold text-slate-700 text-sm">{confirmSendModal.paciente}</span>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Saldo</span>
                    <span className="font-black text-rose-600 text-base">
                      ${Number(confirmSendModal.saldo_pendiente).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 text-center mb-5">
                  Al confirmar, este caso pasará al módulo de <strong>Cuentas por Cobrar</strong> y se le asignará la fecha de hoy como fecha de cobro.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmSendModal(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmSend}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                  >
                    <Send size={15} />
                    Enviar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE RECIBO / BORRADOR */}
      {receiptCase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-md transition-opacity" onClick={closeReceiptModal}></div>
          <div 
            className="bg-white rounded-[24px] w-full max-w-md relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh]"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 -10px 40px -15px rgba(0, 0, 0, 0.1)' }}
          >
             <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white relative z-20 shrink-0">
                <div>
                   <h2 className="text-xl font-black text-slate-800 tracking-tight">Ajustes de Cobro</h2>
                   <p className="text-sm font-medium text-slate-500 mt-0.5">Orden #{receiptCase.id}</p>
                </div>
                <button onClick={closeReceiptModal} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                   <X size={20} strokeWidth={2.5}/>
                </button>
             </div>
             
             <div className="p-6 bg-[#f8fafc] flex-1 overflow-y-auto">
                <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                   <div className="text-sm">
                      <span className="text-slate-400 block mb-1">Paciente</span>
                      <span className="font-bold text-slate-800">{receiptCase.paciente || receiptCase.patient}</span>
                   </div>
                   <div className="w-full h-px bg-slate-50 my-3"></div>
                   <div className="text-sm">
                      <span className="text-slate-400 block mb-1">Doctor/Clínica</span>
                      <span className="font-semibold text-slate-700">{receiptCase.doctor || receiptCase.clientes?.nombre}</span>
                   </div>
                </div>

                <div className="mb-6">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Desglose de Conceptos</h3>
                   <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      {receiptCase.items && receiptCase.items.length > 0 ? receiptCase.items.map((it, idx) => (
                         <div key={idx} className="px-4 py-3 flex justify-between items-center border-b border-slate-50 last:border-0">
                            <div>
                               <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                 <span className="text-blue-500">{it.unidades}x</span>
                                 {it.producto}
                               </div>
                               {it.dientes && <div className="text-xs text-slate-400 font-medium mt-0.5">Piezas: #{Array.isArray(it.dientes) ? it.dientes.join(', ') : it.dientes}</div>}
                            </div>
                         </div>
                      )) : (
                         <div className="p-4 text-center text-sm text-slate-500">Sin materiales detallados.</div>
                      )}
                   </div>
                </div>

                <div className="mb-2">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Ajustes de Cobro</h3>
                   <div className="space-y-3">
                      <div className="flex items-center gap-2">
                         <div className="flex bg-slate-200/60 rounded-lg p-1 shrink-0">
                            <button 
                               onClick={() => { setDiscountType("$"); setDiscountValue(""); }}
                               className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${discountType === "$" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                               <DollarSign size={14} className="inline-block -mt-0.5"/>
                            </button>
                            <button 
                               onClick={() => { setDiscountType("%"); setDiscountValue(""); }}
                               className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${discountType === "%" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                               <Percent size={14} strokeWidth={2.5} className="inline-block -mt-0.5"/>
                            </button>
                         </div>
                         <div className="relative flex-1">
                            <input
                               type="number"
                               placeholder={discountType === "$" ? "Monto a descontar..." : "Porcentaje (ej. 10)"}
                               value={discountValue}
                               onChange={(e) => setDiscountValue(e.target.value)}
                               className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                            />
                         </div>
                      </div>

                      <div 
                         onClick={() => setApplyIva(!applyIva)}
                         className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-slate-200 cursor-pointer hover:border-[#D4AF37]/50 shadow-sm transition-colors"
                      >
                         <span className="text-sm font-bold text-slate-700 select-none">Aplicar 8% IVA</span>
                         <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${applyIva ? "bg-[#0062cc]" : "bg-slate-200"}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all absolute ${applyIva ? "left-[22px]" : "left-[4px]"}`}></div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {(() => {
                const calc = calculateReceipt();
                return (
                   <div className="bg-white border-t border-slate-100 px-6 py-5 shrink-0">
                      <div className="space-y-2 mb-5">
                         <div className="flex justify-between text-sm text-slate-500 font-medium">
                            <span>Subtotal Base</span>
                            <span>${calc.subtotal.toFixed(2)}</span>
                         </div>
                         {calc.discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-red-500 font-semibold">
                               <span>Descuento</span>
                               <span>-${calc.discountAmount.toFixed(2)}</span>
                            </div>
                         )}
                         {calc.ivaAmount > 0 && (
                            <div className="flex justify-between text-sm text-slate-500 font-medium">
                               <span>IVA (8%)</span>
                               <span>+${calc.ivaAmount.toFixed(2)}</span>
                            </div>
                         )}
                         <div className="w-full h-px bg-slate-100 my-1"></div>
                         <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-slate-800">Total Final</span>
                            <span className="text-2xl font-black text-[#0062cc] tracking-tight">${calc.total.toFixed(2)}</span>
                         </div>
                      </div>
                      
                      <button
                         disabled={receiptSaving}
                         onClick={handleSaveAdjustments}
                         className="w-full bg-[#1e293b] hover:bg-[#0f172a] disabled:opacity-70 text-white rounded-xl py-3.5 font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                      >
                         {receiptSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                         {receiptSaving ? "Procesando..." : "Guardar Ajustes"}
                      </button>
                   </div>
                );
             })()}
          </div>
        </div>
      )}
    </div>
  );
}

