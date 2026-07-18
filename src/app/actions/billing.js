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

function calcularFechaCobro(fechaEnvioStr) {
  const d = new Date(fechaEnvioStr + 'T12:00:00Z');
  const diaSemana = d.getUTCDay(); // 0=Dom, 1=Lun...5=Vie, 6=Sab
  const diasHastaLunesSig = diaSemana === 0 ? 1 : (8 - diaSemana);
  d.setUTCDate(d.getUTCDate() + diasHastaLunesSig + 3); // lunes siguiente + 3 = jueves
  return d.toISOString().split('T')[0];
}

function getSemanaActual() {
  const hoy = new Date();
  const dia = hoy.getDay();
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 4);
  return {
    inicio: inicio.toISOString().split('T')[0],
    fin: fin.toISOString().split('T')[0]
  };
}

export async function revertirPago({ caso_id, motivo }) {
  try {
    const user = await getCurrentUser();
    const puedeRevertir = 
      user?.rol?.includes('lab_owner') || 
      user?.rol?.includes('Administrativo') ||
      user?.username?.toLowerCase() === 'admin' ||
      user?.is_superadmin;
    
    if (!user || !puedeRevertir) {
      return { success: false, error: 'No autorizado para revertir pagos.' };
    }
    if (!motivo || motivo.trim().length < 5) {
      return { success: false, error: 'El motivo es obligatorio (mínimo 5 caracteres).' };
    }

    const supabase = getAdminClient();

    // 1. Verificar que el caso existe y está Pagado
    const { data: caso, error: errCaso } = await supabase
      .from('casos_master')
      .select('id, total_caso, estado_pago, saldo_pendiente, cliente_id')
      .eq('id', caso_id)
      .single();

    if (errCaso || !caso) return { success: false, error: 'Caso no encontrado.' };
    if (caso.estado_pago !== 'Pagado') return { success: false, error: 'El caso no está marcado como Pagado.' };

    // 2. Verificar que no existe ya una reversión para este caso
    const { data: reversionExistente } = await supabase
      .from('pagos_historico')
      .select('id')
      .eq('id_caso', caso_id)
      .eq('tipo_movimiento', 'reversion')
      .limit(1)
      .single();

    if (reversionExistente) {
      return { success: false, error: 'Este caso ya tiene una reversión registrada.' };
    }

    // 3. Obtener el abono más reciente (solo abonos directos, no globales FIFO)
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const { data: ultimoAbono, error: errAbono } = await supabase
      .from('pagos_historico')
      .select('id, monto_abono, fecha_pago')
      .eq('id_caso', caso_id)
      .eq('tipo_movimiento', 'abono')
      .gte('fecha_pago', hace30Dias.toISOString())
      .order('fecha_pago', { ascending: false })
      .limit(1)
      .single();

    if (errAbono || !ultimoAbono) {
      return { success: false, error: 'No se encontró un abono reciente (últimos 30 días) para este caso.' };
    }

    // 4. Insertar registro de reversión (monto negativo)
    const { error: errInsert } = await supabase
      .from('pagos_historico')
      .insert({
        id_caso: caso_id,
        cliente_id: caso.cliente_id,
        monto_abono: -(ultimoAbono.monto_abono),
        tipo_movimiento: 'reversion',
        referencia_reversion_id: ultimoAbono.id,
        notas: motivo.trim(),
        motivo: motivo.trim(),
        creado_por: user.username || user.email || 'Sistema',
        metodo_pago: 'Reversión'
      });

    if (errInsert) return { success: false, error: `Error al insertar reversión: ${errInsert.message}` };

    // 5. Restaurar saldo y estado
    const { error: errUpdate } = await supabase
      .from('casos_master')
      .update({
        saldo_pendiente: caso.total_caso,
        estado_pago: 'Pendiente'
      })
      .eq('id', caso_id);

    if (errUpdate) return { success: false, error: `Error al restaurar saldo: ${errUpdate.message}` };

    revalidatePath('/admin/facturacion');
    return { success: true };

  } catch (err) {
    console.error('revertirPago error:', err);
    return { success: false, error: err.message };
  }
}

export async function registrarPromesaPago({ caso_id, fecha_promesa }) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('casos_master')
      .update({ promesa_pago_fecha: fecha_promesa })
      .eq('id', caso_id);
    if (error) throw error;
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    console.error('registrarPromesaPago error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Registra un abono para un caso específico.
 * Lógica transaccional (cliente admin):
 * - Inserta el abono en pagos_historico.
 * - Resta el abono de casos_master.saldo_pendiente.
 * - Si saldo_pendiente <= 0, actualiza estado_pago = 'Pagado'.
 */
export async function registrarAbono(formData) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const id_caso = formData.get('id_caso');
    const monto_abono_str = formData.get('monto_abono');
    const metodo_pago = formData.get('metodo_pago');
    const admin_name = formData.get('admin_name');
    const file = formData.get('comprobante'); // Objeto File opcional

    if (!id_caso || !monto_abono_str || !metodo_pago || !admin_name) {
      return { success: false, error: "Datos incompletos para registrar el abono." };
    }

    const abono = parseFloat(monto_abono_str);
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

    // 2. Subida del comprobante a storage (opcional)
    let comprobanteUrl = null;
    if (file && file.size > 0 && file.name) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileExt = file.name.split('.').pop() || 'png';
      const timestamp = Date.now();
      const filePath = `casos_${id_caso}/abono_${timestamp}.${fileExt}`;

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

    // 3. Insertar en pagos_historico
    const { error: errPago } = await supabase
      .from('pagos_historico')
      .insert({
        id_caso,
        cliente_id,
        monto_abono: abono,
        metodo_pago,
        creado_por: admin_name,
        comprobante_url: comprobanteUrl
      });

    if (errPago) {
      console.error("Error al insertar en pagos_historico:", errPago);
      return { success: false, error: `Error al registrar pago: ${errPago.message}` };
    }

    // 4. Calcular el nuevo saldo y determinar el estado
    // Nota: el saldo puede quedar negativo (saldo a favor de la clínica)
    const nuevoSaldo = (parseFloat(saldoActual) || 0) - abono;
    const estadoPago = nuevoSaldo <= 0 ? 'Pagado' : 'Pendiente';

    // 5. Actualizar casos_master
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
 * Retorna la lista de casos pendientes separada por categorías y las clínicas agrupadas.
 */
export async function getBillingSummary() {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const { data: cases, error } = await supabase
      .from('casos_master')
      .select('id, codigo, paciente, doctor, total_caso, saldo_pendiente, fecha_entrega, fecha_envio_real, fecha_cobro, promesa_pago_fecha, cliente_id, iva_aplicado, estado, clientes(nombre, saldo_favor)')
      .eq('depto_actual', 'Facturación')
      .neq('saldo_pendiente', 0)
      .neq('estado', 'Cancelado')
      .order('fecha_entrega', { ascending: true });

    if (error) throw error;

    const sentCases = (cases || []).filter(c => c.estado === 'Enviado');

    const hoyStr = new Date().toISOString().split('T')[0];
    const clinicsMap = {};
    sentCases.forEach(c => {
      const cliId = c.cliente_id;
      const cliName = c.clientes?.nombre || 'Clínica Sin Nombre';
      
      const isDeudaActiva = !c.fecha_cobro || c.fecha_cobro <= hoyStr;

      if (!clinicsMap[cliId]) {
        clinicsMap[cliId] = {
          id: cliId,
          nombre: cliName,
          total_deuda: 0,
          casos_count: 0,
          saldo_favor: Number(c.clientes?.saldo_favor) || 0
        };
      }
      
      if (isDeudaActiva) {
        clinicsMap[cliId].total_deuda += Number(c.saldo_pendiente) || 0;
      }
      clinicsMap[cliId].casos_count += 1;
    });

    const clinics = Object.values(clinicsMap).sort((a, b) => b.total_deuda - a.total_deuda);

    // Separar en Cobros de esta semana vs Deuda General
    const semana = getSemanaActual();
    const hoy = new Date().toISOString().split('T')[0];
    
    const cobrosSemana = {
      porCobrar: [],
      proximamente: []
    };
    const deudaGeneral = [];

    sentCases.forEach(c => {
      if (!c.fecha_cobro) {
        deudaGeneral.push(c);
      } else {
        if (c.fecha_cobro >= semana.inicio && c.fecha_cobro <= semana.fin) {
          if (c.fecha_cobro <= hoy) {
            cobrosSemana.porCobrar.push(c);
          } else {
            cobrosSemana.proximamente.push(c);
          }
        } else {
          deudaGeneral.push(c);
        }
      }
    });

    return { 
      success: true, 
      cases: sentCases, 
      clinics,
      cobrosSemana,
      deudaGeneral
    };

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
        id, codigo, paciente, doctor, total_caso, saldo_pendiente, fecha_entrega, cliente_id, iva_aplicado, depto_actual, estado,
        clientes(nombre),
        casos_detalle(unidades, producto, dientes)
      `)
      .eq('depto_actual', 'Facturación')
      .neq('saldo_pendiente', 0)
      .order('id', { ascending: true }); // id ascending orders by oldest arrival roughly

    if (error) throw error;

    // Mostrar en Pendientes SOLO los casos que NO han sido enviados (estado !== 'Enviado')
    const unsentCases = (cases || []).filter(c => c.estado !== 'Enviado');

    return { success: true, cases: unsentCases };

  } catch (err) {
    console.error("getPendingFacturacionCases error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene los casos activos en producción que no están cancelados ni en Facturación (vista de solo lectura).
 */
export async function getActiveProductionCases() {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const { data: cases, error } = await supabase
      .from('casos_master')
      .select('id, codigo, paciente, doctor, depto_actual, total_caso, clientes(nombre), casos_detalle(unidades, producto)')
      .neq('depto_actual', 'Facturación')
      .neq('estado', 'Cancelado')
      .order('fecha_entrega', { ascending: true });

    if (error) throw error;
    
    let resultCases = cases || [];
    
    // Ordenar por etapa de producción (del más avanzado al menos)
    const ordenEtapas = [
      'Inspección',
      'Terminado',
      'Ajuste',
      'Sinterizado',
      'Digital_Fresado',
      'Digital_Diseno',
      'Digital_Escaneo',
      'Yesos'
    ];
    
    resultCases.sort((a, b) => {
      let indexA = ordenEtapas.indexOf(a.depto_actual);
      let indexB = ordenEtapas.indexOf(b.depto_actual);
      
      // Si no están en la lista (ej. Recepción), mandarlos al final (peso alto)
      if (indexA === -1) indexA = 999;
      if (indexB === -1) indexB = 999;
      
      return indexA - indexB;
    });

    return { success: true, cases: resultCases };

  } catch (err) {
    console.error("getActiveProductionCases error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Marca un caso como "Enviado", calculando su fecha de cobro y preservando la promesa original.
 */
export async function markCaseAsSent(id_caso) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const today = new Date().toISOString().split('T')[0];
    const fechaCobro = calcularFechaCobro(today);

    const { error: errUpdate } = await supabase
      .from('casos_master')
      .update({ 
        fecha_envio_real: today,
        fecha_cobro: fechaCobro,
        estado: 'Enviado' 
      })
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
export async function getBillingHistory(filters = {}) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const { startDate, endDate, clienteId, year } = filters;

    // Casos terminados en Facturación y ya liquidados
    let query = supabase
      .from('casos_master')
      .select('id, codigo, paciente, total_caso, saldo_pendiente, fecha_entrega, cliente_id, iva_aplicado, clientes(nombre)')
      .eq('depto_actual', 'Facturación')
      .eq('estado_pago', 'Pagado');

    if (clienteId) {
      query = query.eq('cliente_id', clienteId);
    }
    if (startDate) {
      query = query.gte('fecha_entrega', startDate);
    }
    if (endDate) {
      query = query.lte('fecha_entrega', endDate);
    }
    if (year) {
      query = query.gte('fecha_entrega', `${year}-01-01`).lte('fecha_entrega', `${year}-12-31`);
    }

    const { data: cases, error: errCases } = await query.order('fecha_entrega', { ascending: false });

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

    // 1. Cuentas por cobrar activas (suma de saldo_pendiente, SOLO de casos con estado Enviado)
    const { data: pendingCases, error: errPending } = await supabase
      .from('casos_master')
      .select('saldo_pendiente, estado')
      .eq('depto_actual', 'Facturación')
      .gt('saldo_pendiente', 0);

    if (errPending) throw errPending;
    const sentPendingCases = (pendingCases || []).filter(c => c.estado === 'Enviado');
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

    // 2. Obtener el cliente para verificar su saldo_favor
    const { data: cliente, error: getErr } = await supabase
      .from('clientes')
      .select('saldo_favor, nombre')
      .eq('id', clienteId)
      .single();

    if (getErr) {
      console.error("Error al obtener cliente:", getErr);
      return { success: false, error: `Error al obtener datos del cliente: ${getErr.message}` };
    }

    const nuevoSaldoFavor = (Number(cliente.saldo_favor) || 0) + montoTotal;

    // Actualizar cliente con el nuevo saldo a favor
    const { error: updateErr } = await supabase
      .from('clientes')
      .update({ saldo_favor: nuevoSaldoFavor })
      .eq('id', clienteId);

    if (updateErr) {
      console.error("Error al actualizar saldo_favor:", updateErr);
      return { success: false, error: `Error al actualizar saldo a favor del cliente: ${updateErr.message}` };
    }

    // 3. Auditoría: insertar registro en pagos_historico
    const notasMsg = `Abono registrado a la cartera / saldo a favor de la clínica. Monto: $${montoTotal.toFixed(2)}`;
    
    const { error: insertErr } = await supabase
      .from('pagos_historico')
      .insert({
        cliente_id: clienteId,
        id_caso: null,
        monto_abono: montoTotal,
        metodo_pago: metodo,
        creado_por: admin,
        comprobante_url: comprobanteUrl,
        notes: notasMsg // Note: checking if DB uses 'notas' or 'notes' -> wait, the previous code used 'notas'. Let's keep 'notas'
      });

    // Wait, let's double check if the field is 'notas' or 'notes'. The target code at line 470 used 'notas: notasMsg'. Let's use 'notas'
    const { error: insertErrReal } = await supabase
      .from('pagos_historico')
      .insert({
        cliente_id: clienteId,
        id_caso: null,
        monto_abono: montoTotal,
        metodo_pago: metodo,
        creado_por: admin,
        comprobante_url: comprobanteUrl,
        notas: notasMsg
      });

    if (insertErrReal) {
      console.error("Error al insertar pagos_historico:", insertErrReal);
      return { success: false, error: `Error al registrar pago histórico: ${insertErrReal.message}` };
    }

    revalidatePath('/admin/facturacion');
    return {
      success: true,
      nuevoSaldoFavor
    };

  } catch (err) {
    console.error("registerGlobalPayment error:", err);
    return { success: false, error: err.message || "Error inesperado." };
  }
}

export async function applyCustomDistribution(clienteId, allocations, adminName) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    if (!clienteId || !allocations || Object.keys(allocations).length === 0) {
      return { success: false, error: "Datos incompletos para aplicar la distribución." };
    }

    // 1. Obtener el cliente para verificar su saldo_favor
    const { data: cliente, error: getErr } = await supabase
      .from('clientes')
      .select('saldo_favor, nombre')
      .eq('id', clienteId)
      .single();

    if (getErr) {
      return { success: false, error: `Error al obtener cliente: ${getErr.message}` };
    }

    const saldoFavorActual = Number(cliente.saldo_favor) || 0;
    
    // Calcular el total que se va a distribuir
    let totalADistribuir = 0;
    for (const caseId in allocations) {
      totalADistribuir += Number(allocations[caseId]) || 0;
    }

    // Validar que el total a distribuir no sea mayor que el saldo_favor disponible (con un pequeño margen de redondeo)
    if (totalADistribuir > (saldoFavorActual + 0.01)) {
      return { success: false, error: `El total a distribuir ($${totalADistribuir.toFixed(2)}) supera el saldo a favor disponible ($${saldoFavorActual.toFixed(2)}).` };
    }

    // 2. Procesar cada asignación
    const updates = [];

    for (const caseIdStr in allocations) {
      const caseId = parseInt(caseIdStr);
      const abono = Number(allocations[caseIdStr]) || 0;
      if (abono <= 0) continue;

      // Obtener el caso para saber su saldo actual
      const { data: caso, error: caseErr } = await supabase
        .from('casos_master')
        .select('id, codigo, paciente, saldo_pendiente')
        .eq('id', caseId)
        .single();

      if (caseErr || !caso) {
        return { success: false, error: `Error al buscar el caso con ID ${caseId}: ${caseErr?.message || 'No encontrado'}` };
      }

      const saldoPendienteActual = Number(caso.saldo_pendiente) || 0;
      if (abono > (saldoPendienteActual + 0.01)) {
        return { success: false, error: `El abono asignado al caso #${caso.codigo} ($${abono.toFixed(2)}) supera su saldo pendiente ($${saldoPendienteActual.toFixed(2)}).` };
      }

      const nuevoSaldo = Math.max(0, Math.round((saldoPendienteActual - abono) * 100) / 100);
      const estadoPago = nuevoSaldo === 0 ? 'Pagado' : 'Pendiente';

      updates.push({
        id: caso.id,
        codigo: caso.codigo,
        monto_aplicado: abono,
        saldo_pendiente: nuevoSaldo,
        estado_pago: estadoPago
      });
    }

    // 3. Aplicar las actualizaciones a la base de datos
    for (const update of updates) {
      const { error: updateErr } = await supabase
        .from('casos_master')
        .update({
          saldo_pendiente: update.saldo_pendiente,
          estado_pago: update.estado_pago
        })
        .eq('id', update.id);

      if (updateErr) {
        return { success: false, error: `Error al actualizar saldo del caso #${update.codigo}: ${updateErr.message}` };
      }
    }

    // 4. Descontar del saldo_favor del cliente
    const nuevoSaldoFavor = Math.max(0, Math.round((saldoFavorActual - totalADistribuir) * 100) / 100);
    const { error: updateClientErr } = await supabase
      .from('clientes')
      .update({ saldo_favor: nuevoSaldoFavor })
      .eq('id', clienteId);

    if (updateClientErr) {
      return { success: false, error: `Error al actualizar saldo a favor del cliente: ${updateClientErr.message}` };
    }

    // 5. Insertar registros en pagos_historico por cada caso abonado
    for (const update of updates) {
      const { error: insertErr } = await supabase
        .from('pagos_historico')
        .insert({
          cliente_id: clienteId,
          id_caso: update.id,
          monto_abono: update.monto_aplicado,
          metodo_pago: 'Saldo a Favor',
          creado_por: adminName,
          notas: `Abono de $${update.monto_aplicado.toFixed(2)} aplicado desde la cartera / saldo a favor.`
        });

      if (insertErr) {
        console.error("Error al registrar historial de pago:", insertErr);
      }
    }

    revalidatePath('/admin/facturacion');
    return { success: true, nuevoSaldoFavor };

  } catch (err) {
    console.error("applyCustomDistribution error:", err);
    return { success: false, error: err.message || "Error inesperado." };
  }
}
