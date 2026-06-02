require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testDelete() {
  const { data: cases } = await supabase.from('casos_master').select('id').limit(1);
  if (cases && cases.length > 0) {
    const id = cases[0].id;
    console.log("Trying to delete case", id);
    const { error } = await supabase.from('casos_master').delete().eq('id', id);
    if (error) {
       console.log("Error details:", JSON.stringify(error, null, 2));
    } else {
       console.log("Delete successful!");
    }
  } else {
    console.log("No cases found");
  }
}

testDelete();
