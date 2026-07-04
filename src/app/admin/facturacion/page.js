"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Wallet, 
  History, 
  ChevronRight, 
  ChevronLeft,
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
import GlassLayout from "@/components/admin/GlassLayout";
import { getCurrentUser } from "@/lib/auth";
import { 
  getBillingSummary, 
  getBillingHistory, 
  registrarAbono,
  registerGlobalPayment,
  applyCustomDistribution,
  getPendingFacturacionCases,
  markCaseAsSent,
  revertirPago,
  registrarPromesaPago
} from "@/app/actions/billing";
import { cancelarCaso } from "@/app/actions/admin-cases";
import { getAllClinics, getClients } from "@/app/actions/clients";
import { toggleCaseIVA, updateCaseDiscount, getCaseDetailsForEdit } from "@/app/actions/cases";
import { saveReceiptData, getReceiptByCaseId } from "@/app/actions/receipts";
import { printThermalReceipt } from "@/components/ThermalReceipt";
import { getAuditAlerts, logShadowAudit, markShadowAuditAsSaved } from "@/app/actions/audit";
import EditCaseModal from "./EditCaseModal";
import NewCaseModal from "@/components/NewCaseModal";

export default function BillingPanel() {
  const searchParams = useSearchParams();
  // Navigation tabs
  const [activeTab, setActiveTab] = useState("pendientes"); // cxc, history, analytics
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [adminName, setAdminName] = useState("");

  // States for CxC
  const [clinics, setClinics] = useState([]);
  const [allClinics, setAllClinics] = useState([]);
  const [doctores, setDoctores] = useState([]);
  const [cases, setCases] = useState([]);
  const [cobrosSemana, setCobrosSemana] = useState({ porCobrar: [], proximamente: [] });
  const [deudaGeneral, setDeudaGeneral] = useState([]);
  const [cxcSubTab, setCxcSubTab] = useState("semana"); // "semana" | "general"

  const [revertModalCase, setRevertModalCase] = useState(null);
  const [motivoReversion, setMotivoReversion] = useState("");
  const [submittingReversion, setSubmittingReversion] = useState(false);

  const [cancelModalCase, setCancelModalCase] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [submittingCancelacion, setSubmittingCancelacion] = useState(false);

  const [promesaModalCase, setPromesaModalCase] = useState(null);
  const [fechaPromesa, setFechaPromesa] = useState("");
  const [submittingPromesa, setSubmittingPromesa] = useState(false);
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
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
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

  // Sync activeTab with URL 'tab' search parameter
  const tabParam = searchParams.get("tab");
  useEffect(() => {
    if (tabParam && ["pendientes", "cxc", "history"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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
      const [allRes, docsRes] = await Promise.all([
        getAllClinics(),
        getClients()
      ]);
      if (allRes) setAllClinics(allRes);
      if (docsRes) setDoctores(docsRes);

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
          setCobrosSemana(res.cobrosSemana || { porCobrar: [], proximamente: [] });
          setDeudaGeneral(res.deudaGeneral || []);
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

  const handleRevertirPago = async (e) => {
    e.preventDefault();
    if (!motivoReversion || motivoReversion.trim().length < 5) {
      toast.error("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    setSubmittingReversion(true);
    const toastId = toast.loading("Revertiendo pago...");
    try {
      const res = await revertirPago({ caso_id: revertModalCase.id, motivo: motivoReversion });
      if (res.success) {
        toast.success("Pago revertido con éxito", { id: toastId });
        setRevertModalCase(null);
        setMotivoReversion("");
        fetchData();
      } else {
        toast.error(res.error || "No se pudo revertir el pago", { id: toastId });
      }
    } catch (err) {
      toast.error("Error al revertir pago", { id: toastId });
    } finally {
      setSubmittingReversion(false);
    }
  };

  const handleCancelarCaso = async (e) => {
    e.preventDefault();
    if (!motivoCancelacion || motivoCancelacion.trim().length < 5) {
      toast.error("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    setSubmittingCancelacion(true);
    const toastId = toast.loading("Cancelando caso...");
    try {
      const res = await cancelarCaso({ caso_id: cancelModalCase.id, motivo: motivoCancelacion });
      if (res.success) {
        toast.success("Caso cancelado con éxito", { id: toastId });
        setCancelModalCase(null);
        setMotivoCancelacion("");
        fetchData();
      } else {
        toast.error(res.error || "No se pudo cancelar el caso", { id: toastId });
      }
    } catch (err) {
      toast.error("Error al cancelar caso", { id: toastId });
    } finally {
      setSubmittingCancelacion(false);
    }
  };

  const handleRegistrarPromesa = async (e) => {
    e.preventDefault();
    if (!fechaPromesa) {
      toast.error("Seleccione una fecha válida");
      return;
    }
    setSubmittingPromesa(true);
    const toastId = toast.loading("Registrando promesa...");
    try {
      const res = await registrarPromesaPago({ caso_id: promesaModalCase.id, fecha_promesa: fechaPromesa });
      if (res.success) {
        toast.success("Promesa registrada", { id: toastId });
        setPromesaModalCase(null);
        setFechaPromesa("");
        fetchData();
      } else {
        toast.error(res.error || "Error al registrar promesa", { id: toastId });
      }
    } catch (err) {
      toast.error("Error de red", { id: toastId });
    } finally {
      setSubmittingPromesa(false);
    }
  };

  const handlePrintReceipt = async (caso) => {
    const res = await getReceiptByCaseId(caso.id);
    if (res.success) {
      printThermalReceipt(res.receiptData);
    } else {
      toast.error("No se pudo obtener el recibo");
    }
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
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #000000;">
          <div>
            <div style="font-weight: bold; font-size: 14px;">
              <span style="color: #000000;">${it.unidades}x</span> ${it.producto}
            </div>
            ${it.dientes ? `<div style="font-size: 12px; color: #000000; margin-top: 4px;">Piezas: #${Array.isArray(it.dientes) ? it.dientes.join(', ') : it.dientes}</div>` : ''}
          </div>
        </div>
      `).join('')
      : '<div style="padding: 10px; text-align: center; color: #000000; font-size: 14px;">Sin materiales detallados.</div>';

    const discountHtml = calc.discountAmount > 0 
      ? `
      <div class="total-row" style="color: #000000; font-weight: 600;">
        <span>Descuento</span>
        <span>-$${calc.discountAmount.toFixed(2)}</span>
      </div>
      `
      : '';

    const ivaHtml = calc.ivaAmount > 0 
      ? `
      <div class="total-row" style="color: #000000; font-weight: 500;">
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
            @media print {
              * {
                color: #000000 !important;
                background: transparent !important;
              }
            }
            body { font-family: 'Inter', system-ui, sans-serif; color: #000000; margin: 0; padding: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000000; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: 900; margin: 0; }
            .subtitle { font-size: 14px; color: #000000; margin-top: 4px; }
            .info-box { padding: 20px; border: 1px solid #000000; border-radius: 12px; margin-bottom: 30px; display: flex; gap: 40px;}
            .info-item { display: flex; flex-direction: column; gap: 4px;}
            .info-label { font-size: 12px; color: #000000; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; }
            .info-value { font-size: 16px; font-weight: 700; color: #000000; }
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #000000; margin-bottom: 15px; }
            .totals { margin-top: 40px; border-top: 2px solid #000000; padding-top: 20px; width: 300px; margin-left: auto; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #000000; }
            .total-row.final { font-size: 20px; font-weight: 900; color: #000000; margin-top: 15px; border-top: 1px solid #000000; padding-top: 15px; }
            @media print {
              body { padding: 0; }
              @page { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="data:image/png;base64,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zrt3767HWsDY2NiBlZXVtd28x3gaAAAAvo3gCAAAAFATp0+faltYKB4OS0ignmzA787AQC69s7Oz7xErtRCPx3PVkUuxFjAxcSz16NHjjWd5bV9fb8etW9N76lICAABAa0sEXQAAAADQGq5cubpd7cZR7epQ7cwRa2EbG5vL1U4a1bBM0LU0g4WFfCmbSbeH4b6oVCr5p11Qmt709O3NI7mBth84r7njUxMJoREAAAC+i44jAAAAQF0cOXKkb2trezHW+nLPnT5V+O133/WQpblG1+TGx0aKn174rBxrzfOaO3CgY/X+/furAZYFAABAExAcAQAAAOoqk8kOVLs8xFpcIhHPFAqFUtB1NINsNpsulyuhGF3T33eo4+atW7pxAAAAEFmCIwAAAEDUOk3UU66n5+DynTt31oMuJOympqZSi4tLG7EQaGtL9ufz+aWg6wAAAIAgCI4AAADQED955534k/W1r/93W7It9v6HH/pBGkHnXn0lMX1nJhOFAMnYyHDxwsWLLTEGpV5+8qN34l9+dTUbkvshVyoVF4IuAgAAABpNcAQAAICaOXP6VFt+oXh4n5vAuUOHepemp6eNjmhhp0+falvY/73SDIQRmqsbjesFAABA5AiOAAAAsGc/evvt+JVr17OVSqXeG7659va2zfHRkUcffPSxH7ItZGxs7MDKympvSEIDddPV1dl17969n7fc4VsdOzZ+YHl5JQznKDc+OlL89LPPdIsBAAAgEgRHAAAA2LUjR470bW1tpwLe7M8dOtSzND19W2eS1rmnFmOtLTcyPFS6+PkXO0EXElbn33gjfv3mrVCMrunv7+u4efOm7xcAAABanuAIAAAAzThO4tvkEonEzvGpiYfvvf+BH7tNKpPJDjSgg03QjENpku+ajo5U79zc3OOg6wAAAIB6EhwBAACgaTZxd0mQpIk16T23KwcOdBy8f//+atB1hNXIyEjnkydrT4KuQ9AHAACAVic4AgAAQFS6P+Q6OlJrugc0j9deeSVx++5MpsUDJMbXfI9zr76SmL4TintAeAQAAICWJTgCAABAVLs+5IYGc6VLX162YR9yJ0+caC+WHva38L1YJZgQ/u8i1wgAAICWJDgCAADAd3r15ZcTd2buRSFYkevsPLA6OztrbEiIDQ8Pd6+tra/EWpjxNd/t6NGj3evrG0Fffx1iAAAAaDmC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giMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAAAAAAAALgpgiMAAAAAAAAAAAAAAABuiuAIAAAAAAAAAAAAAACAmyI4AgAAAAAAAAAAAAAA4KYIjgAAAAAAAAD/r107EAAAAGAYdH/qg6w4AgAAgChxBAAAAAAAAAAgShwBAAAAAAAAAIgSRwAAAAAAAAAAosQRAAAAAAAAAIAocQQAAAAAAAAAIEocAQAAAAAAAACIEkcAAAAAAAAAAKLEEQAAAAAAAACAKHEEAAAAAAAAACBKHAEAAAAAAAAAiBJHAAAAAAAAAACixBEAAAAAAAAAgChxBAAAAAAAAAAgShwBAAAAAAAAAIgSRwAAAAAAAAAAosQRAAAAAAAAAIAocQQAAAAAAAAAIEocAQAAAAAAAACIEkcAAAAAAAAAAKLEEQAAAAAAAACAKHEEAAAAAAAAACBKHAEAAAAAAAAAiBJHAAAAAAAAAACixBEAAAAAAAAAgChxBAAAAAAAAAAgShwBAAAAAAAAAIgSRwAAAAAAAAAAosQRAAAAAAAAAIAocQQAAAAAAAAAIEocAQAAAAAAAACIEkcAAAAAAAAAAKLEEQAAAAAAAACAKHEEAAAAAAAAACBKHAEAAAAAAAAAiBJHAAAAAAAAAACixBEAAAAAAAAAgChxBAAAAAAAAAAgShwBAAAAAAAAAIgSRwAAAAAAAAAAosQRAAAAAAAAAIAocQQAAAAAAAAAIEocAQAAAAAAAACIEkcAAAAAAAAAAKLEEQAAAAAAAACAKHEEAAAAAAAAACBKHAEAAAAAAAAAiBJHAAAAAAAAAACixBEAAAAAAAAAgChxBAAAAAAAAAAgShwBAAAAAAAAAIgSRwAAAAAAAAAAosQRAAAAAAAAAIAocQQAAAAAAAAAIEocAQAAAAAAAACIEkcAAAAAAAAAAKLEEQAAAAAAAACAKHEEAAAAAAAAACBKHAEAAAAAAAAAiBJHAAAAAAAAAACixBEAAAAAAAAAgChxBAAAAAAAAAAgShwBAAAAAAAAAIgSRwAAAAAAAAAAosQRAAAAAAAAAIAocQQAAAAAAAAAIEocAQAAAAAAAACIEkcAAAAAAAAAAKLEEQAAAAAAAACAKHEEAAAAAAAAACBKHAEAAAAAAAAAiBJHAAAAAAAAAACixBEAAAAAAAAAgChxBAAAAAAAAAAgShwBAAAAAAAAAIgSRwAAAAAAAAAAosQRAAAAAAAAAIAocQQAAAAAAAAAIEocAQAAAAAAAACIEkcAAAAAAAAAAKLEEQAAAAAAAACAKHEEAAAAAAAAACBKHAEAAAAAAAAAiBJHAAAAAAAAAACixBEAAAAAAAAAgChxBAAAAAAAAAAgShwBAAAAAAAAAIgSRwAAAAAAAAAAosQRAAAAAAAAAIAocQQAAAAAAAAAIEocAQAAAAAAAACIEkcAAAAAAAAAAKLEEQAAAAAAAACAKHEEAAAAAAAAACBKHAEAAAAAAAAAiBJHAAAAAAAAAACixBEAAAAAAAAAgChxBAAAAAAAAAAgShwBAAAAAAAAAIgSRwAAAAAAAAAAosQRAAAAAAAAAIAocQQAAAAAAAAAIEocAQAAAAAAAACIEkcAAAAAAAAAAKLEEQAAAAAAAACAKHEEAAAAAAAAACBKHAEAAAAAAAAAiBJHAAAAAAAAAACixBEAAAAAAAAAgChxBAAAAAAAAAAgShwBAAAAAAAAAIgSRwAAAAAAAAAAosQRAAAAAAAAAIAocQQAAAAAAAAAYE0HqD4INsKg0IkAAAAASUVORK5CYII=" alt="Legion Logo" style="height: 5.5cm; object-fit: contain; margin-bottom: 10px; display: inline-block; max-width: 100%;" />
            </div>
            <div class="header">
              <div>
                <h1 class="title">RECIBO</h1>
                <p class="subtitle">Laboratorio Dental Legion</p>
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
                <span style="font-weight: 500;">Subtotal Base</span>
                <span>$${calc.subtotal.toFixed(2)}</span>
              </div>
              ${discountHtml}
              ${ivaHtml}
              <div class="total-row final">
                <span>Total a Cobrar</span>
                <span>$${calc.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div style="margin-top: 60px; text-align: center; font-size: 12px; color: #000000;">
              <p>Gracias por su preferencia.</p>
              <p style="font-size: 10px; margin-top: 15px; color: #000000;">Generado por Lab OS</p>
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
  const totalGeneral = filteredClinics.reduce((acc, cli) => {
    return acc + (Number(cli.total_deuda) || 0);
  }, 0);

  // Casos de la clínica seleccionada (CxC Nivel 2)
  const selectedClinicCases = cases.filter(c => c.cliente_id === selectedClinic?.id);

  // Ordenar casos de la clínica seleccionada por fecha_entrega (más antigua primero)
  const hoyStr = new Date().toISOString().split("T")[0];
  const sortedSelectedClinicCases = [...selectedClinicCases].sort((a, b) => {
    const isAActive = !a.fecha_cobro || a.fecha_cobro <= hoyStr;
    const isBActive = !b.fecha_cobro || b.fecha_cobro <= hoyStr;

    if (isAActive && !isBActive) return -1;
    if (!isAActive && isBActive) return 1;

    if (!a.fecha_entrega) return 1;
    if (!b.fecha_entrega) return -1;
    return a.fecha_entrega.localeCompare(b.fecha_entrega);
  });

  const isAnyCaseAllocated = selectedClinicCases.some(c => customAllocations[c.id] !== undefined);

  const handleToggleSelectAll = (walletBalance) => {
    if (isAnyCaseAllocated) {
      setCustomAllocations(prev => {
        const copy = { ...prev };
        selectedClinicCases.forEach(c => {
          delete copy[c.id];
        });
        return copy;
      });
    } else {
      let remaining = walletBalance;
      const newAllocations = {};
      sortedSelectedClinicCases.forEach(c => {
        const pending = Number(c.saldo_pendiente) || 0;
        if (pending > 0 && remaining > 0) {
          const fill = Math.min(pending, remaining);
          newAllocations[c.id] = Math.round(fill * 100) / 100;
          remaining = Math.round((remaining - fill) * 100) / 100;
        }
      });
      setCustomAllocations(prev => ({
        ...prev,
        ...newAllocations
      }));
    }
  };

  // Filtrado de Historial
  const filteredHistory = historyCases.filter(c => 
    c.codigo.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
    c.paciente.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
    c.clientes?.nombre.toLowerCase().includes(historySearchTerm.toLowerCase())
  );

  // Calcular total de casos pendientes
  const totalPendientes = pendingCases.reduce((acc, c) => acc + (Number(c.saldo_pendiente) || 0), 0);

  let currentTableHeader = null;
  let currentTableFooter = null;
  let currentSubHeader = null;

  if (activeTab === "pendientes") {
    currentTableHeader = (
      <div className="grid grid-cols-[100px_minmax(150px,2fr)_minmax(200px,3fr)_180px_150px_150px] gap-4 px-6 py-4 items-center">
        <div className="font-bold">Folio</div>
        <div className="font-bold">Clínica / Paciente</div>
        <div className="font-bold">Descripción</div>
        <div className="font-bold">Llegada a Facturación</div>
        <div className="font-bold">Saldo Pendiente</div>
        <div className="font-bold text-center">Acciones</div>
      </div>
    );
    currentTableFooter = pendingCases.length > 0 ? (
      <div className="bg-slate-50/80 px-6 py-4 flex justify-between items-center shrink-0 rounded-b-2xl">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider cursor-help" title="Total Acumulado Sin Enviar">
          Total:
        </span>
        <span className="text-lg font-black text-rose-600">
          ${totalPendientes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      </div>
    ) : null;
  } else if (activeTab === "history") {
    currentSubHeader = (
      <div className="mb-4 relative max-w-md shrink-0 pointer-events-auto">
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
    );
    currentTableHeader = (
      <div className="grid grid-cols-[100px_minmax(150px,1.5fr)_minmax(150px,1.5fr)_150px_100px_150px_100px] gap-4 px-6 py-4 items-center">
        <div className="font-bold">Folio</div>
        <div className="font-bold">Clínica</div>
        <div className="font-bold">Paciente</div>
        <div className="font-bold">Fecha Entrega</div>
        <div className="font-bold">Total</div>
        <div className="font-bold">Estado Pago</div>
        <div className="font-bold text-right">Detalle</div>
      </div>
    );
  } else if (activeTab === "cxc") {
    if (!selectedClinic) {
      currentSubHeader = (
        <div className="mb-4 relative max-w-md shrink-0 pointer-events-auto">
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
      );
      currentTableHeader = (
        <div className="grid grid-cols-[minmax(250px,2fr)_150px_200px_80px] gap-4 px-6 py-4 items-center">
          <div className="font-bold">Clínica</div>
          <div className="font-bold">Casos</div>
          <div className="font-bold">Balance</div>
          <div className="font-bold text-right">Detalle</div>
        </div>
      );
      currentTableFooter = filteredClinics.length > 0 ? (
        <div className="bg-slate-50/80 px-6 py-4 flex justify-between items-center shrink-0 rounded-b-2xl">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total General Cuentas por Cobrar:
          </span>
          <span className={`text-lg font-black ${totalGeneral < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ) : null;
    } else {
      const currentClinicData = allClinics.find(cl => cl.id === selectedClinic.id) || selectedClinic;
      const totalAssigned = Object.keys(customAllocations).reduce((acc, caseId) => acc + (Number(customAllocations[caseId]) || 0), 0);
      const remainingToDistribute = (Number(currentClinicData?.saldo_favor) || 0) - totalAssigned;
      
      currentSubHeader = (
        <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center pointer-events-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedClinic(null);
                setWalletBalance(0);
                setCustomAllocations({});
              }}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-white flex items-center justify-center font-black text-lg shadow-sm">
                {selectedClinic.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedClinic.nombre}</h3>
                <p className="text-xs text-slate-500">Detalle de cuenta corriente</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-white px-6 py-2.5 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
            <div className="flex flex-col pr-6 border-r border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cartera / Saldo A Favor</span>
              <span className={`text-lg font-black mt-0.5 ${remainingToDistribute > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                ${remainingToDistribute.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deuda Activa</span>
              <span className="text-lg font-black mt-0.5 text-rose-600">
                ${selectedClinicCases.reduce((acc, c) => (!c.fecha_cobro || c.fecha_cobro <= new Date().toISOString().split("T")[0]) ? acc + (Number(c.saldo_pendiente) || 0) : acc, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      );
      currentTableHeader = (
        <div className="grid grid-cols-[85px_120px_minmax(150px,2fr)_120px_100px_100px_150px_120px_200px] gap-4 px-6 py-4 items-center">
          <div className="font-bold text-center">Asignar</div>
          <div className="font-bold">Folio</div>
          <div className="font-bold">Paciente</div>
          <div className="font-bold">Fecha Entrega</div>
          <div className="font-bold text-center">IVA (8%)</div>
          <div className="font-bold">Total</div>
          <div className="font-bold">Saldo Pendiente</div>
          <div className="font-bold">Abonar ($)</div>
          <div className="font-bold text-right">Acción</div>
        </div>
      );
      currentTableFooter = null;
    }
  }

  return (
    <>
      <GlassLayout
        title="Módulo Financiero y Facturación"
        subtitle="Administración de cuentas por cobrar, registro de abonos y control de historial de pagos."
        icon={<Wallet size={24} className="text-[#D4AF37]" />}
        iconBg="bg-[#D4AF37]/10 border-[#D4AF37]/20"
        scrollbarClass="facturacion-scroll"
        scrollbarColor="#D4AF37"
        subHeader={currentSubHeader}
        tableHeader={currentTableHeader}
        tableFooter={currentTableFooter}
        headerActions={
          <>
            {activeTab === "cxc" && (
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
            )}
            {activeTab === "pendientes" && (
              <button
                onClick={() => setIsNewCaseModalOpen(true)}
                title="Nuevo Trabajo"
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white rounded-xl font-bold shadow-md hover-lift transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Nuevo Trabajo
              </button>
            )}
            <button 
              onClick={fetchData} 
              disabled={loading}
              title="Actualizar Datos"
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm hover:rotate-180 transition-all duration-500 cursor-pointer disabled:opacity-50 flex items-center justify-center"
            >
              <RefreshCw size={20} className={loading ? "animate-spin text-amber-500" : ""} />
            </button>
          </>
        }
        tabs={
          <>
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
          </>
        }
        tableHeader={null}
      >
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
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm md:overflow-visible overflow-hidden flex flex-col">
                  <div className="md:overflow-visible overflow-x-auto flex-1">
                    <div className="flex flex-col divide-y divide-slate-100 min-w-[800px]">
                        {pendingCases.length === 0 ? (
                          <div className="px-6 py-8 text-center text-slate-400">
                            No hay casos pendientes sin enviar.
                          </div>
                        ) : (
                          pendingCases.map((c) => {
                            const isSent = sentCaseId === c.id;
                            const isSending = sendingCaseId === c.id;
                            return (
                              <div
                                key={c.id}
                                className={`grid grid-cols-[100px_minmax(150px,2fr)_minmax(200px,3fr)_180px_150px_150px] gap-4 px-6 py-4 items-center text-sm transition-all duration-500 ${
                                  isSent
                                    ? "bg-emerald-50 scale-[0.99] opacity-60"
                                    : "hover:bg-slate-50/50"
                                }`}
                              >
                                <div className="font-bold text-slate-800">
                                  #{c.codigo}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-800">{c.clientes?.nombre || "N/A"}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{c.paciente}</div>
                                </div>
                                <div>
                                  {c.casos_detalle?.map((d, i) => (
                                    <div key={i} className="text-xs font-medium text-slate-600">
                                      <span className="font-bold text-slate-800">{d.unidades}x</span> {d.producto} {d.material && `(${d.material})`}
                                    </div>
                                  ))}
                                  {(!c.casos_detalle || c.casos_detalle.length === 0) && <span className="text-slate-400 text-xs">Sin detalles</span>}
                                </div>
                                <div className="text-slate-600 text-xs font-medium">
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
                                </div>
                                <div>
                                  <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1 text-xs">
                                    <DollarSign size={12} className="text-rose-500" />
                                    {Number(c.saldo_pendiente).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="text-center">
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
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

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


                    {filteredClinics.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <CheckCircle2 className="mx-auto text-emerald-500 w-12 h-12 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800">¡Al día!</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                          No se encontraron clínicas con saldo pendiente acumulado en el departamento de Facturación.
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm md:overflow-visible overflow-hidden flex flex-col">
                        <div className="md:overflow-visible overflow-x-auto flex-1">
                          <div className="flex flex-col divide-y divide-slate-100 min-w-[600px]">
                              {filteredClinics.map((cli) => (
                                <div key={cli.id} className="grid grid-cols-[minmax(250px,2fr)_150px_200px_80px] gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors cursor-pointer group text-sm" onClick={() => handleSelectClinic(cli)}>
                                  <div className="font-bold text-slate-800 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 text-[#D4AF37] flex items-center justify-center font-black group-hover:bg-[#D4AF37] group-hover:text-white transition-colors shrink-0">
                                      {cli.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="group-hover:text-[#D4AF37] group-hover:translate-x-1.5 transition-all duration-200 inline-block truncate">{cli.nombre}</span>
                                  </div>
                                  <div className="text-slate-600 font-medium">
                                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                      {cli.casos_count} {cli.casos_count === 1 ? 'caso' : 'casos'}
                                    </span>
                                  </div>
                                  <div>
                                    {cli.total_deuda < 0 ? (
                                      <span className="font-black text-emerald-600">
                                        ${Math.abs(cli.total_deuda).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    ) : cli.total_deuda === 0 ? (
                                      <span className="font-bold text-slate-400">
                                        $0.00
                                      </span>
                                    ) : (
                                      <span className="font-black text-rose-600">
                                        ${cli.total_deuda.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <button className="p-1.5 bg-slate-50 group-hover:bg-amber-50 text-slate-400 group-hover:text-[#D4AF37] rounded-lg transition-all group-hover:translate-x-0.5 inline-flex">
                                      <ChevronRight size={18} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                        
                        {/* Resumen General de Cuentas por Cobrar */}
                      </div>
                    )}
                  </div>
                ) : (
                  /* CxC - Nivel 2: Detalle de Casos de la Clínica */
                  <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">


                    {/* Cartera / Saldo a Favor de la clínica */}
                    {(() => {
                      const currentClinicData = allClinics.find(cl => cl.id === selectedClinic.id) || selectedClinic;
                      const walletBalance = Number(currentClinicData?.saldo_favor) || 0;
                      const totalAssigned = Object.keys(customAllocations).reduce((acc, caseId) => acc + (Number(customAllocations[caseId]) || 0), 0);
                      const remainingToDistribute = walletBalance - totalAssigned;

                      return (
                        <div className="py-4 pr-6 pl-6 bg-amber-50/40 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                          <div className="flex items-center flex-1 w-full">
                            {/* Casilla superior de asignar/seleccionar todos alineada con la columna "Asignar" */}
                            <div className="w-[85px] flex justify-center shrink-0">
                              <input 
                                type="checkbox" 
                                checked={isAnyCaseAllocated} 
                                onChange={() => handleToggleSelectAll(walletBalance)} 
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded cursor-pointer border-slate-300"
                                title="Seleccionar/Deseleccionar todos los casos y distribuir saldo disponible" 
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto pl-6 md:pl-0">
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
                          <>
                            <div className="flex flex-col divide-y divide-slate-100 min-w-[1000px]">
                              {sortedSelectedClinicCases.length === 0 ? (
                                <div className="px-6 py-8 text-center text-slate-400">
                                  No hay casos con saldo pendiente para esta clínica.
                                </div>
                              ) : (
                                sortedSelectedClinicCases.map((c) => {
                                  const isAllocated = customAllocations[c.id] !== undefined;
                                  const allocatedAmount = customAllocations[c.id] !== undefined ? customAllocations[c.id] : "";

                                  const isUpcoming = c.fecha_cobro && c.fecha_cobro > new Date().toISOString().split("T")[0];
                                  const opacityClass = isUpcoming && !isAllocated ? "opacity-50 grayscale hover:grayscale-0 hover:opacity-100 focus-within:opacity-100 focus-within:grayscale-0 transition-all" : "transition-colors";

                                  return (
                                    <div key={c.id} className={`grid grid-cols-[85px_120px_minmax(150px,2fr)_120px_100px_100px_150px_120px_200px] gap-4 px-6 py-4 items-center hover:bg-slate-50/50 text-sm ${opacityClass}`}>
                                      <div className="text-center w-full">
                                        <input 
                                          type="checkbox" 
                                          checked={isAllocated} 
                                          onChange={() => handleToggleCaseSelection(c.id, Number(c.saldo_pendiente), walletBalance)} 
                                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded cursor-pointer border-slate-300" 
                                        />
                                      </div>
                                      <div className="font-bold text-slate-800 flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-2">
                                          {(() => {
                                            let color = "bg-rose-500"; // Rojo por defecto si no hay promesa o ya pasó
                                            const hoy = new Date().toISOString().split("T")[0];
                                            if (c.promesa_pago_fecha) {
                                              if (c.promesa_pago_fecha > hoy) {
                                                color = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
                                              } else if (c.promesa_pago_fecha === hoy) {
                                                color = "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse";
                                              }
                                            }
                                            return <div title={c.promesa_pago_fecha ? `Promesa: ${c.promesa_pago_fecha}` : 'Sin promesa vigente'} className={`w-2.5 h-2.5 rounded-full ${color}`} />;
                                          })()}
                                          #{c.codigo}
                                        </div>
                                        {isUpcoming && <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Próximo cobro</span>}
                                      </div>
                                      <div className="font-semibold text-slate-700 truncate">
                                        {c.paciente}
                                      </div>
                                      <div className="text-slate-600 text-xs">
                                        {c.fecha_entrega ? (
                                          <span className="flex items-center gap-1">
                                            <Calendar size={12} className="text-slate-400" />
                                            {c.fecha_entrega}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </div>
                                      <div className="text-center">
                                        <input 
                                          type="checkbox" 
                                          checked={c.iva_aplicado || false} 
                                          onChange={(e) => handleToggleIVA(c, e.target.checked)} 
                                          className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37] rounded cursor-pointer border-slate-300" 
                                        />
                                      </div>
                                      <div className="font-medium text-slate-600">
                                        ${c.total_caso
                                          ? (c.iva_aplicado
                                              ? (Number(c.total_caso) / 1.08).toFixed(2)
                                              : Number(c.total_caso).toFixed(2))
                                          : "0.00"}
                                      </div>
                                      <div>
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
                                      </div>
                                      <div>
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
                                      </div>
                                      <div className="text-right flex justify-end gap-2">
                                        <button
                                          title="Promesa de Pago"
                                          onClick={() => setPromesaModalCase(c)}
                                          className="inline-flex items-center justify-center w-8 h-8 text-amber-500 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                                        >
                                          <Calendar size={18} />
                                        </button>
                                        <button
                                          title="Ajustes de Cobro"
                                          onClick={() => openReceiptModal(c)}
                                          className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                        >
                                          <Edit size={18} />
                                        </button>
                                        <button
                                          title="Imprimir Recibo"
                                          onClick={() => handlePrintReceipt(c)}
                                          className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                                        >
                                          <FileText size={18} />
                                        </button>
                                        <button
                                          title="Registrar Abono"
                                          onClick={() => handleOpenAbono(c)}
                                          className="inline-flex items-center justify-center w-8 h-8 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                        >
                                          <PlusCircle size={18} />
                                        </button>
                                        <button
                                          title="Cancelar Caso"
                                          onClick={() => setCancelModalCase(c)}
                                          className="inline-flex items-center justify-center w-8 h-8 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer ml-2"
                                        >
                                          <AlertCircle size={18} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                          </div>
                          {sortedSelectedClinicCases.length > 0 && (
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-4">
                              <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Total general</span>
                              <span className="text-lg font-black text-slate-800">
                                ${sortedSelectedClinicCases.reduce((acc, c) => acc + (Number(c.saldo_pendiente) || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          </>
                        );
                      })()}
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
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm md:overflow-visible overflow-hidden flex flex-col">
                  <div className="md:overflow-visible overflow-x-auto flex-1">
                    <div className="flex flex-col divide-y divide-slate-100 min-w-[800px]">
                        {filteredHistory.length === 0 ? (
                          <div className="px-6 py-8 text-center text-slate-400">
                            No se encontraron registros de casos pagados.
                          </div>
                        ) : (
                          filteredHistory.map((c) => {
                            const isExpanded = expandedCaseId === c.id;
                            return (
                              <div key={c.id} className="flex flex-col">
                                <div className="grid grid-cols-[100px_minmax(150px,1.5fr)_minmax(150px,1.5fr)_150px_100px_150px_100px] gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors text-sm">
                                      <div className="font-bold text-slate-800 flex items-center gap-2">
                                        {(() => {
                                          let color = "bg-rose-500"; // Rojo por defecto si no hay promesa o ya pasó
                                          const hoy = new Date().toISOString().split("T")[0];
                                          if (c.promesa_pago_fecha) {
                                            if (c.promesa_pago_fecha > hoy) {
                                              color = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
                                            } else if (c.promesa_pago_fecha === hoy) {
                                              color = "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse";
                                            }
                                          }
                                          return <div title={c.promesa_pago_fecha ? `Promesa: ${c.promesa_pago_fecha}` : 'Sin promesa vigente'} className={`w-2.5 h-2.5 rounded-full ${color}`} />;
                                        })()}
                                        #{c.codigo}
                                      </div>
                                  <div className="font-semibold text-slate-700 max-w-[200px] truncate">
                                    {c.clientes?.nombre || "N/A"}
                                  </div>
                                  <div className="text-slate-700 font-medium">
                                    {c.paciente}
                                  </div>
                                  <div className="text-slate-500 text-xs">
                                    {c.fecha_entrega || "—"}
                                  </div>
                                  <div className="font-bold text-slate-800">
                                    ${Number(c.total_caso).toFixed(2)}
                                  </div>
                                  <div>
                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 text-[10px]">
                                      Pagado
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <button
                                      onClick={() => setExpandedCaseId(isExpanded ? null : c.id)}
                                      className="text-xs font-bold text-slate-500 hover:text-[#D4AF37] px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                                    >
                                      {isExpanded ? "Ocultar Abonos" : "Ver Abonos"}
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Desglose de Abonos Expandible */}
                                {isExpanded && (
                                  <div className="col-span-7 bg-slate-50/50 w-full p-0 border-b border-slate-100">
                                    <div className="w-full p-6">
                                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-inner max-w-3xl">
                                        <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">Historial de abonos registrados:</h4>
                                        {(!c.pagos || c.pagos.length === 0) ? (
                                          <p className="text-xs text-slate-400">No hay pagos registrados para este caso.</p>
                                        ) : (
                                          <>
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
                                            <div className="mt-4 flex justify-end">
                                              <button 
                                                onClick={() => setRevertModalCase(c)}
                                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors border border-rose-200"
                                              >
                                                Revertir Último Abono
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
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
      </GlassLayout>

      {/* REGISTRAR ABONO MODAL */}
      {abonoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-md transition-opacity" onClick={() => setAbonoModal(null)}></div>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[24px] w-full max-w-md relative z-10 md:overflow-visible overflow-hidden flex flex-col"
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
            className="bg-white/90 backdrop-blur-md rounded-[24px] w-full max-w-md relative z-10 md:overflow-visible overflow-hidden flex flex-col border border-white/20"
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
      <NewCaseModal 
        isOpen={isNewCaseModalOpen} 
        onClose={() => setIsNewCaseModalOpen(false)} 
        clients={doctores} 
        onActionComplete={fetchData} 
        initialDepto="Facturación"
      />

      {/* MODAL REVERTIR PAGO */}
      <AnimatePresence>
        {revertModalCase && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRevertModalCase(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
              <button onClick={() => setRevertModalCase(null)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X size={18} /></button>
              <div className="flex items-center gap-3 text-rose-600 mb-2"><AlertCircle size={24} /><h3 className="text-lg font-black tracking-tight">Revertir Último Abono</h3></div>
              <p className="text-sm text-slate-500 mb-4">Vas a revertir el abono más reciente del caso <strong>#{revertModalCase.codigo}</strong>. Ingresa el motivo.</p>
              <form onSubmit={handleRevertirPago}>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Motivo de la Reversión</label>
                  <textarea value={motivoReversion} onChange={(e) => setMotivoReversion(e.target.value)} required rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="Ej: Error al teclear el monto..."></textarea>
                </div>
                <div className="flex justify-end gap-3"><button type="button" onClick={() => setRevertModalCase(null)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button><button type="submit" disabled={submittingReversion} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center min-w-[120px]">{submittingReversion ? <RefreshCw size={16} className="animate-spin" /> : "Confirmar Reversión"}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CANCELAR CASO */}
      <AnimatePresence>
        {cancelModalCase && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setCancelModalCase(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
              <button onClick={() => setCancelModalCase(null)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X size={18} /></button>
              <div className="flex items-center gap-3 text-rose-600 mb-2"><AlertCircle size={24} /><h3 className="text-lg font-black tracking-tight">Cancelar Caso</h3></div>
              <p className="text-sm text-slate-500 mb-4">El saldo pendiente quedará en cero. Si hay pagos previos, pasarán a Saldo a Favor. Ingresa el motivo.</p>
              <form onSubmit={handleCancelarCaso}>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Motivo de Cancelación</label>
                  <textarea value={motivoCancelacion} onChange={(e) => setMotivoCancelacion(e.target.value)} required rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="Ej: Trabajo cancelado por la clínica..."></textarea>
                </div>
                <div className="flex justify-end gap-3"><button type="button" onClick={() => setCancelModalCase(null)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Volver</button><button type="submit" disabled={submittingCancelacion} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center min-w-[120px]">{submittingCancelacion ? <RefreshCw size={16} className="animate-spin" /> : "Confirmar Cancelación"}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PROMESA DE PAGO */}
      <AnimatePresence>
        {promesaModalCase && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPromesaModalCase(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
              <button onClick={() => setPromesaModalCase(null)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X size={18} /></button>
              <div className="flex items-center gap-3 text-amber-500 mb-2"><Calendar size={24} /><h3 className="text-lg font-black tracking-tight">Registrar Promesa de Pago</h3></div>
              <p className="text-sm text-slate-500 mb-4">Caso <strong>#{promesaModalCase.codigo}</strong>. Selecciona la nueva fecha acordada.</p>
              <form onSubmit={handleRegistrarPromesa}>
                <div className="mb-4">
                  <input type="date" value={fechaPromesa} onChange={(e) => setFechaPromesa(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none transition-all" />
                </div>
                <div className="flex justify-end gap-3"><button type="button" onClick={() => setPromesaModalCase(null)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button><button type="submit" disabled={submittingPromesa} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center min-w-[120px]">{submittingPromesa ? <RefreshCw size={16} className="animate-spin" /> : "Guardar Fecha"}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

