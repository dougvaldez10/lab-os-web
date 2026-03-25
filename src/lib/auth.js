"use server";

import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://etnfvmpywgbeqvbyieze.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bmZ2bXB5d2diZXF2YnlpZXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcwMTc3NiwiZXhwIjoyMDg5Mjc3Nzc2fQ.aE6WgegPGa426dYQKHyEMsd-GasEQa0Qqonh6EkrSC4"
);
export async function loginUser(username, password) {
  try {
    const salt = "legion_lab_";
    const pwd_hash = crypto.createHash('sha256').update(salt + password).digest('hex');

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

    // 2. Compara el Hash (Idéntico a Python)
    if (user.password_hash !== pwd_hash) {
       console.log(`Hash Mismatch para ${username}. InputHash: ${pwd_hash} | DBHash: ${user.password_hash}`);
       return { success: false, error: 'Contraseña incorrecta' };
    }

    // 3. Estrategia de Usuario Fantasma para cumplir con RLS estricto
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
       email: 'autenticador@legion.com',
       password: '5*E9uU7!4tkUN/H'
    });

    if (authError || !authData.session) {
       console.error("Ghost login error:", authError);
       return { success: false, error: 'Error interno de autenticación RLS' };
    }

    // Set cookie persistence (30 days) para nuestro auth nativo
    const cookieStore = await cookies();
    cookieStore.set('lab_os_user', username, { 
       httpOnly: true, 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 60 * 60 * 24 * 30,
       path: '/'
    });

    // Retorna la sesión de Supabase al cliente
    return { success: true, user, session: authData.session };
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
    const username = cookieStore.get('lab_os_user')?.value;

    if (!username) return null;

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) return null;
    return user || null;
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
       return [];
    }
    return users || [];
  } catch (err) {
    console.error("Server Action getAllUsers Error:", err);
    return [];
  }
}
