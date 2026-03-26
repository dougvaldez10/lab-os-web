import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Este endpoint renueva el JWT del Ghost User y actualiza el cookie
export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.GHOST_USER_EMAIL || 'autenticador@legion.com',
      password: process.env.GHOST_USER_PASSWORD,
    });

    if (authError || !authData?.session) {
      console.error('Ghost refresh error:', authError);
      return Response.json({ error: 'Ghost refresh failed' }, { status: 500 });
    }

    const cookieStore = await cookies();
    cookieStore.set('lab_os_ghost', authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 dias de cookie, pero el JWT se renueva cada vez
      path: '/',
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('Refresh ghost route error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
