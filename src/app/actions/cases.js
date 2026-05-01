"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// Cliente Admin — bypasses RLS. Seguro porque "use server" nunca llega al navegador.
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Flujo lógico de departamentos
const FLUJO_DIGITAL = {
    "Recepción": "Digital_Diseno",
    "Digital_Diseno": "Digital_Fresado",
    "Digital_Fresado": "Sinterizado",
    "Sinterizado": "Ajuste",
    "Ajuste": "Terminado",
    "Terminado": "Inspección",
    "Inspección": "Recibo/Factura",
    "Recibo/Factura": "Empaquetado",
    "Empaquetado": "Envío",
    "Envío": "Facturación",
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
    "Inspección": "Recibo/Factura",
    "Recibo/Factura": "Empaquetado",
    "Empaquetado": "Envío",
    "Envío": "Facturación"
};

// ─────────────────────────────────────────────────────────────────────────────
// Genera el CARGO en cuenta_corriente_clinica cuando un caso es enviado.
// Equivalente exacto a lo que hace el Lab OS de escritorio en _cargo_envio_bg().
// ─────────────────────────────────────────────────────────────────────────────
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
      console.warn('[CARGO] Caso', codigo, 'sin importe — CARGO omitido.');
      return;
    }

    // 4. Insertar CARGO
    const { error: insertErr } = await supabase
      .from('cuenta_corriente_clinica')
      .insert({
        cliente_id: clienteId,
        caso_id:    caseId,
        tipo:       'CARGO',
        descripcion: `Trabajo enviado: ${codigo} - ${paciente}`,
        monto:      Math.round(total * 100) / 100,
        fecha:      new Date().toISOString()
      });

    if (insertErr) {
      console.error('[CARGO] Error insertando CARGO:', insertErr);
    } else {
      console.log(`[CARGO] ✅ CARGO registrado → caso=${codigo} cliente=${clienteId} total=$${total.toFixed(2)}`);
    }
  } catch (err) {
    console.error('[CARGO] Error inesperado en registrarCargoEnvio:', err);
  }
}

export async function updateCaseState(internalId, action, operatorName = null) {
  try {
    const supabase = getAdminClient();
    if (!internalId || !['START', 'PAUSE', 'COMPLETE', 'SHIP'].includes(action)) {
      return { success: false, error: "Datos de acción inválidos." };
    }

    // Consulta el estado actual, tipo y metadata de display
    const { data: currentCase, error: fetchError } = await supabase
      .from('casos_master')
      .select('depto_actual, tipo, codigo, paciente')
      .eq('id', internalId)
      .single();
    
    if (fetchError || !currentCase) {
      console.error(fetchError);
      return { success: false, error: "Caso no encontrado." };
    }

    const deptoLimpio = currentCase.depto_actual ? currentCase.depto_actual.trim() : "";
    const tipoLimpio  = currentCase.tipo ? currentCase.tipo.trim().toLowerCase() : "análogo";

    let updateData = {};
    let esEnvioFinal = false;

    let _deptoActualForHistorico = currentCase.depto_actual || '';
    let _nextDeptForHistorico = null;

    if (action === 'START') {
        const utcIso = new Date().toISOString();
        updateData = { estado: 'En Proceso', operador_actual: operatorName, hora_inicio: utcIso };

    } else if (action === 'PAUSE') {
        updateData = { estado: 'En Pausa' };

    } else if (action === 'SHIP' || (action === 'COMPLETE' && deptoLimpio === 'Envío')) {
        // ── ENVÍO FINAL: caso sale del laboratorio ──
        // Se chequea ANTES del bloque COMPLETE general para evitar que caiga ahí.
        esEnvioFinal = true;
        updateData = { depto_actual: 'Facturación', estado: 'Finalizado', operador_actual: null, hora_inicio: null };

    } else if (action === 'COMPLETE') {
        let nextDept = "Terminado";
        if (tipoLimpio === "digital") {
            nextDept = FLUJO_DIGITAL[deptoLimpio] || "Terminado";
        } else {
            nextDept = FLUJO_ANALOGO[deptoLimpio] || "Terminado";
        }
        
        // Regla dinámica: si sale de Digital_Fresado, evaluar si requiere Sinterizado
        if (deptoLimpio === 'Digital_Fresado') {
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
    if (action === 'START') { registrarInicio(supabase, internalId, _deptoActualForHistorico).catch(() => {}); } else if (action === 'COMPLETE') { registrarTermino(supabase, internalId, _deptoActualForHistorico, _nextDeptForHistorico).catch(() => {}); }

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
