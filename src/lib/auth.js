"use server";

import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Provide fallback values so Next.js static generation doesn't crash during build if env vars are missing
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-to-prevent-build-crash'
);
export async function loginUser(username, password) {
  try {

    // 1. Fetch user by username only using Admin Client (RLS Bypass)
    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
       console.log("Supabase error fetching user:", error);
       return { success: false, error: 'Usuario no encontrado' };
    }
    
    if (!user) {
       return { success: false, error: 'Usuario no existe' };
    }

    // 2. Realizamos Login nativo en Supabase Auth usando el correo generado en la migración
    // Importante: Hasta que no cambien su contraseña, la temporal es 'LabLegion2026!'
    const email = `${username.toLowerCase()}@lablegion.com`;
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
       email: email,
       password: password
    });

    if (authError || !authData.session) {
       console.log(`Error Supabase Auth para ${username}:`, authError?.message);
       return { success: false, error: 'Contraseña incorrecta. Recuerda que hemos actualizado el sistema.' };
    }

    // Set cookie persistence (30 days) para nuestro auth nativo
    const cookieStore = await cookies();
    cookieStore.set('lab_os_user', username, { 
       httpOnly: true, 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 60 * 60 * 24 * 30,
       path: '/'
    });
    // Inyectamos el JWT de Supabase Ghost User directamente en las Cookies!
    cookieStore.set('lab_os_ghost', authData.session.access_token, {
       httpOnly: true, 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 60 * 60 * 24 * 30,
       path: '/'
    });

    // Retorna la sesiÃ³n de Supabase al cliente parseada (solo strings para Next.js RSC)
    return { 
      success: true, 
      user, 
      session: { 
        access_token: authData.session.access_token, 
        refresh_token: authData.session.refresh_token 
      } 
    };
  } catch (err) {
    console.error("Server Action Login Error:", err);
    return { success: false, error: 'Error del servidor: ' + err.message };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('lab_os_user');
  return { success: true };
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('lab_os_ghost')?.value; // We named the cookie 'lab_os_ghost' historically

    if (!token) return null;

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return null;

    // Attach app_metadata cleanly for the rest of the app to use
    return {
      id: user.id,
      email: user.email,
      laboratorio_id: user.app_metadata?.laboratorio_id,
      rol: user.app_metadata?.role,
      is_superadmin: user.app_metadata?.is_superadmin || false,
      username: user.email.split('@')[0]
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

export async function getAllUsers() {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, username, rol, avatar_base64');
    
    if (error) {
       console.error("Error fetching users:", error);
       throw new Error(`Supabase error: ${error.message}`);
    }
    return users || [];
  } catch (err) {
    console.error("Server Action getAllUsers Error:", err);
    throw new Error(`Exception in getAllUsers: ${err.message}`);
  }
}
