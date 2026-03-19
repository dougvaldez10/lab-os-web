import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const BUCKET = 'case-files';

// GET /api/case-files/url?caseId=xxx&dept=Digital_Escaneo&filename=modelo.stl
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get('caseId');
    const dept = searchParams.get('dept');
    const filename = searchParams.get('filename');

    if (!caseId || !dept || !filename) {
      return Response.json({ error: 'Missing params' }, { status: 400 });
    }

    const path = `${caseId}/${dept}/${filename}`;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600); // válido 1 hora

    if (error) throw error;
    return Response.json({ url: data.signedUrl });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
