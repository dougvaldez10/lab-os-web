const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchPatient() {
  console.log("Searching for patient 'Maria Arce'...");
  
  // Search cases
  const { data: cases, error } = await supabase
    .from('casos_master')
    .select('id, codigo, paciente, doctor, depto_actual, estado, fecha_entrega, clientes(nombre)')
    .ilike('paciente', '%Maria%Arce%')
    .order('id', { ascending: false });

  if (error) {
    console.error("Error querying casos_master:", error);
    return;
  }

  if (cases && cases.length > 0) {
    console.log(`Found ${cases.length} case(s) for Maria Arce:`);
    console.table(cases.map(c => ({
      ID: c.id,
      Codigo: c.codigo,
      Paciente: c.paciente,
      Doctor: c.doctor,
      Clinica: c.clientes?.nombre || 'N/A',
      Depto: c.depto_actual,
      Estado: c.estado,
      Entrega: c.fecha_entrega
    })));
  } else {
    console.log("No cases found for Maria Arce.");
  }

  console.log("\nSearching for doctor 'Aylin Molina' to see recent cases...");
  
  // Search doctors
  const { data: docs } = await supabase
    .from('doctores')
    .select('*')
    .ilike('nombre', '%Aylin%');
    
  if (docs && docs.length > 0) {
    console.log("Found Doctor(s):", docs.map(d => d.nombre));
    
    // Find cases for this doctor
    const { data: docCases } = await supabase
      .from('casos_master')
      .select('id, codigo, paciente, doctor, depto_actual, estado, fecha_entrega')
      .ilike('doctor', `%Aylin%`)
      .order('id', { ascending: false })
      .limit(5);
      
    if (docCases && docCases.length > 0) {
      console.log(`\nRecent 5 cases for doctor Aylin:`);
      console.table(docCases.map(c => ({
        ID: c.id,
        Codigo: c.codigo,
        Paciente: c.paciente,
        Doctor: c.doctor,
        Depto: c.depto_actual,
        Estado: c.estado
      })));
    }
  } else {
    console.log("No doctors found matching 'Aylin'.");
  }
}

searchPatient();
