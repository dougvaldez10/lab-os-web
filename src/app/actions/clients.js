"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://etnfvmpywgbeqvbyieze.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key"
);

export async function getClients() {
  try {
    // Obtenemos doctores con el join a su clínica correspondiente
    const { data: doctores, error } = await supabaseAdmin
      .from('doctores')
      .select('id, trato, nombre, apellido, cliente_id, clientes(nombre)')
      .order('nombre', { ascending: true });

    if (error) throw error;
    
    // Mapeamos para que la UI los reciba con los nombres correctos
    return doctores.map(doc => ({
      id: doc.id,
      cliente_id: doc.cliente_id,
      nombre_dentista: `${doc.trato || 'Dr.'} ${doc.nombre} ${doc.apellido || ''}`.trim(),
      nombre: doc.clientes?.nombre || 'Sin Clínica'
    })) || [];
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}
