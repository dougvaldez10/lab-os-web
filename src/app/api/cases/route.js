import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request) {
  try {
    // Verificar autenticaciÃƒÂ³n vÃƒÂ­a cookie antes de servir datos
    let authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader === 'Bearer ') {
       const cookieStore = await cookies();
       const ghostCookie = cookieStore.get('lab_os_ghost')?.value;
       if (ghostCookie) {
         authHeader = `Bearer ${ghostCookie}`;
       }
    }

    if (!authHeader || authHeader === 'Bearer ') {
      return Response.json({ error: 'Unauthorized (No Cookie or Header found)' }, { status: 401 });
    }

    // Usar service role key para bypasear RLS y ver TODOS los casos del laboratorio.
    // La autenticaciÃƒÂ³n ya se validÃƒÂ³ arriba con la cookie del ghost user.
    const secureClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY 
    );

    // 1. Traer los casos
    const { data: rows, error } = await secureClient
      .from('casos_master')
      .select('*')
      .neq('estado', 'Entregado')
      .neq('estado', 'Finalizado')
      .neq('depto_actual', 'Facturación')
      .order('fecha_entrega', { ascending: true, nullsFirst: false })
      .limit(5000);

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    // 1.5 Obtener categorias y precios de productos para mapeo exacto
    const { data: dbProducts } = await secureClient.from('productos').select('nombre, categoria, precio');
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
      const { data: detalles } = await secureClient
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


    // 2.5 Obtener la hora_llegada mas reciente de cada caso desde el historico
    let horaLlegadaPorCaso = {};
    if (ids.length > 0) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data: tiempos } = await adminClient
        .from('casos_tiempos_historicos')
        .select('id_caso, hora_llegada')
        .in('id_caso', ids)
        .not('hora_llegada', 'is', null)
        .is('hora_termino', null)
        .order('hora_llegada', { ascending: false });

      if (tiempos) {
        const seen = new Set();
        for (const t of tiempos) {
          if (!seen.has(t.id_caso)) {
            horaLlegadaPorCaso[t.id_caso] = t.hora_llegada;
            seen.add(t.id_caso);
          }
        }
      }
    }

    // 3. Mapear con total_unidades
    const cases = rows.map(row => ({
      internal_id: row.id,
      id: row.codigo,
      cliente_id: row.cliente_id,
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
      urgent: false,
      hora_llegada: horaLlegadaPorCaso[row.id] || null,
    }));

    revalidatePath('/');
    return Response.json(cases);
  } catch (error) {
    console.error('Database error:', error);
    return Response.json({ error: 'Failed to fetch cases', details: error.message }, { status: 500 });
  }
}


