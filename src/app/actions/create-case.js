"use server";

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';

export async function createNewCase(formData) {
  try {
    const user = await getCurrentUser();
    
    // Obtener valores del form
    const cliente_id = formData.get('cliente_id');
    const paciente = formData.get('paciente');
    const codigo = formData.get('codigo');
    const color = formData.get('color');
    const doctor = formData.get('doctor');
    const tipo = formData.get('tipo'); // 'Análogo' o 'Digital'
    const fecha_entrega = formData.get('fecha_entrega');
    const hora_entrega = formData.get('hora_entrega');
    
    // Parseo de ítems del odontograma
    let items = [];
    try {
       items = JSON.parse(formData.get('items') || '[]');
    } catch(e) {}

    // Validaciones básicas
    if (!cliente_id || !paciente || !tipo || !codigo) {
      return { success: false, error: "Faltan campos (Cliente, Paciente, Tipo, No. Orden)." };
    }

    // Auto-Enrutamiento Inicial
    let depto_actual = 'Recepción';
    if (tipo === 'Análogo') {
      depto_actual = 'Yesos';
    } else if (tipo === 'Digital') {
      depto_actual = 'Digital_Diseno'; // "Diseño" en UI
    }

    const estado = 'Pendiente';
    const usuario_id = user ? user.id : null;
    
    // Obtener la fecha para ingreso
    const fecha = new Date();
    const fecha_ingreso = fecha.toISOString().split('T')[0];

    // Obtener nombre del doctor desde la tabla doctores usando el ID
    let doctorNombre = doctor || '';
    if (cliente_id) {
      const { data: docData } = await supabase
        .from('doctores')
        .select('trato, nombre, apellido')
        .eq('id', cliente_id)
        .single();
      if (docData) {
        doctorNombre = `${docData.trato || 'Dr.'} ${docData.nombre} ${docData.apellido || ''}`.trim();
      }
    }

    const newCase = {
      codigo, 
      cliente_id, 
      paciente, 
      estado, 
      fecha_ingreso,
      fecha_entrega: fecha_entrega || null,
      hora_entrega: hora_entrega || null,
      color: color || '', 
      doctor: doctorNombre,
      tipo, 
      depto_actual, 
      usuario_id
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('casos_master')
      .insert([newCase])
      .select('id')
      .single();

    if (insertError) {
      console.error("Supabase insert error (master):", insertError);
      return { success: false, error: "Error interno al guardar Caso Maestro en BD." };
    }

    const masterId = insertedData.id;

    // Insertar ítems si existen
    if (items.length > 0) {
       const detalles = items.map(item => ({
          caso_id: masterId,
          dientes: Array.isArray(item.dientes) ? item.dientes.join(',') : '',
          material: item.material,
          producto: item.producto,
          precio_unidad: 0,
          unidades: item.unidades || 1,
          total: 0
       }));

       const { error: errorDetalles } = await supabase.from('casos_detalle').insert(detalles);
       if (errorDetalles) {
          console.error("Supabase insert error (detalles):", errorDetalles);
          // Opcional: Podríamos hacer rollback del master aquí o considerar soft failure.
       }
    }

    // Revalidar para que el Dashboard actualice
    revalidatePath('/');

    return { 
      success: true, 
      insertedId: insertedData.id, 
      deptoAsignado: depto_actual 
    };

  } catch (error) {
    console.error("Error creando caso:", error);
    return { success: false, error: "Error de servidor al guardar en BD." };
  }
}
