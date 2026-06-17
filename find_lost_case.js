// No dotenv require
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findCase() {
  const { data, error } = await supabase
    .from('casos_master')
    .select('id, codigo, depto_actual, estado, paciente, doctor, clientes(nombre)')
    .eq('depto_actual', 'Empaquetado') // or another department that follows Facturacion
    .limit(10);
    
  console.log("Cases out of Facturacion recently:", data);
  
  const { data: clients } = await supabase.from('clientes').select('id, nombre').ilike('nombre', '%zenzao%');
  console.log("Clients matching zenzao:", clients);

  if (clients && clients.length > 0) {
    const { data: cases } = await supabase.from('casos_master').select('*').in('cliente_id', clients.map(c => c.id)).order('id', { ascending: false }).limit(5);
    console.log("Cases for Zenzao:", cases.map(c => ({ id: c.id, depto: c.depto_actual, estado: c.estado, paciente: c.paciente })));
    
    // Auto restore if we find one in 'Entregado' or 'Empaquetado'
    const toRestore = cases.find(c => c.depto_actual !== 'Facturación');
    if (toRestore) {
      await supabase.from('casos_master').update({ depto_actual: 'Facturación', estado: 'Pendiente' }).eq('id', toRestore.id);
      console.log("Restored case ID to Facturación:", toRestore.id);
    }
  }
}
findCase();
