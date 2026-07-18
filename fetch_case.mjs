import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/casos_master?paciente=ilike.*Esmeralda Morales*&select=*';
  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY
  };

  const res = await fetch(url, { headers });
  const cases = await res.json();
  console.log("Cases:", JSON.stringify(cases, null, 2));
}

run();
