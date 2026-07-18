import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
      .from('casos_master')
      .select('id, codigo, paciente, doctor, depto_actual, total_caso, clientes(nombre), casos_detalle(unidades, producto, material)')
      .neq('depto_actual', 'Facturación')
      .neq('estado', 'Cancelado')
      .order('fecha_entrega', { ascending: true })
      .limit(2);
      
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Success:", data);
  }
}
test();
