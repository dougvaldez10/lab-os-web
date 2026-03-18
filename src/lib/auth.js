"use server";

import { supabase } from '@/lib/supabase';

export async function getCurrentUser() {
  try {
    // Obtener el usuario 'douglasvaldez' para el entorno de desarrollo local (Mock Auth)
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', 'douglasvaldez')
      .single();

    if (error) {
       console.log("No user found or error:", error);
       return null;
    }
    
    return user || null;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}
