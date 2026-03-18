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
    const edad = formData.get('edad');
    const color = formData.get('color');
    const doctor = formData.get('doctor');
    const tipo = formData.get('tipo'); // 'Análogo' o 'Digital'

    // Validaciones básicas
    if (!cliente_id || !paciente || !tipo) {
      return { success: false, error: "Cliente, paciente y tipo son requeridos." };
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
    
    // Generar un código visual de caso (ej., C-XXXX)
    const fecha = new Date();
    const codigo = `C-${fecha.getFullYear().toString().slice(-2)}${(fecha.getMonth()+1).toString().padStart(2, '0')}${Math.floor(Math.random()*1000).toString().padStart(3, '0')}`;
    const fecha_ingreso = fecha.toISOString().split('T')[0];

    const newCase = {
      codigo, 
      cliente_id, 
      paciente, 
      estado, 
      fecha_ingreso, 
      edad: edad || '', 
      color: color || '', 
      doctor: doctor || '', 
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
      console.error("Supabase insert error:", insertError);
      return { success: false, error: "Error interno al guardar en BD." };
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
