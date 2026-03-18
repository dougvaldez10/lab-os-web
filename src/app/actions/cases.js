"use server";

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Flujo lógico de departamentos
const workflow = [
  'Recepción', 
  'Yesos', 
  'Digital_Escaneo', // "Escaneo" en UI
  'Digital_Diseno',  // "Diseño" en UI
  'Digital_Fresado', // "Fresado" en UI
  'Ajuste', 
  'Terminado'
];

export async function updateCaseState(internalId, action, operatorName = null) {
  try {
    if (!internalId || !['START', 'PAUSE', 'COMPLETE'].includes(action)) {
      return { success: false, error: "Datos de acción inválidos." };
    }

    // Consulta el estado actual
    const { data: currentCase, error: fetchError } = await supabase
      .from('casos_master')
      .select('depto_actual')
      .eq('id', internalId)
      .single();
    
    if (fetchError || !currentCase) {
      console.error(fetchError);
      return { success: false, error: "Caso no encontrado." };
    }

    let updateData = {};

    if (action === 'START') {
        const utcIso = new Date().toISOString();
        updateData = { estado: 'En Proceso', operador_actual: operatorName, hora_inicio: utcIso };
    } else if (action === 'PAUSE') {
        updateData = { estado: 'En Pausa' };
    } else if (action === 'COMPLETE') {
        // Lógica de avanzar al siguiente departamento y ponerlo en Pendiente
        const currentIndex = workflow.indexOf(currentCase.depto_actual);
        const nextDept = currentIndex >= 0 && currentIndex < workflow.length - 1 
            ? workflow[currentIndex + 1] 
            : currentCase.depto_actual; // Si ya es Terminado, se queda ahí
        
        updateData = { depto_actual: nextDept, estado: 'Pendiente', operador_actual: null, hora_inicio: null };
    }

    const { error: updateError } = await supabase
      .from('casos_master')
      .update(updateData)
      .eq('id', internalId);

    if (updateError) {
      console.error(updateError);
      return { success: false, error: "No se pudo modificar el registro." };
    }

    revalidatePath('/');
    return { success: true };

  } catch (error) {
    console.error("Error al actualizar caso:", error);
    return { success: false, error: "Error interno al guardar." };
  }
}

