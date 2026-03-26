import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Faltan variables de entorno de Supabase");
}

export const supabase = createClient(
  supabaseUrl || 'https://etnfvmpywgbeqvbyieze.supabase.co', 
  supabaseAnonKey || 'sb_publishable_ZGAVQvsSWDTmZbY6dj0UUQ_YOa3Dn8L'
);
