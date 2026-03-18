"use server";

import { supabase } from '@/lib/supabase';

export async function getClients() {
  try {
    // Solo necesitamos ID, nombre y doctor (algunas veces tiene alias doctor)
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) throw error;
    
    return clientes || [];
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}
