"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { getCaseDetailsForEdit, updateCaseFinancials } from '@/app/actions/cases';
import { deleteAdminCase } from '@/app/actions/admin-cases';
import { getProducts } from '@/app/actions/products';

export default function EditCaseModal({ caseData, onClose, onUpdated }) {
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
      setDetalles(res.detalles || []);
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

  const handleProductChange = (index, rawProducto) => {
    const newDetalles = [...detalles];
    newDetalles[index].producto = rawProducto;
    // Find price in the grouped catalog
    let newPrice = 0;
    for (const cat of Object.values(productosCat)) {
      const found = cat.find(p => p.raw === rawProducto);
      if (found) {
        newPrice = found.precio;
        break;
      }
    }
    newDetalles[index].precio_unit = newPrice;
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

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading("Guardando cambios...");
    try {
      const res = await updateCaseFinancials(caseData.id, detalles, montoDescuentoReal, ivaAplicado);
      if (res.success) {
        toast.success("Caso actualizado correctamente", { id: toastId });
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
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Editar Caso #{caseData?.codigo}</h2>
              <p className="text-sm text-slate-500">Paciente: {caseData?.paciente}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
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
                          <th className="px-4 py-3 min-w-[200px]">Concepto / Material (Tipo)</th>
                          <th className="px-4 py-3 w-32">Piezas</th>
                          <th className="px-4 py-3 w-24">Cant.</th>
                          <th className="px-4 py-3 w-32">Precio Unit.</th>
                          <th className="px-4 py-3 w-32 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detalles.map((det, idx) => (
                          <tr key={det.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <select
                                value={det.producto || ''}
                                onChange={(e) => handleProductChange(idx, e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-slate-700 font-medium bg-white"
                              >
                                <option value="" disabled>Seleccione un producto</option>
                                {/* Add current product if not in list */}
                                {det.producto && !Object.values(productosCat).flat().some(p => p.raw === det.producto) && (
                                  <option value={det.producto}>{det.producto}</option>
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
                onClick={handleSave}
                disabled={saving || loading}
                className="px-5 py-2 text-sm font-bold text-white bg-[#D4AF37] hover:bg-[#B8860B] rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
