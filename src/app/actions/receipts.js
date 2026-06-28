"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { updateCaseState } from './cases';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function saveReceiptData(casoId, payload) {
  try {
    if (!casoId || !payload) {
      return { success: false, error: "Datos incompletos para el recibo." };
    }

    const supabase = getAdminClient();

    // Update the case directly in 'casos_master' with the calculated totals and IVA setting
    const { error: updateError } = await supabase
      .from('casos_master')
      .update({
        iva_aplicado: payload.applyIva,
        descuento: payload.discount || 0,
        total_caso: payload.total,
        saldo_pendiente: payload.total
      })
      .eq('id', casoId);

    if (updateError) {
      console.error("Error al actualizar totales del caso:", updateError);
      return { success: false, error: `Error DB Caso: ${updateError.message || JSON.stringify(updateError)}` };
    }

    // Opcional: Insertar en la tabla `recibos` si existe y se usa en el frontend
    const { error: insertReceiptErr } = await supabase
      .from('recibos')
      .insert({
        caso_id: casoId,
        subtotal: payload.subtotal || 0,
        descuento_tipo: payload.discountType || 'fijo',
        descuento_valor: payload.discount || 0,
        iva_aplicado: payload.applyIva || false,
        monto_iva: payload.ivaAmount || 0,
        total: payload.total || 0
      });

    if (insertReceiptErr) {
      console.error("Error al insertar en recibos:", insertReceiptErr);
      // No fallamos la operación completa si el registro en 'recibos' falla, ya que master está actualizado.
    }

    revalidatePath('/'); // refrescar la UI principal
    return { success: true };

  } catch (error) {
    console.error("Excepción en saveReceiptData:", error);
    return { success: false, error: "Error interno del servidor." };
  }
}

export async function getReceiptByCaseId(casoId) {
  try {
    if (!casoId) return { success: false, error: "ID de caso requerido" };
    
    const supabase = getAdminClient();
    
    // Obtenemos información principal del caso
    const { data: caso, error: errCaso } = await supabase
      .from('casos_master')
      .select(`
        id, codigo, paciente, doctor, total_caso, saldo_pendiente, fecha_entrega,
        iva_aplicado, descuento, cliente_id,
        clientes(nombre, direccion, rfc, tel_fijo, tel_celular),
        casos_detalle(unidades, producto, dientes, precio_unit, subtotal)
      `)
      .eq('id', casoId)
      .single();
      
    if (errCaso || !caso) {
      return { success: false, error: "Caso no encontrado." };
    }
    
    // Obtenemos los abonos si queremos mostrar cuánto se ha pagado en el ticket
    const { data: pagos } = await supabase
      .from('pagos_historico')
      .select('monto_abono')
      .eq('id_caso', casoId)
      .eq('tipo_movimiento', 'abono');
      
    const totalAbonado = (pagos || []).reduce((acc, p) => acc + (Number(p.monto_abono) || 0), 0);

    return { 
      success: true, 
      receiptData: {
        caso,
        abono: totalAbonado
      }
    };
  } catch (error) {
    console.error("Excepción en getReceiptByCaseId:", error);
    return { success: false, error: "Error interno del servidor al obtener recibo." };
  }
}
