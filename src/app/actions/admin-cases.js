"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key-for-build-only"
  );
}

// Verifica si el usuario actual es admin
async function checkAdminAccess() {
  const user = await getCurrentUser();
  if (!user || (user.username?.toLowerCase() !== 'admin' && user.username?.toLowerCase() !== 'coloraturacorp')) {
    throw new Error('No autorizado');
  }
}

export async function updateAdminCase(internalId, payload) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('casos_master')
      .update(payload)
      .eq('id', internalId);

    if (error) {
      console.error(error);
      return { success: false, error: "Error al actualizar el caso." };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error("updateAdminCase error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteAdminCase(internalId) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    // Limpieza manual (Cascade) de tablas relacionadas para evitar errores de llave foránea
    const { error: err1 } = await supabase.from('casos_detalle').delete().eq('caso_id', internalId);
    if (err1) { console.error("Error deleting detalles:", err1); return { success: false, error: "Error eliminando detalles: " + err1.message }; }

    const { error: err2 } = await supabase.from('casos_tiempos_historicos').delete().eq('id_caso', internalId);
    if (err2) { console.error("Error deleting tiempos:", err2); return { success: false, error: "Error eliminando tiempos: " + err2.message }; }

    const { error: err3 } = await supabase.from('cuenta_corriente_clinica').delete().eq('caso_id', internalId);
    if (err3) { console.error("Error deleting cuenta:", err3); return { success: false, error: "Error eliminando cuenta: " + err3.message }; }

    // Eliminar el caso maestro
    const { error } = await supabase
      .from('casos_master')
      .delete()
      .eq('id', internalId);

    if (error) {
      console.error(error);
      return { success: false, error: `Error DB: ${error.message || JSON.stringify(error)}` };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error("deleteAdminCase error:", err);
    return { success: false, error: err.message };
  }
}
