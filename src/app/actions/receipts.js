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

export async function generateReceipt(casoId, payload) {
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

    // Removed case advancement so it stays in "Casos Pendientes"
    // until explicitly marked as Sent

    revalidatePath('/'); // refrescar la UI principal
    return { success: true };

  } catch (error) {
    console.error("Excepción en generateReceipt:", error);
    return { success: false, error: "Error interno del servidor." };
  }
}
