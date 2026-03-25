"use server";

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { updateCaseState } from './cases';

export async function generateReceipt(casoId, payload) {
  try {
    if (!casoId || !payload) {
      return { success: false, error: "Datos incompletos para el recibo." };
    }

    // 1. Insertar el recibo (Borrador) en la tabla 'recibos'
    const { error: insertError } = await supabase
      .from('recibos')
      .insert([{
        caso_id: casoId,
        subtotal: payload.subtotal,
        descuento_tipo: payload.discountType,
        descuento_valor: payload.discountValue || 0,
        iva_aplicado: payload.applyIva,
        monto_iva: payload.ivaAmount,
        total: payload.total
      }]);

    if (insertError) {
      console.error("Error insertando recibo:", insertError);
      return { success: false, error: "Error en la Base de Datos al guardar recibo." };
    }

    // 2. Avanzar el caso al siguiente departamento (Empaquetado)
    // Asumimos que "updateCaseState" maneja la transición de Recibo/Factura -> Empaquetado
    const advanceResult = await updateCaseState(casoId, 'COMPLETE');
    
    if (!advanceResult.success) {
        return { success: false, error: advanceResult.error };
    }

    revalidatePath('/'); // refrescar la UI principal
    return { success: true };

  } catch (error) {
    console.error("Excepción en generateReceipt:", error);
    return { success: false, error: "Error interno del servidor." };
  }
}
