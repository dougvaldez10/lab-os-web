"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { getCaseDetailsForEdit, updateCaseFinancials, returnCaseToBoard } from '@/app/actions/cases';
import { deleteAdminCase } from '@/app/actions/admin-cases';
import { getProducts } from '@/app/actions/products';
import { logShadowAudit, markShadowAuditAsSaved } from '@/app/actions/audit';

export default function EditCaseModal({ caseData, onClose, onUpdated, isReceiptMode = false, onPrintReceipt = null }) {
  const [detalles, setDetalles] = useState([]);
  const [descuento, setDescuento] = useState(0);
  const [descuentoTipo, setDescuentoTipo] = useState('fijo'); // 'fijo' or 'porcentaje'
  const [ivaAplicado, setIvaAplicado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [productosCat, setProductosCat] = useState({});

  useEffect(() => {
    if (caseData) {
      loadData();
    }
  }, [caseData]);

  const handleDelete = async () => {
    setSaving(true);
    const toastId = toast.loading("Eliminando caso...");
    try {
      const res = await deleteAdminCase(caseData.id);
      if (res.success) {
        toast.success("Caso eliminado correctamente", { id: toastId });
        onUpdated();
        onClose();
      } else {
        toast.error("Error al eliminar", { id: toastId });
      }
    } catch (err) {
      toast.error("Error de conexión", { id: toastId });
    }
    setSaving(false);
  };

  const loadData = async () => {
    setLoading(true);
    const [res, prods] = await Promise.all([
      getCaseDetailsForEdit(caseData.id),
      getProducts()
    ]);
    
    if (res.success) {
      setDetalles(res.detalles ? res.detalles.map(d => {
        const parts = (d.producto || '').split(' - ');
        const prodBase = parts[0] || '';
        let resolvedPrice = Number(d.precio_unit) || 0;
        
        if (resolvedPrice === 0 && prodBase) {
          const cleanProdBase = prodBase.trim().toLowerCase();
          for (const cat of Object.values(prods || {})) {
            const found = cat.find(p => p.raw.toLowerCase() === cleanProdBase || p.display.toLowerCase() === cleanProdBase);
            if (found) {
              resolvedPrice = found.precio;
              break;
            }
          }
        }

        return {
          ...d,
          producto_base: prodBase,
          subtipo: parts[1] || '',
          precio_unit: resolvedPrice,
          precio_original: resolvedPrice
        };
      }) : []);
      setDescuento(Number(res.master?.descuento) || 0);
      setIvaAplicado(res.master?.iva_aplicado || false);
    } else {
      toast.error("Error al cargar detalles del caso");
    }
    setProductosCat(prods || {});
    setLoading(false);
  };

  const handleDetailChange = (index, field, value) => {
    const newDetalles = [...detalles];
    newDetalles[index][field] = value;
    setDetalles(newDetalles);
  };

  const handleProductChange = (index, baseName) => {
    const newDetalles = [...detalles];
    newDetalles[index].producto_base = baseName;
    newDetalles[index].producto = newDetalles[index].subtipo ? `${baseName} - ${newDetalles[index].subtipo}` : baseName;
    // Find price in the grouped catalog
    let newPrice = 0;
    for (const cat of Object.values(productosCat)) {
      const found = cat.find(p => p.raw === baseName);
      if (found) {
        newPrice = found.precio;
        break;
      }
    }
    newDetalles[index].precio_unit = newPrice;
    newDetalles[index].precio_original = newPrice;
    setDetalles(newDetalles);
  };

  const handleSubtipoChange = (index, sub) => {
    const newDetalles = [...detalles];
    newDetalles[index].subtipo = sub;
    newDetalles[index].producto = sub ? `${newDetalles[index].producto_base || ''} - ${sub}` : newDetalles[index].producto_base || '';
    setDetalles(newDetalles);
  };

  const handleAddRow = () => {
    setDetalles([
      ...detalles,
      {
        id: `temp_${Date.now()}`,
        producto: '',
        producto_base: '',
        subtipo: '',
        dientes: '',
        unidades: 1,
        precio_unit: 0,
        precio_original: 0
      }
    ]);
  };

  const handleRemoveRow = (index) => {
    const newDetalles = [...detalles];
    newDetalles.splice(index, 1);
    setDetalles(newDetalles);
  };

  const calcularSubtotalGeneral = () => {
    return detalles.reduce((acc, det) => {
      const cant = Number(det.unidades) || 0;
      const pu = Number(det.precio_unit) || 0;
      return acc + (cant * pu);
    }, 0);
  };

  const subtotal = calcularSubtotalGeneral();
  const montoDescuentoReal = descuentoTipo === 'porcentaje' 
    ? subtotal * (Number(descuento) / 100) 
    : Number(descuento);

  const subtotalConDescuento = Math.max(0, subtotal - montoDescuentoReal);
  const total = ivaAplicado ? subtotalConDescuento * 1.08 : subtotalConDescuento;

  const handleReturnToBoard = async () => {
    if (!window.confirm("¿Seguro que deseas devolver este caso al Pizarrón (Inspección)? Se quitará de Facturación.")) return;
    
    setSaving(true);
    const toastId = toast.loading("Devolviendo caso...");
    try {
      const res = await returnCaseToBoard(caseData.id);
      if (res.success) {
        toast.success("Caso devuelto a Inspección", { id: toastId });
        onUpdated();
        onClose();
      } else {
        toast.error(res.error || "Error al devolver", { id: toastId });
      }
    } catch (err) {
      toast.error("Error de conexión", { id: toastId });
    }
    setSaving(false);
  };

  // Shadow Audit Sombra
  useEffect(() => {
    if (loading || !caseData) return;
    
    // Evita el primer render donde los datos apenas cargan
    const snapshot = {
      detalles,
      descuento,
      descuentoTipo,
      ivaAplicado,
      subtotal,
      total,
      montoDescuentoReal
    };

    const timer = setTimeout(() => {
      logShadowAudit({
        caso_id: caseData.id,
        codigo_caso: caseData.codigo,
        snapshot_data: snapshot,
        guardado_oficial: false
      }).catch(() => {});
    }, 3000);

    return () => clearTimeout(timer);
  }, [detalles, descuento, descuentoTipo, ivaAplicado]);

  const handleSave = async (shouldPrint = false) => {
    setSaving(true);
    const toastId = toast.loading("Guardando cambios...");
    try {
      const res = await updateCaseFinancials(caseData.id, detalles, montoDescuentoReal, ivaAplicado);
      if (res.success) {
        logShadowAudit({
          caso_id: caseData.id,
          codigo_caso: caseData.codigo,
          snapshot_data: { detalles, descuento, descuentoTipo, ivaAplicado, subtotal, total },
          guardado_oficial: true
        }).catch(() => {});
        markShadowAuditAsSaved(caseData.id).catch(() => {});
        
        toast.success("Caso actualizado correctamente", { id: toastId });

        if (shouldPrint && onPrintReceipt) {
          const caseObjForPrint = {
            id: caseData.codigo,
            patient: caseData.paciente,
            doctor: caseData.doctor || caseData.clientes?.nombre,
            items: detalles.map(d => ({
              unidades: d.unidades,
              producto: d.producto,
              dientes: d.dientes
            }))
          };
          const calcForPrint = {
            subtotal: subtotal,
            discountAmount: montoDescuentoReal,
            ivaAmount: ivaAplicado ? subtotalConDescuento * 0.08 : 0,
            total: total
          };
          onPrintReceipt(calcForPrint, caseObjForPrint);
        }

        onUpdated();
        onClose();
      } else {
        toast.error("Error al guardar: " + res.error, { id: toastId });
      }
    } catch (err) {
      toast.error("Error de conexión", { id: toastId });
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose}></motion.div>
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.95, opacity: 0 }} 
          className="bg-white rounded-[24px] w-full max-w-4xl relative z-10 flex flex-col max-h-[90vh]"
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 -10px 40px -15px rgba(0, 0, 0, 0.1)' }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-baseline gap-2">
                {isReceiptMode ? `Borrador de Recibo #${caseData?.codigo}` : `Editar Caso #${caseData?.codigo}`}
                {caseData?.estado && (
                  <span className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${caseData.estado === 'Terminado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {caseData.estado}
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-1">
                <span><span className="font-bold text-slate-700">Paciente:</span> {caseData?.paciente}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span><span className="font-bold text-slate-700">Clínica:</span> {caseData?.clientes?.nombre || caseData?.cliente_nombre || 'General'}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span><span className="font-bold text-slate-700">Dentista:</span> {caseData?.doctor || 'No asignado'}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleReturnToBoard} disabled={saving} className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200">
                Devolver a Pizarrón
              </button>
              <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Tabla de Conceptos */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3">Conceptos del Caso</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 min-w-[200px]">Concepto / Material</th>
                          <th className="px-4 py-3 w-32">Subtipo</th>
                          <th className="px-4 py-3 w-32">Piezas</th>
                          <th className="px-4 py-3 w-24">Cant.</th>
                          <th className="px-4 py-3 w-32">Precio Unit.</th>
                          <th className="px-4 py-3 w-32 text-right">Subtotal</th>
                          <th className="px-2 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detalles.map((det, idx) => (
                          <tr key={det.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <select
                                value={det.producto_base || ''}
                                onChange={(e) => handleProductChange(idx, e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-slate-700 font-medium bg-white"
                              >
                                <option value="" disabled>Seleccione un producto</option>
                                {/* Add current product if not in list */}
                                {det.producto_base && !Object.values(productosCat).flat().some(p => p.raw === det.producto_base) && (
                                  <option value={det.producto_base}>{det.producto_base}</option>
                                )}
                                {Object.entries(productosCat).map(([cat, prods]) => (
                                  <optgroup key={cat} label={cat}>
                                    {prods.map(p => (
                                      <option key={p.raw} value={p.raw}>{p.display}</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={det.subtipo || ''}
                                onChange={(e) => handleSubtipoChange(idx, e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-slate-700 font-medium bg-white"
                              >
                                <option value="">Ninguno</option>
                                <optgroup label="Emax">
                                  <option value="HT">HT</option>
                                  <option value="LT">LT</option>
                                  <option value="MT">MT</option>
                                  <option value="MO">MO</option>
                                </optgroup>
                                <optgroup label="Zirconia / PMMA">
                                  <option value="ML">ML</option>
                                  <option value="Mono">Mono</option>
                                </optgroup>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={det.dientes || ''}
                                onChange={(e) => handleDetailChange(idx, 'dientes', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-slate-600"
                                placeholder="Ej. 11, 12"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={det.unidades}
                                onChange={(e) => handleDetailChange(idx, 'unidades', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="number"
                                  value={det.precio_unit}
                                  onChange={(e) => handleDetailChange(idx, 'precio_unit', e.target.value)}
                                  className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">
                              ${((Number(det.unidades) || 0) * (Number(det.precio_unit) || 0)).toFixed(2)}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                title="Eliminar fila"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {detalles.length === 0 && (
                          <tr>
                            <td colSpan="5" className="px-4 py-6 text-center text-slate-400">
                              No hay conceptos registrados
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Boton Agregar Linea */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="text-xs font-bold text-[#D4AF37] hover:text-[#B8860B] flex items-center gap-1.5 transition-colors bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 px-3 py-1.5 rounded-lg"
                    >
                      <Plus size={14} />
                      Agregar Concepto
                    </button>
                  </div>
                </div>

                {/* Resumen Financiero */}
                <div className="flex justify-end">
                  <div className="w-full max-w-sm bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Subtotal General:</span>
                      <span className="font-semibold">${subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span>Descuento</span>
                        <div className="flex bg-slate-200 rounded-lg p-0.5">
                          <button
                            onClick={() => setDescuentoTipo('fijo')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${descuentoTipo === 'fijo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                          >
                            $
                          </button>
                          <button
                            onClick={() => setDescuentoTipo('porcentaje')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${descuentoTipo === 'porcentaje' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                          >
                            %
                          </button>
                        </div>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          value={descuento}
                          onChange={(e) => setDescuento(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-right text-sm focus:ring-2 focus:ring-rose-500 outline-none text-rose-600 font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                        <input
                          type="checkbox"
                          checked={ivaAplicado}
                          onChange={(e) => setIvaAplicado(e.target.checked)}
                          className="w-4 h-4 text-[#D4AF37] rounded focus:ring-[#D4AF37]"
                        />
                        Aplicar IVA (8%)
                      </label>
                      <span className="font-semibold text-slate-600">
                        ${ivaAplicado ? (subtotalConDescuento * 0.08).toFixed(2) : "0.00"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-300">
                      <span className="text-lg font-black text-slate-800">Total Final:</span>
                      <span className="text-xl font-black text-[#D4AF37]">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between gap-3">
            <div>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving || loading}
                  className="px-4 py-2 text-sm font-bold text-rose-500 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Eliminar Caso
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-600">¿Estás seguro?</span>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving || loading}
                className="px-5 py-2 text-sm font-bold text-white bg-[#D4AF37] hover:bg-[#B8860B] rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save size={16} />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
              {isReceiptMode && (
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving || loading}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Save size={16} />
                  {saving ? "Guardando..." : "Guardar e Imprimir Recibo"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
