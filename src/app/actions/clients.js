"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key"
);

export async function getClients() {
  try {
    // Obtenemos las asociaciones de doctor y clínica desde la tabla intermedia
    const { data: links, error } = await supabaseAdmin
      .from('doctor_clinica')
      .select('id, doctor_id, cliente_id, doctores(trato, nombre, apellido), clientes(nombre)');

    if (error) throw error;
    
    // Mapeamos para que la UI los reciba con la estructura esperada
    const mapped = (links || []).map(link => {
      const doc = link.doctores;
      const cli = link.clientes;
      return {
        id: link.id, // Usamos el ID de la tabla intermedia
        doctor_id: link.doctor_id,
        cliente_id: link.cliente_id,
        nombre_dentista: `${doc?.trato || 'Dr.'} ${doc?.nombre || ''} ${doc?.apellido || ''}`.replace(/\s+/g, ' ').trim(),
        nombre: cli?.nombre || 'Sin Clínica'
      };
    });

    // Ordenar alfabéticamente por el nombre del doctor
    mapped.sort((a, b) => a.nombre_dentista.localeCompare(b.nombre_dentista));
    
    return mapped;
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

export async function getAllClinics() {
  try {
    const { data: clientes, error } = await supabaseAdmin
      .from('clientes')
      .select('id, nombre, saldo_favor')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return clientes || [];
  } catch (err) {
    console.error("Error fetching all clinics:", err);
    return [];
  }
}
