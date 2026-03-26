import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    let authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader === 'Bearer ') {
       const ghostCookie = cookies().get('lab_os_ghost')?.value;
       if (ghostCookie) {
         authHeader = `Bearer ${ghostCookie}`;
       }
    }

    if (!authHeader || authHeader === 'Bearer ') {
      return Response.json({ error: 'Unauthorized (No Cookie or Header found)' }, { status: 401 });
    }

    const secureClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 1. Traer los casos
    const { data: rows, error } = await secureClient
      .from('casos_master')
      .select('*')
      .order('fecha_entrega', { ascending: true, nullsFirst: false })
      .limit(100);

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    // 1.5 Obtener categorias y precios de productos para mapeo exacto
    const { data: dbProducts } = await supabase.from('productos').select('nombre, categoria, precio');
    let catMap = {};
    let priceMap = {};
    if (dbProducts) {
      dbProducts.forEach(p => {
        const cleanName = p.nombre.replace(/^\d+\-/, '').trim();
        catMap[cleanName] = p.categoria;
        catMap[p.nombre] = p.categoria;
        priceMap[cleanName] = Number(p.precio) || 0;
        priceMap[p.nombre] = Number(p.precio) || 0;
      });
    }

    // 2. Traer las unidades y productos agrupados por caso
    const ids = rows.map(r => r.id);
    let unidadesPorCaso = {};
    let itemsPorCaso = {};
    if (ids.length > 0) {
      const { data: detalles } = await supabase
        .from('casos_detalle')
        .select('caso_id, unidades, producto, dientes')
        .in('caso_id', ids);
      if (detalles) {
        detalles.forEach(d => {
          if (!itemsPorCaso[d.caso_id]) itemsPorCaso[d.caso_id] = [];
          itemsPorCaso[d.caso_id].push({
            producto: d.producto || '',
            categoria: catMap[d.producto] || '',
            precio_unitario: priceMap[d.producto] || 0,
            dientes: d.dientes || '',
            unidades: d.unidades || 1
          });
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
      comentarios: row.comentarios,
      color: row.color,
      total_unidades: unidadesPorCaso[row.id] || 1,
      items: itemsPorCaso[row.id] || [],
      urgent: false
    }));

    return Response.json(cases);
  } catch (error) {
    console.error('Database error:', error);
    return Response.json({ error: 'Failed to fetch cases', details: error.message }, { status: 500 });
  }
}

