"use server";

import { supabase } from '@/lib/supabase';

export async function getClients() {
  try {
    // Obtenemos doctores con el join a su clínica correspondiente
    const { data: doctores, error } = await supabase
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
