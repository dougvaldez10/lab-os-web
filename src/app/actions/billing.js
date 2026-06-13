"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function checkAdminAccess() {
  const user = await getCurrentUser();
  const isSuperAdmin = user?.is_superadmin || user?.rol === 'lab_owner';
  const isAdminRole = user?.rol?.toLowerCase().includes('admin') || user?.rol?.toLowerCase().includes('administrativo');
  const isExplicitAdmin = user?.username?.toLowerCase() === 'admin' || user?.username?.toLowerCase() === 'coloraturacorp' || user?.username?.toLowerCase() === 'legion';
  
  if (!user || (!isSuperAdmin && !isAdminRole && !isExplicitAdmin)) {
    throw new Error('No autorizado');
  }
}

/**
 * Registra un abono para un caso específico.
 * Lógica transaccional (cliente admin):
 * - Inserta el abono en pagos_historico.
 * - Resta el abono de casos_master.saldo_pendiente.
 * - Si saldo_pendiente <= 0, actualiza estado_pago = 'Pagado'.
 */
export async function registrarAbono({ id_caso, monto_abono, metodo_pago, admin_name }) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    if (!id_caso || !monto_abono || !metodo_pago || !admin_name) {
      return { success: false, error: "Datos incompletos para registrar el abono." };
    }

    const abono = parseFloat(monto_abono);
    if (isNaN(abono) || abono <= 0) {
      return { success: false, error: "El monto del abono debe ser mayor a cero." };
    }

    // 1. Obtener información del caso (cliente_id y saldo_pendiente)
    const { data: caso, error: errCaso } = await supabase
      .from('casos_master')
      .select('cliente_id, saldo_pendiente')
      .eq('id', id_caso)
      .single();

    if (errCaso || !caso) {
      console.error("Error al obtener caso:", errCaso);
      return { success: false, error: "No se encontró el caso especificado." };
    }

    const { cliente_id, saldo_pendiente: saldoActual } = caso;

    // 2. Insertar en pagos_historico
    const { error: errPago } = await supabase
      .from('pagos_historico')
      .insert({
        id_caso,
        cliente_id,
        monto_abono: abono,
        metodo_pago,
        creado_por: admin_name
      });

    if (errPago) {
      console.error("Error al insertar en pagos_historico:", errPago);
      return { success: false, error: `Error al registrar pago: ${errPago.message}` };
    }

    // 3. Calcular el nuevo saldo y determinar el estado
    // Nota: el saldo puede quedar negativo (saldo a favor de la clínica)
    const nuevoSaldo = (parseFloat(saldoActual) || 0) - abono;
    const estadoPago = nuevoSaldo <= 0 ? 'Pagado' : 'Pendiente';

    // 4. Actualizar casos_master
    const { error: errUpdate } = await supabase
      .from('casos_master')
      .update({
        saldo_pendiente: nuevoSaldo,
        estado_pago: estadoPago
      })
      .eq('id', id_caso);

    if (errUpdate) {
      console.error("Error al actualizar casos_master:", errUpdate);
      return { success: false, error: `Error al actualizar saldo: ${errUpdate.message}` };
    }

    revalidatePath('/admin/facturacion');
    return { success: true, nuevoSaldo };

  } catch (err) {
    console.error("registrarAbono error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene el resumen de CxC (Cuentas por Cobrar).
 * Retorna la lista de casos pendientes y las clínicas agrupadas con su deuda total.
 */
export async function getBillingSummary() {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    // Consultamos TODOS los casos en Facturación con saldo != 0
    // (positivo = deuda, negativo = saldo a favor de la clínica)
    const { data: cases, error } = await supabase
      .from('casos_master')
      .select('id, codigo, paciente, doctor, total_caso, saldo_pendiente, fecha_entrega, cliente_id, iva_aplicado, clientes(nombre)')
      .eq('depto_actual', 'Facturación')
      .neq('saldo_pendiente', 0)
      .order('fecha_entrega', { ascending: true });

    if (error) throw error;

    // Solo mostrar en CxC los casos que YA FUERON ENVIADOS (tienen fecha_entrega)
    const sentCases = (cases || []).filter(c => c.fecha_entrega && c.fecha_entrega.trim() !== "");

    // Agrupamos en Javascript por cliente_id para la Vista de Clínicas (Resumen)
    // total_deuda positivo = nos deben a nosotros
    // total_deuda negativo = nosotros debemos (saldo a favor de la clínica)
    const clinicsMap = {};
    sentCases.forEach(c => {
      const cliId = c.cliente_id;
      const cliName = c.clientes?.nombre || 'Clínica Sin Nombre';
      if (!clinicsMap[cliId]) {
        clinicsMap[cliId] = {
          id: cliId,
          nombre: cliName,
          total_deuda: 0,
          casos_count: 0
        };
      }
      clinicsMap[cliId].total_deuda += Number(c.saldo_pendiente) || 0;
      clinicsMap[cliId].casos_count += 1;
    });

    // Ordenar: deudas mayores primero, saldos a favor al final
    const clinics = Object.values(clinicsMap).sort((a, b) => b.total_deuda - a.total_deuda);

    return { success: true, cases: sentCases, clinics };

  } catch (err) {
    console.error("getBillingSummary error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene los casos pendientes en Facturación con detalles completos (para la pestaña "Pendientes de Pago").
 */
export async function getPendingFacturacionCases() {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const { data: cases, error } = await supabase
      .from('casos_master')
      .select(`
        id, codigo, paciente, doctor, total_caso, saldo_pendiente, fecha_entrega, cliente_id, iva_aplicado, depto_actual,
        clientes(nombre),
        casos_detalle(unidades, producto, dientes)
      `)
      .eq('depto_actual', 'Facturación')
      .neq('saldo_pendiente', 0)
      .order('id', { ascending: true }); // id ascending orders by oldest arrival roughly

    if (error) throw error;

    // Mostrar en Pendientes SOLO los casos que NO han sido enviados (no tienen fecha_entrega)
    const unsentCases = (cases || []).filter(c => !c.fecha_entrega || c.fecha_entrega.trim() === "");

    return { success: true, cases: unsentCases };

  } catch (err) {
    console.error("getPendingFacturacionCases error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Marca un caso como "Enviado", actualizando su fecha de envío (usando fecha_entrega temporalmente o limpiándola).
 */
export async function markCaseAsSent(id_caso) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    // Set the current date as the send date (we use fecha_entrega so it flows nicely into the billing calculations)
    // The user explicitly requested: "si se marca esto, el programa va a guardar esa fecha y la va a asignar como fecha de envio para que se calcule cuando se tendria que cobrar"
    const today = new Date().toISOString().split('T')[0];

    const { error: errUpdate } = await supabase
      .from('casos_master')
      .update({ fecha_entrega: today })
      .eq('id', id_caso);

    if (errUpdate) throw errUpdate;

    revalidatePath('/admin/facturacion');
    return { success: true, dateSent: today };

  } catch (err) {
    console.error("markCaseAsSent error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene el histórico de casos pagados.
 */
export async function getBillingHistory() {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    // Casos terminados en Facturación y ya liquidados
    const { data: cases, error: errCases } = await supabase
      .from('casos_master')
      .select('id, codigo, paciente, total_caso, saldo_pendiente, fecha_entrega, cliente_id, iva_aplicado, clientes(nombre)')
      .eq('depto_actual', 'Facturación')
      .eq('estado_pago', 'Pagado')
      .order('fecha_entrega', { ascending: false });

    if (errCases) throw errCases;

    // Obtenemos los abonos registrados de la base de datos
    const { data: payments, error: errPayments } = await supabase
      .from('pagos_historico')
      .select('*')
      .order('fecha_pago', { ascending: false });

    if (errPayments) throw errPayments;

    // Vinculamos abonos a cada caso
    const casesWithPayments = (cases || []).map(c => ({
      ...c,
      pagos: (payments || []).filter(p => p.id_caso === c.id)
    }));

    return { success: true, cases: casesWithPayments };

  } catch (err) {
    console.error("getBillingHistory error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene estadísticas agregadas de la sección de Facturación.
 */
export async function getBillingStats() {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    // 1. Cuentas por cobrar activas (suma de saldo_pendiente, SOLO de casos enviados)
    const { data: pendingCases, error: errPending } = await supabase
      .from('casos_master')
      .select('saldo_pendiente, fecha_entrega')
      .eq('depto_actual', 'Facturación')
      .gt('saldo_pendiente', 0);

    if (errPending) throw errPending;
    const sentPendingCases = (pendingCases || []).filter(c => c.fecha_entrega && c.fecha_entrega.trim() !== "");
    const totalCxC = sentPendingCases.reduce((acc, c) => acc + (Number(c.saldo_pendiente) || 0), 0);

    // 2. Historial de pagos para total recaudado y desglose de métodos
    const { data: allPayments, error: errPayments } = await supabase
      .from('pagos_historico')
      .select(`
        id, 
        monto_abono, 
        metodo_pago, 
        fecha_pago, 
        id_caso, 
        creado_por,
        clientes(nombre),
        casos_master(codigo)
      `)
      .order('fecha_pago', { ascending: false });

    if (errPayments) throw errPayments;

    const totalRecaudado = (allPayments || []).reduce((acc, p) => acc + (Number(p.monto_abono) || 0), 0);

    // Desglose de métodos de pago
    const methodsMap = {};
    (allPayments || []).forEach(p => {
      const method = p.metodo_pago || 'Otro';
      methodsMap[method] = (methodsMap[method] || 0) + (Number(p.monto_abono) || 0);
    });

    const methods = Object.entries(methodsMap).map(([name, amount]) => ({ name, amount }));

    // Últimas transacciones (últimas 10)
    const recentPayments = (allPayments || []).slice(0, 10).map(p => ({
      id: p.id,
      monto: p.monto_abono,
      metodo: p.metodo_pago,
      fecha: p.fecha_pago,
      clinica: p.clientes?.nombre || 'Clínica Desconocida',
      folio: p.casos_master?.codigo || 'N/A',
      creado_por: p.creado_por
    }));

    return {
      success: true,
      stats: {
        totalCxC,
        totalRecaudado,
        methods,
        recentPayments
      }
    };

  } catch (err) {
    console.error("getBillingStats error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Registra un pago global de una clínica y lo distribuye usando lógica FIFO (First In First Out).
 * Sube el archivo de comprobante al bucket 'comprobantes_pago' si se incluye.
 */
export async function registerGlobalPayment(formData) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const clienteIdStr = formData.get('cliente_id');
    const montoStr = formData.get('monto_abono');
    const metodo = formData.get('metodo_pago');
    const admin = formData.get('admin_name');
    const file = formData.get('comprobante'); // Objeto File

    if (!clienteIdStr || !montoStr || !metodo || !admin) {
      return { success: false, error: "Datos incompletos para registrar el pago global." };
    }

    const clienteId = parseInt(clienteIdStr);
    const montoTotal = parseFloat(montoStr);

    if (isNaN(montoTotal) || montoTotal <= 0) {
      return { success: false, error: "El monto del pago debe ser mayor a cero." };
    }

    // 1. Subida del comprobante al storage
    let comprobanteUrl = null;
    if (file && file.size > 0 && file.name) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileExt = file.name.split('.').pop() || 'png';
      const timestamp = Date.now();
      const filePath = `clinica_${clienteId}/pago_${timestamp}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comprobantes_pago')
        .upload(filePath, buffer, {
          contentType: file.type || 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return { success: false, error: `Error al guardar el comprobante: ${uploadError.message}` };
      }

      const { data: { publicUrl } } = supabase.storage
        .from('comprobantes_pago')
        .getPublicUrl(filePath);

      comprobanteUrl = publicUrl;
    }

    // 2. Transacción FIFO
    // Obtener los casos de la clínica con saldo_pendiente > 0 ordenados por fecha_entrega ASC
    const { data: cases, error: fetchErr } = await supabase
      .from('casos_master')
      .select('id, codigo, paciente, saldo_pendiente, total_caso')
      .eq('cliente_id', clienteId)
      .eq('depto_actual', 'Facturación')
      .gt('saldo_pendiente', 0)
      .order('fecha_entrega', { ascending: true })
      .order('id', { ascending: true });

    if (fetchErr) {
      console.error("Fetch cases error:", fetchErr);
      return { success: false, error: `Error al consultar casos con saldo pendiente: ${fetchErr.message}` };
    }

    let saldoRestante = montoTotal;
    const casosSaldados = [];
    const updates = [];

    for (const caso of (cases || [])) {
      if (saldoRestante <= 0) break;

      const deudaCaso = parseFloat(caso.saldo_pendiente) || 0;
      let nuevoSaldo = 0;
      let estadoPago = 'Pagado';

      if (saldoRestante >= deudaCaso) {
        // Salda el caso por completo
        nuevoSaldo = 0;
        estadoPago = 'Pagado';
        saldoRestante -= deudaCaso;
        casosSaldados.push(caso.codigo);
      } else {
        // Saldo parcial para este caso
        nuevoSaldo = Math.round((deudaCaso - saldoRestante) * 100) / 100;
        estadoPago = 'Pendiente';
        saldoRestante = 0;
      }

      updates.push({
        id: caso.id,
        codigo: caso.codigo,
        monto_aplicado: Math.round((deudaCaso - nuevoSaldo) * 100) / 100,
        saldo_pendiente: nuevoSaldo,
        estado_pago: estadoPago
      });
    }

    // Actualizar casos en la base de datos
    for (const update of updates) {
      const { error: updateErr } = await supabase
        .from('casos_master')
        .update({
          saldo_pendiente: update.saldo_pendiente,
          estado_pago: update.estado_pago
        })
        .eq('id', update.id);

      if (updateErr) {
        console.error(`Error al actualizar caso ${update.id}:`, updateErr);
        return { success: false, error: `Error al actualizar saldo del caso ${update.codigo}: ${updateErr.message}` };
      }
    }

    // 3. Auditoría: insertar registro único en pagos_historico
    let notasMsg = "";
    if (updates.length > 0) {
      notasMsg = `Pago global distribuido en casos: ${updates.map(u => `${u.codigo} ($${u.monto_aplicado.toFixed(2)})`).join(', ')}`;
      if (saldoRestante > 0) {
        notasMsg += ` | Saldo a favor restante: $${saldoRestante.toFixed(2)}`;
      }
    } else {
      notasMsg = `Anticipo / Saldo a favor (Clínica sin casos con deuda). Monto: $${saldoRestante.toFixed(2)}`;
    }
    
    const { error: insertErr } = await supabase
      .from('pagos_historico')
      .insert({
        cliente_id: clienteId,
        id_caso: null, // indica pago global FIFO
        monto_abono: montoTotal,
        metodo_pago: metodo,
        creado_por: admin,
        comprobante_url: comprobanteUrl,
        notas: notasMsg
      });

    if (insertErr) {
      console.error("Error al insertar pagos_historico:", insertErr);
      return { success: false, error: `Error al registrar pago histórico: ${insertErr.message}` };
    }

    revalidatePath('/admin/facturacion');
    return {
      success: true,
      casosSaldadosCount: casosSaldados.length,
      casosSaldados,
      totalCasosAfectados: updates.length
    };

  } catch (err) {
    console.error("registerGlobalPayment error:", err);
    return { success: false, error: err.message };
  }
}
