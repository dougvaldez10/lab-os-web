const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
async function run() {
  const { data, error } = await supabase
    .from('casos_master')
    .select('id, fecha_ingreso')
    .gte('fecha_ingreso', '2023-01-01')
    .limit(5);
  console.log("With YYYY-MM-DD:", data?.length);

  const { data: d2 } = await supabase
    .from('casos_master')
    .select('id, fecha_ingreso')
    .gte('fecha_ingreso', new Date('2023-01-01').toISOString())
    .limit(5);
  console.log("With ISOString:", d2?.length);
}
run();
