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

    // Eliminar el caso maestro (las FK con cascade o limpieza manual si es necesario)
    const { error } = await supabase
      .from('casos_master')
      .delete()
      .eq('id', internalId);

    if (error) {
      console.error(error);
      return { success: false, error: "Error al eliminar el caso." };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error("deleteAdminCase error:", err);
    return { success: false, error: err.message };
  }
}
