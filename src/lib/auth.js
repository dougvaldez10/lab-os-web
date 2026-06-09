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

export async function createUserInSystem(username, passwordOrPin, rol, avatarBase64) {
  try {
    const email = `${username.toLowerCase()}@lablegion.com`;
    // Create in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: passwordOrPin,
      email_confirm: true
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    // Insert into usuarios table
    const { data: user, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert([
        {
          username: username,
          rol: rol,
          avatar_base64: avatarBase64
        }
      ])
      .select()
      .single();

    if (dbError) {
      // Rollback auth creation if db insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
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
    // 1. Check if we need to update password
    if (passwordOrPin && passwordOrPin.trim() !== '') {
      // Find the user email to get auth_id (using supabase pattern of username@lablegion.com)
      const email = `${username.toLowerCase()}@lablegion.com`;
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && users.users) {
        const authUser = users.users.find(u => u.email === email);
        if (authUser) {
           await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
             password: passwordOrPin
           });
        }
      }
    }

    // 2. Update DB
    const { data: user, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .update({
        username: username,
        rol: rol,
        avatar_base64: avatarBase64
      })
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
    // 1. Delete from DB first
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    // 2. Delete from Auth
    const email = `${username.toLowerCase()}@lablegion.com`;
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (!listError && users.users) {
      const authUser = users.users.find(u => u.email === email);
      if (authUser) {
         await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      }
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
