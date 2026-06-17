const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key] = value.join('=');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // try to fetch 1 row from recibos to see its keys
  const { data, error } = await supabase.from('recibos').select('*').limit(1);
  if (error) {
    console.error("Error fetching recibos:", error);
  } else {
    console.log("Recibos fields (from row if any):", data[0] ? Object.keys(data[0]) : "No rows");
    
    // insert with bad data to see constraint errors? No, we already did that and got FK constraint.
    // Let's fetch the first valid caso_id
    const cases = await supabase.from('casos_master').select('id').limit(1);
    if(cases.data && cases.data.length > 0) {
      const validId = cases.data[0].id;
      const payload = {
        caso_id: validId,
        subtotal: 100,
        descuento_tipo: '$',
        descuento_valor: 0,
        iva_aplicado: false,
        monto_iva: 0,
        total: 100
      };
      const res = await supabase.from('recibos').insert([payload]).select();
      if(res.error) {
         console.log("Error inserting with valid caso_id:", res.error);
      } else {
         console.log("Success inserting with valid caso_id:", res.data);
      }
    }
  }
}
run();
