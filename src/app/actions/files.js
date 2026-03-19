'use server';

import { supabase } from '@/lib/supabase';

const BUCKET = 'case-files';

/**
 * Subir un archivo a Supabase Storage.
 * Path: {caseId}/{dept}/{filename}
 */
export async function uploadCaseFile(caseId, dept, formData) {
  try {
    const file = formData.get('file');
    if (!file) return { error: 'No file provided' };

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
    return { success: true, path };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Listar archivos de un caso en un departamento.
 */
export async function getCaseFiles(caseId, dept) {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(`${caseId}/${dept}`, { sortBy: { column: 'created_at', order: 'desc' } });

    if (error) throw error;
    return { files: data || [] };
  } catch (e) {
    return { error: e.message, files: [] };
  }
}

/**
 * Obtener URL de descarga temporal (1 hora) para un archivo.
 */
export async function getCaseFileDownloadUrl(caseId, dept, filename) {
  try {
    const path = `${caseId}/${dept}/${filename}`;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);

    if (error) throw error;
    return { url: data.signedUrl };
  } catch (e) {
    return { error: e.message };
  }
}
