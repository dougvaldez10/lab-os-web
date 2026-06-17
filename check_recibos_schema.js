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
  const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'recibos' });
  if (error) {
    // try direct query to information_schema if rpc fails
    const res = await supabase.from('recibos').select('*').limit(1);
    console.log(res);
  } else {
    console.log(data);
  }
}
run();
