import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: rows, error } = await supabase
      .from('casos_master')
      .select('id, codigo, paciente, doctor, depto_actual, estado, fecha_ingreso, fecha_entrega, hora_entrega, tipo, operador_actual, hora_inicio')
      .order('fecha_entrega', { ascending: true, nullsFirst: false })
      .limit(100);

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    // Mapeo adaptado a la UI existente
    const cases = rows.map(row => ({
      internal_id: row.id,
      id: row.codigo,
      patient: row.paciente,
      doctor: row.doctor,
      dept: row.depto_actual,
      status: row.estado,
      date: row.fecha_ingreso,
      fecha_entrega: row.fecha_entrega,
      hora_entrega: row.hora_entrega,
      tipo: row.tipo,
      operador_actual: row.operador_actual,
      hora_inicio: row.hora_inicio,
      urgent: row.tipo?.toLowerCase() === 'digital' // Regla original, puede cambiarse
    }));

    return Response.json(cases);
  } catch (error) {
    console.error('Database error:', error);
    return Response.json({ error: 'Failed to fetch cases', details: error.message }, { status: 500 });
  }
}
