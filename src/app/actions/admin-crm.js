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

// ---- CLIENTES (ClÃƒÂ­nicas) ----

export async function getAdminClients() {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();
    const { data, error } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function createAdminClient(payload) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();
    const { error } = await supabase.from('clientes').insert([payload]);
    if (error) throw error;
    revalidatePath('/admin/crm');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function updateAdminClient(id, payload) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();
    const { error } = await supabase.from('clientes').update(payload).eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/crm');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function deleteAdminClient(id) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/crm');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ---- DOCTORES ----

export async function getAdminDoctors() {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('doctores')
      .select('*, doctor_clinica(cliente_id, clientes(nombre))')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function createAdminDoctor(payload) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();
    
    // Extraemos cliente_ids del payload para insertarlos en la tabla intermedia
    const { cliente_ids, ...doctorData } = payload;

    // Normalizar espaciado y recortar espacios en blanco al inicio y al final
    if (doctorData.nombre) doctorData.nombre = doctorData.nombre.trim();
    if (doctorData.apellido) doctorData.apellido = doctorData.apellido.trim();
    if (doctorData.trato) doctorData.trato = doctorData.trato.trim();

    // Insertar doctor en la tabla doctores
    const { data: insertedDoctor, error: docError } = await supabase
      .from('doctores')
      .insert([doctorData])
      .select('id')
      .single();

    if (docError) throw docError;

    // Si hay clínicas asociadas, creamos los registros en la tabla intermedia
    if (cliente_ids && cliente_ids.length > 0) {
      const links = cliente_ids.map(cId => ({
        doctor_id: insertedDoctor.id,
        cliente_id: parseInt(cId)
      }));
      const { error: linkError } = await supabase
        .from('doctor_clinica')
        .insert(links);
      if (linkError) throw linkError;
    }

    revalidatePath('/admin/crm');
    return { success: true };
  } catch (err) {
    console.error("createAdminDoctor error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateAdminDoctor(id, payload) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();
    
    // Extraemos cliente_ids del payload
    const { cliente_ids, ...doctorData } = payload;

    // Normalizar espaciado y recortar espacios en blanco al inicio y al final
    if (doctorData.nombre) doctorData.nombre = doctorData.nombre.trim();
    if (doctorData.apellido) doctorData.apellido = doctorData.apellido.trim();
    if (doctorData.trato) doctorData.trato = doctorData.trato.trim();

    // Actualizar campos del doctor
    const { error: docError } = await supabase
      .from('doctores')
      .update(doctorData)
      .eq('id', id);

    if (docError) throw docError;

    // Eliminar asociaciones actuales en la tabla intermedia
    const { error: delError } = await supabase
      .from('doctor_clinica')
      .delete()
      .eq('doctor_id', id);
      
    if (delError) throw delError;

    // Insertar nuevas asociaciones
    if (cliente_ids && cliente_ids.length > 0) {
      const links = cliente_ids.map(cId => ({
        doctor_id: id,
        cliente_id: parseInt(cId)
      }));
      const { error: linkError } = await supabase
        .from('doctor_clinica')
        .insert(links);
      if (linkError) throw linkError;
    }

    revalidatePath('/admin/crm');
    return { success: true };
  } catch (err) {
    console.error("updateAdminDoctor error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteAdminDoctor(id) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();
    const { error } = await supabase.from('doctores').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/crm');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
