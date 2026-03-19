import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const BUCKET = 'case-files';

// GET /api/case-files?caseId=xxx&dept=Digital_Escaneo
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get('caseId');
    const dept = searchParams.get('dept');

    if (!caseId || !dept) {
      return Response.json({ error: 'Missing caseId or dept' }, { status: 400 });
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(`${caseId}/${dept}`, { sortBy: { column: 'created_at', order: 'desc' } });

    if (error) throw error;
    return Response.json({ files: data || [] });
  } catch (e) {
    return Response.json({ error: e.message, files: [] }, { status: 500 });
  }
}
