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
  const { data, error } = await supabase
    .from('casos_master')
    .select('id, codigo, estado, fecha_entrega, depto_actual')
    .eq('depto_actual', 'Facturación')
    .neq('saldo_pendiente', 0);
  
  if (error) {
    console.error(error);
  } else {
    console.log("Cases in Facturación:", data.length);
    console.log(data.slice(0, 5));
  }
}
run();
