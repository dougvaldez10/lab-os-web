"use server";

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Flujo lógico de departamentos ahora dictado por objeto
const FLUJO_DIGITAL = {
    "Recepción": "Digital_Diseno",
    "Digital_Diseno": "Digital_Fresado",
    "Digital_Fresado": "Sinterizado",
    "Sinterizado": "Ajuste",
    "Ajuste": "Terminado",
    "Terminado": "Inspección",
    "Inspección": "Recibo/Factura",
    "Recibo/Factura": "Empaquetado",
    "Empaquetado": "Envío",
    "Envío": "Terminado",
    "Yesos": "Digital_Escaneo",
    "Digital_Escaneo": "Digital_Diseno"
};

const FLUJO_ANALOGO = {
    "Recepción": "Yesos",
    "Yesos": "Digital_Escaneo",
    "Digital_Escaneo": "Digital_Diseno",
    "Digital_Diseno": "Digital_Fresado",
    "Digital_Fresado": "Sinterizado",
    "Sinterizado": "Ajuste",
    "Ajuste": "Terminado",
    "Terminado": "Inspección",
    "Inspección": "Recibo/Factura",
    "Recibo/Factura": "Empaquetado",
    "Empaquetado": "Envío",
    "Envío": "Terminado"
};

export async function updateCaseState(internalId, action, operatorName = null) {
  try {
    if (!internalId || !['START', 'PAUSE', 'COMPLETE'].includes(action)) {
      return { success: false, error: "Datos de acción inválidos." };
    }

    // Consulta el estado actual y el tipo
    const { data: currentCase, error: fetchError } = await supabase
      .from('casos_master')
      .select('depto_actual, tipo')
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
        const deptoLimpio = currentCase.depto_actual ? currentCase.depto_actual.trim() : "";
        const tipoLimpio = currentCase.tipo ? currentCase.tipo.trim().toLowerCase() : "análogo";
        
        let nextDept = "Terminado";
        if (tipoLimpio === "digital") {
            nextDept = FLUJO_DIGITAL[deptoLimpio] || "Terminado";
        } else {
            nextDept = FLUJO_ANALOGO[deptoLimpio] || "Terminado";
        }
        
        // --- REGLA DE ENRUTAMIENTO DINAMICO POR MATERIAL ---
        // Si sale de Fresado Digital, evaluar si de verdad requiere Sinterizado
        if (deptoLimpio === "digital_fresado" || deptoLimpio === "digital_fresado " || depto_actual === 'Digital_Fresado' || currentCase.depto_actual === 'Digital_Fresado') {
            const { data: detalles } = await supabase
                .from('casos_detalle')
                .select('producto')
                .eq('caso_id', internalId);
                
            let requiereSinterizado = false;
            
            if (detalles && detalles.length > 0) {
               // Pre-cargar todos los productos una vez (está cacheado en bd usualmente)
               const { data: catData } = await supabase.from('productos').select('nombre, categoria');
               const catMap = {};
               if (catData) {
                   catData.forEach(p => {
                       const cleanName = p.nombre.replace(/^\d+\-/, '').trim();
                       catMap[cleanName.toLowerCase()] = (p.categoria || "").toLowerCase();
                       catMap[p.nombre.toLowerCase()] = (p.categoria || "").toLowerCase();
                   });
               }

               for (const d of detalles) {
                   const prod = d.producto ? d.producto.toLowerCase() : "";
                   const cat = catMap[prod] || "";
                   
                   // Validar la categoría o el nombre del producto
                   if (cat.includes("zr") || cat.includes("zirconia") || prod.includes("zr") || prod.includes("zirconia")) {
                       requiereSinterizado = true;
                       break;
                   }
               }
            }
            
            if (!requiereSinterizado) {
                // Si es puro PMMA, Emax, Metal, etc., salta Sinterizado -> Ajuste
                nextDept = "Ajuste";
            }
        }
        
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

