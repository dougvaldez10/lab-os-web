const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('casos_master').select('tipo').limit(100);
  const types = {};
  data.forEach(d => {
    types[d.tipo] = (types[d.tipo] || 0) + 1;
  });
  console.log(types);
}
run();
