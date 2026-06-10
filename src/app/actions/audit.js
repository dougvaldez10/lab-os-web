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

/**
 * Registra una "fotografía" de los datos que el usuario tiene en el formulario en un instante dado.
 */
export async function logShadowAudit(payload) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'No autorizado' };

    const supabase = getAdminClient();
    
    // Si la acción es registrar que SÍ se guardó oficialmente
    if (payload.guardado_oficial) {
      // Buscar si había un registro temporal reciente de este caso por este usuario
      // y marcarlo como guardado_oficial = true, o simplemente insertar uno nuevo.
      // Para simplificar, insertamos el registro oficial.
      const { error } = await supabase.from('auditoria_sombra').insert({
        caso_id: payload.caso_id,
        codigo_caso: payload.codigo_caso,
        admin_name: user.username || user.email || 'Desconocido',
        snapshot_data: payload.snapshot_data,
        guardado_oficial: true,
        revisado: true // Si es legítimo, no necesita revisión
      });
      if (error) throw error;
      return { success: true };
    }

    // Buscar si ya existe una alerta fantasma sin revisar para este usuario y caso
    const adminName = user.username || user.email || 'Desconocido';
    const { data: existing } = await supabase
      .from('auditoria_sombra')
      .select('id')
      .eq('caso_id', payload.caso_id)
      .eq('admin_name', adminName)
      .eq('guardado_oficial', false)
      .eq('revisado', false)
      .order('creado_en', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      // Actualizar la captura fantasma existente
      const { error } = await supabase.from('auditoria_sombra').update({
        snapshot_data: payload.snapshot_data,
        creado_en: new Date().toISOString()
      }).eq('id', existing[0].id);
      if (error) throw error;
    } else {
      // Insertar captura fantasma nueva
      const { error } = await supabase.from('auditoria_sombra').insert({
        caso_id: payload.caso_id,
        codigo_caso: payload.codigo_caso,
        admin_name: adminName,
        snapshot_data: payload.snapshot_data,
        guardado_oficial: false,
        revisado: false
      });
      if (error) throw error;
    }
    
    // No hacemos revalidatePath para no interrumpir nada, es silencioso
    return { success: true };

  } catch (err) {
    console.error("logShadowAudit error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Cuando se guarda oficialmente un caso o recibo, marcamos todas las alertas sombra 
 * no revisadas de ese caso como "guardado_oficial = true" y "revisado = true" 
 * para que desaparezcan del radar.
 */
export async function markShadowAuditAsSaved(casoId) {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('auditoria_sombra')
      .update({ guardado_oficial: true, revisado: true })
      .eq('caso_id', casoId)
      .eq('guardado_oficial', false)
      .eq('revisado', false);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("markShadowAuditAsSaved error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene las alertas de auditoría para el dashboard del SuperAdmin
 */
export async function getAuditAlerts() {
  try {
    const user = await getCurrentUser();
    const isAdmin = user?.is_superadmin || user?.rol === 'lab_owner' || user?.username?.toLowerCase() === 'legion';
    
    if (!user || !isAdmin) {
      throw new Error('No autorizado para ver auditoría');
    }

    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('auditoria_sombra')
      .select('*')
      .eq('guardado_oficial', false)
      .eq('revisado', false)
      .order('creado_en', { ascending: false });

    if (error) throw error;

    return { success: true, alerts: data || [] };

  } catch (err) {
    console.error("getAuditAlerts error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Marca una alerta como revisada
 */
export async function markAuditReviewed(id) {
  try {
    const user = await getCurrentUser();
    const isAdmin = user?.is_superadmin || user?.rol === 'lab_owner' || user?.username?.toLowerCase() === 'legion';
    
    if (!user || !isAdmin) {
      throw new Error('No autorizado');
    }

    const supabase = getAdminClient();
    
    const { error } = await supabase
      .from('auditoria_sombra')
      .update({ revisado: true })
      .eq('id', id);

    if (error) throw error;
    
    revalidatePath('/admin');
    return { success: true };

  } catch (err) {
    console.error("markAuditReviewed error:", err);
    return { success: false, error: err.message };
  }
}
