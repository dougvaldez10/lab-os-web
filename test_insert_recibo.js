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
  const payload = {
    caso_id: 1, // hope 1 exists
    subtotal: 100,
    descuento_tipo: '$',
    descuento_valor: 0,
    iva_aplicado: false,
    monto_iva: 0,
    total: 100
  };
  const { data, error } = await supabase.from('recibos').insert([payload]);
  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success:", data);
  }
}
run();
