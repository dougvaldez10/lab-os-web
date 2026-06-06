"use server";

import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

function getGodClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Verifica estrictamente si el usuario actual tiene permisos de Modo Dios
async function checkSuperAdminAccess() {
  const user = await getCurrentUser();
  if (!user || !user.is_superadmin) {
    throw new Error('No autorizado. Se requiere acceso de Modo Dios.');
  }
}

export async function fetchAllLaboratorios() {
  try {
    await checkSuperAdminAccess();
    const supabase = getGodClient();
    
    const { data: laboratorios, error } = await supabase
      .from('laboratorios')
      .select('*')
      .order('id', { ascending: true });
      
    if (error) throw error;
    return { success: true, data: laboratorios };
  } catch (error) {
    console.error("fetchAllLaboratorios Error:", error);
    return { success: false, error: error.message };
  }
}

export async function createLaboratorio(payload) {
  try {
    await checkSuperAdminAccess();
    const supabase = getGodClient();
    
    const { error } = await supabase
      .from('laboratorios')
      .insert([{ nombre: payload.nombre, estado: payload.estado || 'activo' }]);
      
    if (error) throw error;
    
    revalidatePath('/superadmin/laboratorios');
    return { success: true };
  } catch (error) {
    console.error("createLaboratorio Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateLaboratorio(id, payload) {
  try {
    await checkSuperAdminAccess();
    const supabase = getGodClient();
    
    const { error } = await supabase
      .from('laboratorios')
      .update(payload)
      .eq('id', id);
      
    if (error) throw error;
    
    revalidatePath('/superadmin/laboratorios');
    return { success: true };
  } catch (error) {
    console.error("updateLaboratorio Error:", error);
    return { success: false, error: error.message };
  }
}
