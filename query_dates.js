const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('casos_master')
    .select('fecha_ingreso')
    .order('fecha_ingreso', { ascending: false })
    .limit(5);
  
  if (error) console.error(error);
  console.log("Recent dates:", data);
}
run();
