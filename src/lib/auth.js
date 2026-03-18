"use server";

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function loginUser(username, password) {
  try {
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !user) return { success: false, error: 'Credenciales inválidas' };

    // Set cookie persistence (30 days)
    cookies().set('lab_os_user', username, { 
       httpOnly: true, 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 60 * 60 * 24 * 30,
       path: '/'
    });

    return { success: true, user };
  } catch (err) {
    return { success: false, error: 'Error del servidor' };
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
