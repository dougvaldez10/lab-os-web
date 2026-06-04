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

    // Find the client Super Dental
    const { data: clients, error: errClient } = await supabase
      .from('clientes')
      .select('id, nombre')
      .ilike('nombre', '%super dental%');

    if (errClient || !clients || clients.length === 0) {
      return NextResponse.json({ success: false, message: "No se encontro la clinica Super Dental" });
    }

    const clienteId = clients[0].id;

    // We want to find cases for Super Dental that are recently paid to set their balance to -80
    // Actually, maybe we can just create a dummy "pago global" logic or just find ANY case for them
    // Let's just find the most recent case for Super Dental in "Facturación"
    const { data: cases, error: errCases } = await supabase
      .from('casos_master')
      .select('id, codigo, saldo_pendiente')
      .eq('cliente_id', clienteId)
      .eq('depto_actual', 'Facturación')
      .order('fecha_entrega', { ascending: false })
      .limit(1);

    if (errCases || !cases || cases.length === 0) {
       // If no case in Facturacion, just get the most recent case overall
       const { data: anyCases } = await supabase
          .from('casos_master')
          .select('id, codigo, saldo_pendiente')
          .eq('cliente_id', clienteId)
          .order('id', { ascending: false })
          .limit(1);
          
       if (!anyCases || anyCases.length === 0) {
          return NextResponse.json({ success: false, message: "No se encontro ningun caso para Super Dental" });
       }
       
       const c = anyCases[0];
       await supabase.from('casos_master').update({ saldo_pendiente: -80, depto_actual: 'Facturación', estado_pago: 'Pagado' }).eq('id', c.id);
       return NextResponse.json({ success: true, message: `Saldo ajustado a -80 en caso histórico #${c.codigo}` });
    }

    const c = cases[0];
    await supabase.from('casos_master').update({ saldo_pendiente: -80, estado_pago: 'Pagado' }).eq('id', c.id);

    return NextResponse.json({ 
      success: true, 
      message: `Se aplicó el saldo a favor de -$80 al caso #${c.codigo} de Super Dental.` 
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
