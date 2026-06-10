"use server";

import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Provide fallback values so Next.js static generation doesn't crash during build if env vars are missing
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-to-prevent-build-crash'
);
export async function loginUser(username, password) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
       return { success: false, error: 'Usuario no encontrado' };
    }

    const cookieStore = await cookies();

    // Si tiene password_hash, es un usuario local (Producción/Admin)
    if (user.password_hash) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
         return { success: false, error: 'Contraseña incorrecta' };
      }
      
      cookieStore.set('lab_os_user', username, { 
         httpOnly: true, 
         secure: process.env.NODE_ENV === 'production',
         maxAge: 60 * 60 * 24 * 30,
         path: '/'
      });
      
      return { success: true, user, session: null };
    }

    // Si NO tiene password_hash, es el Lab Owner (Supabase Auth)
    const email = `${username.toLowerCase()}@lablegion.com`;
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
       email: email,
       password: password
    });

    if (authError || !authData.session) {
       return { success: false, error: 'Contraseña incorrecta.' };
    }

    cookieStore.set('lab_os_user', username, { 
       httpOnly: true, 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 60 * 60 * 24 * 30,
       path: '/'
    });
    cookieStore.set('lab_os_ghost', authData.session.access_token, {
       httpOnly: true, 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 60 * 60 * 24 * 30,
       path: '/'
    });

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
  cookieStore.delete('lab_os_ghost');
  await supabase.auth.signOut();
  return { success: true };
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const localUser = cookieStore.get('lab_os_user')?.value;
    const token = cookieStore.get('lab_os_ghost')?.value;

    if (localUser) {
      const { data: user } = await supabaseAdmin.from('usuarios').select('*').eq('username', localUser).single();
      if (user && user.password_hash) {
        return {
          id: user.id,
          email: null,
          username: user.username,
          rol: user.rol,
          is_superadmin: false
        };
      }
    }

    if (!token) return null;

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return null;

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

export async function createUserInSystem(username, passwordOrPin, rol, avatarBase64) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordOrPin, salt);

    const { data: user, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert([
        {
          username: username,
          password_hash: hash,
          rol: rol,
          avatar_base64: avatarBase64
        }
      ])
      .select()
      .single();

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Error in createUserInSystem:", error);
    return { success: false, error: error.message };
  }
}

export async function updateUserInSystem(id, username, passwordOrPin, rol, avatarBase64) {
  try {
    let updates = {
      username: username,
      rol: rol,
      avatar_base64: avatarBase64
    };

    if (passwordOrPin && passwordOrPin.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(passwordOrPin, salt);
    }

    const { data: user, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Error in updateUserInSystem:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteUserInSystem(id, username) {
  try {
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteUserInSystem:", error);
    return { success: false, error: error.message };
  }
}

export async function loginSaaSUser(email, password) {
  try {
    // Uses the standard Supabase Auth flow with real email
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      return { success: false, error: 'Credenciales incorrectas' };
    }

    const user = authData.user;
    const isSuperAdmin = user.app_metadata?.is_superadmin === true;
    
    // We also set the ghost cookie or equivalent so standard lab fetching works
    const cookieStore = await cookies();
    cookieStore.set('lab_os_ghost', authData.session.access_token, {
       httpOnly: true, 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 60 * 60 * 24 * 30,
       path: '/'
    });
    // Set user identifier as email or username extracted from email
    const username = email.split('@')[0];
    cookieStore.set('lab_os_user', username, { 
       httpOnly: true, 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 60 * 60 * 24 * 30,
       path: '/'
    });

    return { 
      success: true, 
      is_superadmin: isSuperAdmin,
      user: {
         id: user.id,
         email: user.email,
         username: username,
         laboratorio_id: user.app_metadata?.laboratorio_id
      }
    };
  } catch (err) {
    console.error("Server Action SaaS Login Error:", err);
    return { success: false, error: 'Error del servidor: ' + err.message };
  }
}

export async function registerSaaSUser(nombre, laboratorio, email, password) {
  try {
    // 1. Generate a new Laboratorio ID
    const labId = `lab_${crypto.randomBytes(4).toString('hex')}`;

    // 2. Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role: 'lab_owner',
        laboratorio_id: labId,
        is_superadmin: false
      },
      user_metadata: {
        nombre_completo: nombre,
        nombre_laboratorio: laboratorio
      }
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    // Note: We would ideally also create the 'laboratorio' record in a global `laboratorios` table here.
    // For now, the user exists in auth with their app_metadata linked to their lab ID.

    return { success: true, user: authUser.user };
  } catch (err) {
    console.error("Server Action SaaS Register Error:", err);
    return { success: false, error: 'Error del servidor: ' + err.message };
  }
}
