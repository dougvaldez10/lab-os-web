const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { count, error } = await supabase
    .from('casos_master')
    .select('*', { count: 'exact', head: true });
  
  if (error) console.error(error);
  console.log("Total rows in casos_master:", count);
  
  const { data } = await supabase.from('casos_master').select('fecha_ingreso').limit(1);
  console.log("Sample fecha_ingreso:", data);
}
run();
