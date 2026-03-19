import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const BUCKET = 'case-files';

// POST /api/upload-file  — recibe multipart/form-data con file, caseId, dept
export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const caseId = formData.get('caseId');
    const dept = formData.get('dept');

    if (!file || !caseId || !dept) {
      return Response.json({ error: 'Missing file, caseId or dept' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const path = `${caseId}/${dept}/${file.name}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (error) throw error;
    return Response.json({ success: true, path });
  } catch (e) {
    console.error('Upload error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
