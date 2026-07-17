"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { toZonedTime } from 'date-fns-tz';
import { addMinutes } from 'date-fns';
import { deleteCalendarEvent, updateCalendarEvent } from '@/lib/googleCalendar';

// Cliente Admin — bypasses RLS. Seguro porque "use server" nunca llega al navegador.
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// =====================================================================
// FUNCIONES DE CAPTURA DE TIEMPOS HISTÓRICOS (SLA)
// =====================================================================
async function registrarInicio(supabase, caseId, departamento) {
  if (!departamento || departamento === 'Facturación') return;
  try {
    const { error } = await supabase
      .from('casos_tiempos_historicos')
      .insert({
        id_caso: caseId,
        departamento: departamento,
        hora_inicio: new Date().toISOString()
      });
    if (error) console.error('[Historico] Error registrarInicio:', error);
  } catch (err) {
    console.error('[Historico] Exception registrarInicio:', err);
  }
}

function calculateTimeSegments(inicioStr, terminoStr) {
  const TIMEZONE = 'America/Tijuana';
  let startUTC = new Date(inicioStr);
  let endUTC = terminoStr ? new Date(terminoStr) : new Date();

  if (startUTC >= endUTC) {
      return { minutos_habiles: 0, minutos_extra: 0 };
  }

  let minutos_habiles = 0;
  let minutos_extra = 0;

  let current = toZonedTime(startUTC, TIMEZONE);
  let end = toZonedTime(endUTC, TIMEZONE);

  while (current < end) {
      const dayOfWeek = current.getDay();
      const hour = current.getHours();
      const minute = current.getMinutes();
      
      const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
      const isWorkingHour = hour >= 9 && (hour < 16 || (hour === 16 && minute < 30));

      if (isWeekday && isWorkingHour) {
          minutos_habiles++;
      } else {
          minutos_extra++;
      }

      current = addMinutes(current, 1);
  }

  return { minutos_habiles, minutos_extra };
}

async function registrarTermino(supabase, caseId, departamento, nextDept, isPause = false, motivoPausa = null) {
  if (!departamento || departamento === 'Facturación') return;
  try {
    const { data: registro } = await supabase
      .from('casos_tiempos_historicos')
      .select('id, hora_inicio')
      .eq('id_caso', caseId)
      .eq('departamento', departamento)
      .is('hora_termino', null)
      .order('hora_inicio', { ascending: false })
      .limit(1)
      .single();

    if (registro && registro.hora_inicio) {
      const terminoStr = new Date().toISOString();
      const { minutos_habiles, minutos_extra } = calculateTimeSegments(registro.hora_inicio, terminoStr);
      const minutos_totales = minutos_habiles + minutos_extra;

      const updateData = {
        hora_termino: terminoStr,
        minutos_habiles: minutos_habiles,
        minutos_extra: minutos_extra,
        minutos_totales: minutos_totales
      };

      if (!isPause) {
        updateData.departamento_siguiente = nextDept || null;
      } else {
        updateData.motivo_pausa = motivoPausa;
      }

      await supabase
        .from('casos_tiempos_historicos')
        .update(updateData)
        .eq('id', registro.id);
    }
  } catch (err) {
    console.error('[Historico] Exception registrarTermino:', err);
  }
}


// Flujo lógico de departamentos
const FLUJO_DIGITAL = {
    "Recepción": "Digital_Diseno",
    "Digital_Diseno": "Digital_Fresado",
    "Digital_Fresado": "Sinterizado",
    "Sinterizado": "Ajuste",
    "Ajuste": "Terminado",
    "Terminado": "Inspección",
    "Inspección": "Facturación",
    "Yesos": "Digital_Escaneo",
    "Digital_Escaneo": "Digital_Diseno"
};

const FLUJO_ANALOGO = {
    "Recepción": "Yesos",
    "Yesos": "Digital_Escaneo",
    "Digital_Escaneo": "Digital_Diseno",
    "Digital_Diseno": "Digital_Fresado",
    "Digital_Fresado": "Sinterizado",
    "Sinterizado": "Ajuste",
    "Ajuste": "Terminado",
    "Terminado": "Inspección",
    "Inspección": "Facturación"
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Genera el CARGO en cuenta_corriente_clinica cuando un caso es enviado.
// Equivalente exacto a lo que hace el Lab OS de escritorio en _cargo_envio_bg().
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function registrarCargoEnvio(supabase, caseId, codigo, paciente) {
  try {
    // 1. Obtener cliente_id del caso
    const { data: master, error: masterErr } = await supabase
      .from('casos_master')
      .select('cliente_id')
      .eq('id', caseId)
      .single();

    if (masterErr || !master?.cliente_id) {
      console.error('[CARGO] No se encontró cliente_id para el caso', caseId, masterErr);
      return;
    }
    const clienteId = master.cliente_id;

    // 2. Comprobar si ya existe un CARGO para este caso (evitar duplicados)
    const { data: existing } = await supabase
      .from('cuenta_corriente_clinica')
      .select('id')
      .eq('caso_id', caseId)
      .eq('tipo', 'CARGO')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[CARGO] Ya existe un CARGO para el caso', codigo, '— omitiendo duplicado.');
      return;
    }

    // 3. Sumar subtotales de casos_detalle
    const { data: detalles } = await supabase
      .from('casos_detalle')
      .select('subtotal')
      .eq('caso_id', caseId);

    const total = (detalles || []).reduce((acc, r) => acc + (parseFloat(r.subtotal) || 0), 0);

    if (total <= 0) {
      console.warn('[CARGO] Caso', codigo, 'sin importe — CARGO omitido.');
      return;
    }

    // 4. Insertar CARGO
    const montoRedondeado = Math.round(total * 100) / 100;
    const { error: insertErr } = await supabase
      .from('cuenta_corriente_clinica')
      .insert({
        cliente_id: clienteId,
        caso_id:    caseId,
        tipo:       'CARGO',
        descripcion: `Trabajo enviado: ${codigo} - ${paciente}`,
        monto:      montoRedondeado,
        fecha:      new Date().toISOString()
      });

    if (insertErr) {
      console.error('[CARGO] Error insertando CARGO:', insertErr);
    } else {
      // 5. Actualizar total_caso y saldo_pendiente en casos_master
      await supabase
        .from('casos_master')
        .update({
           total_caso: montoRedondeado,
           saldo_pendiente: montoRedondeado
        })
        .eq('id', caseId);

      console.log(`[CARGO] ✅ CARGO registrado → caso=${codigo} cliente=${clienteId} total=$${total.toFixed(2)}`);
    }
  } catch (err) {
    console.error('[CARGO] Error inesperado en registrarCargoEnvio:', err);
  }
}

export async function updateCaseState(internalId, action, operatorName = null, motivoPausa = null) {
  try {
    const supabase = getAdminClient();
    if (!internalId || !['START', 'PAUSE', 'COMPLETE', 'SHIP'].includes(action)) {
      return { success: false, error: "Datos de acción inválidos." };
    }

    // Consulta el estado actual, tipo y metadata de display
    const { data: currentCase, error: fetchError } = await supabase
      .from('casos_master')
      .select('depto_actual, tipo, codigo, paciente, google_event_id')
      .eq('id', internalId)
      .single();
    
    if (fetchError || !currentCase) {
      console.error(fetchError);
      return { success: false, error: "Caso no encontrado." };
    }

    const deptoLimpio = currentCase.depto_actual ? currentCase.depto_actual.trim() : "";
    const tipoLimpio  = currentCase.tipo ? currentCase.tipo.trim().toLowerCase() : "análogo";

    // Normalizar para evitar problemas de acentos o espacios invisibles (NFC vs NFD)
    const normalizeString = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
    const deptoNorm = normalizeString(deptoLimpio);

    let updateData = {};
    let esEnvioFinal = false;

    let _deptoActualForHistorico = currentCase.depto_actual || '';
    let _nextDeptForHistorico = null;

    if (action === 'START') {
        const utcIso = new Date().toISOString();
        updateData = { estado: 'En Proceso', operador_actual: operatorName, hora_inicio: utcIso };

    } else if (action === 'PAUSE') {
        updateData = { estado: 'En Pausa' };

    } else if (action === 'SHIP' || (action === 'COMPLETE' && deptoNorm === 'inspeccion')) {
        // ── ENVÍO FINAL: caso sale del laboratorio ──
        // Se chequea ANTES del bloque COMPLETE general para evitar que caiga ahí.
        esEnvioFinal = true;
        updateData = { depto_actual: 'Facturación', estado: 'Finalizado', operador_actual: null, hora_inicio: null, google_event_id: null };
        
        // Eliminar evento de Google Calendar
        if (currentCase.google_event_id) {
          deleteCalendarEvent(currentCase.google_event_id).catch(err => {
            console.error("[Google Calendar] Error al eliminar evento por envío final:", err);
          });
        }

    } else if (action === 'COMPLETE') {
        let nextDept = "Terminado";
        
        // Mapeo seguro con nombres normalizados
        const FLUJO_DIGITAL_NORM = Object.fromEntries(Object.entries(FLUJO_DIGITAL).map(([k, v]) => [normalizeString(k), v]));
        const FLUJO_ANALOGO_NORM = Object.fromEntries(Object.entries(FLUJO_ANALOGO).map(([k, v]) => [normalizeString(k), v]));

        if (tipoLimpio === "digital") {
            nextDept = FLUJO_DIGITAL_NORM[deptoNorm] || "Terminado";
        } else {
            nextDept = FLUJO_ANALOGO_NORM[deptoNorm] || "Terminado";
        }
        
        // Regla dinámica: si sale de Digital_Fresado, evaluar si requiere Sinterizado
        if (deptoNorm === 'digital_fresado') {
            const { data: detalles } = await supabase
                .from('casos_detalle')
                .select('producto')
                .eq('caso_id', internalId);
                
            let requiereSinterizado = false;
            
            if (detalles && detalles.length > 0) {
               const { data: catData } = await supabase.from('productos').select('nombre, categoria');
               const catMap = {};
               if (catData) {
                   catData.forEach(p => {
                       const cleanName = p.nombre.replace(/^\d+\-/, '').trim();
                       catMap[cleanName.toLowerCase()] = (p.categoria || "").toLowerCase();
                       catMap[p.nombre.toLowerCase()] = (p.categoria || "").toLowerCase();
                   });
               }

               for (const d of detalles) {
                   const prod = d.producto ? d.producto.toLowerCase() : "";
                   const cat = catMap[prod] || "";
                   if (cat.includes("zr") || cat.includes("zirconia") || prod.includes("zr") || prod.includes("zirconia")) {
                       requiereSinterizado = true;
                       break;
                   }
               }
            }
            
            if (!requiereSinterizado) {
                nextDept = "Ajuste";
            }
        }
        
        console.log('[DEBUG CASES.JS] COMPLETE -> deptoLimpio:', deptoLimpio, 'nextDept:', nextDept);
        updateData = { depto_actual: nextDept, estado: 'Pendiente', operador_actual: null, hora_inicio: null };
        _nextDeptForHistorico = nextDept;
    }

    // Actualizar casos_master
    const { error: updateError } = await supabase
      .from('casos_master')
      .update(updateData)
      .eq('id', internalId);

    if (updateError) {
      console.error(updateError);
      return { success: false, error: "No se pudo modificar el registro." };
    }

    // Captura de tiempos historicos
    if (action === 'START') { 
      registrarInicio(supabase, internalId, _deptoActualForHistorico).catch(() => {}); 
    } else if (action === 'COMPLETE') { 
      registrarTermino(supabase, internalId, _deptoActualForHistorico, _nextDeptForHistorico).catch(() => {}); 
    } else if (action === 'PAUSE') {
      registrarTermino(supabase, internalId, _deptoActualForHistorico, null, true, motivoPausa).catch(() => {}); 
    }

    // Si es envío final → generar CARGO en cuenta corriente
    if (esEnvioFinal) {
      await registrarCargoEnvio(
        supabase,
        internalId,
        currentCase.codigo || String(internalId),
        currentCase.paciente || ''
      );
    }

    revalidatePath('/');
    return { success: true };

  } catch (error) {
    console.error("Error al actualizar caso:", error);
    return { success: false, error: "Error interno al guardar." };
  }
}

export async function toggleCaseIVA(caseId, applyIva) {
  try {
    const supabase = getAdminClient();
    
    // 1. Obtener el master para leer el total y saldo
    const { data: master } = await supabase
      .from('casos_master')
      .select('descuento, total_caso, saldo_pendiente, iva_aplicado')
      .eq('id', caseId)
      .single();
      
    if (!master) return { success: false, error: 'Caso no encontrado' };
    
    const isCurrentlyIva = master.iva_aplicado || false;
    const oldTotal = Number(master.total_caso) || 0;
    const oldSaldo = Number(master.saldo_pendiente) || 0;
    
    let newTotal = oldTotal;
    if (applyIva && !isCurrentlyIva) {
      newTotal = oldTotal * 1.08;
    } else if (!applyIva && isCurrentlyIva) {
      newTotal = oldTotal / 1.08;
    }
    
    newTotal = Math.round(newTotal * 100) / 100;
    
    let newSaldo = oldSaldo + (newTotal - oldTotal);
    if (newSaldo < 0) newSaldo = 0;
    newSaldo = Math.round(newSaldo * 100) / 100;
    
    // 2. Update en BD
    const { error } = await supabase
      .from('casos_master')
      .update({
        iva_aplicado: applyIva,
        total_caso: newTotal,
        saldo_pendiente: newSaldo
      })
      .eq('id', caseId);
      
    if (error) throw error;
    
    revalidatePath('/admin/facturacion');
    return { success: true, newTotal, newSaldo, iva_aplicado: applyIva };
    
  } catch (error) {
    console.error("toggleCaseIVA error:", error);
    return { success: false, error: error.message };
  }
}

export async function getCaseDetailsForEdit(caseId) {
  try {
    const supabase = getAdminClient();
    const { data: detalles, error } = await supabase
      .from('casos_detalle')
      .select('*')
      .eq('caso_id', caseId);
      
    if (error) throw error;
    
    const { data: master, error: masterErr } = await supabase
      .from('casos_master')
      .select('descuento, iva_aplicado, total_caso, saldo_pendiente')
      .eq('id', caseId)
      .single();
      
    if (masterErr) throw masterErr;
    
    return { success: true, detalles, master };
  } catch (error) {
    console.error("getCaseDetailsForEdit error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCaseFinancials(caseId, detailsUpdates, discount, applyIva) {
  try {
    const supabase = getAdminClient();
    
    // 0. Obtener los IDs actuales en la base de datos
    const { data: currentDetails } = await supabase
      .from('casos_detalle')
      .select('id')
      .eq('caso_id', caseId);
      
    const currentIds = currentDetails ? currentDetails.map(d => d.id) : [];
    const updatedIds = detailsUpdates.filter(d => d.id && !String(d.id).startsWith('temp_')).map(d => d.id);
    
    // Encontrar los IDs que fueron eliminados
    const idsToDelete = currentIds.filter(id => !updatedIds.includes(id));
    
    if (idsToDelete.length > 0) {
      await supabase
        .from('casos_detalle')
        .delete()
        .in('id', idsToDelete);
    }
    
    // 1. Update or insert each detail (unidades, precio_unit, subtotal)
    let totalSubtotal = 0;
    for (const det of detailsUpdates) {
      const pUnit = Number(det.precio_unit) || 0;
      const cant = Number(det.unidades) || 0;
      const sub = pUnit * cant;
      totalSubtotal += sub;
      
      if (det.id && typeof det.id === 'string' && det.id.startsWith('temp_')) {
        await supabase
          .from('casos_detalle')
          .insert({
            caso_id: caseId,
            producto: det.producto,
            dientes: det.dientes,
            unidades: cant,
            precio_unit: pUnit,
            subtotal: sub
          });
      } else {
        await supabase
          .from('casos_detalle')
          .update({
            producto: det.producto,
            dientes: det.dientes,
            unidades: cant,
            precio_unit: pUnit,
            subtotal: sub
          })
          .eq('id', det.id);
      }
    }
    
    // 2. Calcular nuevo total
    const desc = Number(discount) || 0;
    const baseAmount = Math.max(0, totalSubtotal - desc);
    const newTotal = applyIva ? baseAmount * 1.08 : baseAmount;
    
    // 3. Ajustar saldo_pendiente basado en la diferencia de total_caso
    const { data: master } = await supabase
      .from('casos_master')
      .select('total_caso, saldo_pendiente, google_event_id, codigo, paciente, doctor, fecha_entrega, hora_entrega, comentarios')
      .eq('id', caseId)
      .single();
      
    const oldTotal = Number(master?.total_caso) || 0;
    const oldSaldo = Number(master?.saldo_pendiente) || 0;
    
    let newSaldo = oldSaldo + (newTotal - oldTotal);
    if (newSaldo < 0) newSaldo = 0;
    
    // 4. Guardar master
    const { error: mErr } = await supabase
      .from('casos_master')
      .update({
        descuento: desc,
        iva_aplicado: applyIva,
        total_caso: newTotal,
        saldo_pendiente: newSaldo
      })
      .eq('id', caseId);
      
    if (mErr) throw mErr;

    // Actualizar Google Calendar si existe un evento asociado
    if (master?.google_event_id) {
      try {
        const eventDetails = detailsUpdates.map(d => ({
          producto: d.producto,
          unidades: d.unidades || 1
        }));
        await updateCalendarEvent(master.google_event_id, {
          id: caseId,
          codigo: master.codigo,
          paciente: master.paciente,
          doctor: master.doctor,
          fecha_entrega: master.fecha_entrega,
          hora_entrega: master.hora_entrega,
          comentarios: master.comentarios
        }, eventDetails);
      } catch (calErr) {
        console.error("[Google Calendar] Error al sincronizar cambios de productos:", calErr);
      }
    }
    
    revalidatePath('/admin/facturacion');
    return { success: true };
    
  } catch (error) {
    console.error("updateCaseFinancials error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCaseProductionDetails(caseId, detailsUpdates) {
  try {
    const supabase = getAdminClient();
    
    // 0. Eliminar los items removidos
    const { data: currentDetails } = await supabase.from('casos_detalle').select('id').eq('caso_id', caseId);
    const currentIds = currentDetails ? currentDetails.map(d => d.id) : [];
    const updatedIds = detailsUpdates.filter(d => d.id && !String(d.id).startsWith('temp_')).map(d => d.id);
    const idsToDelete = currentIds.filter(id => !updatedIds.includes(id));
    if (idsToDelete.length > 0) await supabase.from('casos_detalle').delete().in('id', idsToDelete);
    
    // 1. Guardar items
    let totalSubtotal = 0;
    for (const det of detailsUpdates) {
      const pUnit = Number(det.precio_unit) || 0;
      const cant = Number(det.unidades) || 0;
      const sub = pUnit * cant;
      totalSubtotal += sub;
      
      const dientesStr = Array.isArray(det.dientes) ? det.dientes.join(',') : (det.dientes || '');
      
      if (det.id && typeof det.id === 'string' && det.id.startsWith('temp_')) {
        await supabase.from('casos_detalle').insert({
          caso_id: caseId, producto: det.producto, dientes: dientesStr, unidades: cant, precio_unit: pUnit, subtotal: sub
        });
      } else {
        await supabase.from('casos_detalle').update({
          producto: det.producto, dientes: dientesStr, unidades: cant, precio_unit: pUnit, subtotal: sub
        }).eq('id', det.id);
      }
    }
    
    // 2. Traer info maestra para mantener descuentos intactos y datos de Google Calendar
    const { data: master } = await supabase.from('casos_master').select('descuento, iva_aplicado, total_caso, saldo_pendiente, google_event_id, codigo, paciente, doctor, fecha_entrega, hora_entrega, comentarios').eq('id', caseId).single();
    const desc = Number(master?.descuento) || 0;
    const applyIva = master?.iva_aplicado || false;
    
    const baseAmount = Math.max(0, totalSubtotal - desc);
    const newTotal = applyIva ? baseAmount * 1.08 : baseAmount;
    
    const oldTotal = Number(master?.total_caso) || 0;
    const oldSaldo = Number(master?.saldo_pendiente) || 0;
    let newSaldo = oldSaldo + (newTotal - oldTotal);
    if (newSaldo < 0) newSaldo = 0;
    
    // 3. Actualizar Master
    await supabase.from('casos_master').update({ total_caso: newTotal, saldo_pendiente: newSaldo }).eq('id', caseId);
    
    // Actualizar Google Calendar si existe un evento asociado
    if (master?.google_event_id) {
      try {
        const eventDetails = detailsUpdates.map(d => ({
          producto: d.producto,
          unidades: d.unidades || 1
        }));
        await updateCalendarEvent(master.google_event_id, {
          id: caseId,
          codigo: master.codigo,
          paciente: master.paciente,
          doctor: master.doctor,
          fecha_entrega: master.fecha_entrega,
          hora_entrega: master.hora_entrega,
          comentarios: master.comentarios
        }, eventDetails);
      } catch (calErr) {
        console.error("[Google Calendar] Error al sincronizar cambios de productos:", calErr);
      }
    }

    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
}

export async function returnCaseToBoard(caseId) {
  try {
    const supabase = getAdminClient();
    
    // Devolver al depto Inspección, estado En Proceso
    const { error } = await supabase
      .from('casos_master')
      .update({
        depto_actual: 'Inspección',
        estado: 'En Proceso'
      })
      .eq('id', caseId);

    if (error) throw error;
    
    revalidatePath('/');
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
}

export async function updateCaseDiscount(caseId, discountAmount, discountType) {
  try {
    const supabase = getAdminClient();

    // 1. Obtener la suma de casos_detalle para el caso
    const { data: detalles } = await supabase
      .from('casos_detalle')
      .select('subtotal')
      .eq('caso_id', caseId);

    let subtotalItems = 0;
    if (detalles && detalles.length > 0) {
      subtotalItems = detalles.reduce((acc, d) => acc + (Number(d.subtotal) || 0), 0);
    }

    // 2. Obtener el master actual
    const { data: master } = await supabase
      .from('casos_master')
      .select('total_caso, saldo_pendiente, iva_aplicado')
      .eq('id', caseId)
      .single();

    if (!master) return { success: false, error: 'Caso no encontrado' };

    const discountVal = Number(discountAmount) || 0;
    const descReal = discountType === 'porcentaje'
      ? subtotalItems * (discountVal / 100)
      : discountVal;

    const baseAmount = Math.max(0, subtotalItems - descReal);
    const newTotal = master.iva_aplicado ? baseAmount * 1.08 : baseAmount;

    // Calcular el nuevo saldo pendiente
    const oldTotal = Number(master.total_caso) || 0;
    const oldSaldo = Number(master.saldo_pendiente) || 0;

    let newSaldo = oldSaldo + (newTotal - oldTotal);
    if (newSaldo < 0) newSaldo = 0;

    // Redondear a 2 decimales
    const roundedTotal = Math.round(newTotal * 100) / 100;
    const roundedSaldo = Math.round(newSaldo * 100) / 100;

    // Update in DB
    const { error } = await supabase
      .from('casos_master')
      .update({
        descuento: descReal,
        total_caso: roundedTotal,
        saldo_pendiente: roundedSaldo
      })
      .eq('id', caseId);

    if (error) throw error;

    revalidatePath('/admin/facturacion');
    return { success: true, newTotal: roundedTotal, newSaldo: roundedSaldo };

  } catch (error) {
    console.error("updateCaseDiscount error:", error);
    return { success: false, error: error.message };
  }
}
