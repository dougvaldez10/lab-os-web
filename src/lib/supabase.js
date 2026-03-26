import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Faltan variables de entorno de Supabase");
}

export const supabase = createClient(
  supabaseUrl || 'https://etnfvmpywgbeqvbyieze.supabase.co', 
  supabaseAnonKey || 'sb_publishable_ZGAVQvsSWDTmZbY6dj0UUQ_YOa3Dn8L'
);

export async function getSecureClient() {
  try {
    const cookieStore = await cookies();
    const ghostCookie = cookieStore.get('lab_os_ghost')?.value;
    
    if (!ghostCookie) {
      return supabase;
    }

    return createClient(
      supabaseUrl || 'https://etnfvmpywgbeqvbyieze.supabase.co',
      supabaseAnonKey || 'sb_publishable_ZGAVQvsSWDTmZbY6dj0UUQ_YOa3Dn8L',
      { global: { headers: { Authorization: `Bearer ${ghostCookie}` } } }
    );
  } catch (e) {
    return supabase;
  }
}
