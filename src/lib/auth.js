"use server";

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function loginUser(username, password) {
  try {
    const salt = "legion_lab_";
    const pwd_hash = crypto.createHash('sha256').update(salt + password).digest('hex');

    // 1. Fetch user by username only
    const { data: user, error } = await supabase
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

    // Set cookie persistence (30 days)
    cookies().set('lab_os_user', username, { 
       httpOnly: true, 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 60 * 60 * 24 * 30,
       path: '/'
    });

    return { success: true, user };
  } catch (err) {
    console.error("Server Action Login Error:", err);
    return { success: false, error: 'Error del servidor: ' + err.message };
  }
}

export async function logoutUser() {
  cookies().delete('lab_os_user');
  return { success: true };
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
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
