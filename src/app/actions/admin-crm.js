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
  if (!user || (user.username?.toLowerCase() !== 'admin' && user.username?.toLowerCase() !== 'coloraturacorp')) {
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
      .select('*, clientes(nombre)')
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
    const { error } = await supabase.from('doctores').insert([payload]);
    if (error) throw error;
    revalidatePath('/admin/crm');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function updateAdminDoctor(id, payload) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();
    const { error } = await supabase.from('doctores').update(payload).eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/crm');
    return { success: true };
  } catch (err) {
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
