import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Traer los casos
    const { data: rows, error } = await supabase
      .from('casos_master')
      .select('id, codigo, paciente, doctor, depto_actual, estado, fecha_ingreso, fecha_entrega, hora_entrega, tipo, operador_actual, hora_inicio')
      .order('fecha_entrega', { ascending: true, nullsFirst: false })
      .limit(100);

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    // 2. Traer las unidades agrupadas por caso (consulta separada para evitar problemas de FK)
    const ids = rows.map(r => r.id);
    let unidadesPorCaso = {};
    if (ids.length > 0) {
      const { data: detalles } = await supabase
        .from('casos_detalle')
        .select('caso_id, unidades')
        .in('caso_id', ids);
      if (detalles) {
        detalles.forEach(d => {
          unidadesPorCaso[d.caso_id] = (unidadesPorCaso[d.caso_id] || 0) + (d.unidades || 1);
        });
      }
    }

    // 3. Mapear con total_unidades
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
      total_unidades: unidadesPorCaso[row.id] || 1,
      urgent: false
    }));

    return Response.json(cases);
  } catch (error) {
    console.error('Database error:', error);
    return Response.json({ error: 'Failed to fetch cases', details: error.message }, { status: 500 });
  }
}

