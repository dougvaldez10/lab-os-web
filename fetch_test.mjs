import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/casos_master?select=id,casos_detalle(unidades,producto,material)&limit=1';
  const headers = {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
  const res = await fetch(url, { headers });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
