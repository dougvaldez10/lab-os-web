import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key-for-build-only"
  );
}

export async function GET(request) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || 'super';
    
    // Find the client
    const { data: clients, error: errClient } = await supabase
      .from('clientes')
      .select('id, nombre')
      .ilike('nombre', `%${search}%`);

    if (errClient || !clients || clients.length === 0) {
      // If we still can't find it, return a list of all clients so the user can see the exact name
      const { data: allClients } = await supabase.from('clientes').select('id, nombre');
      return NextResponse.json({ 
        success: false, 
        message: `No se encontro ninguna clinica con el texto: ${search}`,
        todas_las_clinicas: allClients
      });
    }

    const clienteId = clients[0].id;

    const { data: cases, error: errCases } = await supabase
      .from('casos_master')
      .select('id, codigo, saldo_pendiente')
      .eq('cliente_id', clienteId)
      .eq('depto_actual', 'Facturación')
      .order('fecha_entrega', { ascending: false })
      .limit(1);

    if (errCases || !cases || cases.length === 0) {
       const { data: anyCases } = await supabase
          .from('casos_master')
          .select('id, codigo, saldo_pendiente')
          .eq('cliente_id', clienteId)
          .order('id', { ascending: false })
          .limit(1);
          
       if (!anyCases || anyCases.length === 0) {
          return NextResponse.json({ success: false, message: `No se encontro ningun caso para la clinica ${clients[0].nombre}` });
       }
       
       const c = anyCases[0];
       await supabase.from('casos_master').update({ saldo_pendiente: -80, depto_actual: 'Facturación', estado_pago: 'Pagado' }).eq('id', c.id);
       return NextResponse.json({ success: true, message: `Saldo ajustado a -80 en caso histórico #${c.codigo} para ${clients[0].nombre}` });
    }

    const c = cases[0];
    await supabase.from('casos_master').update({ saldo_pendiente: -80, estado_pago: 'Pagado' }).eq('id', c.id);

    return NextResponse.json({ 
      success: true, 
      message: `Se aplicó el saldo a favor de -$80 al caso #${c.codigo} de ${clients[0].nombre}.` 
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
