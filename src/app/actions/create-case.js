"use server";

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';

export async function createNewCase(formData) {
  try {
    const user = await getCurrentUser();
    
    // Obtener valores del form
    const form_doctor_id = formData.get('cliente_id'); // En realidad el UI envía el ID del Doctor aquí
    const paciente = formData.get('paciente');
    const codigo = formData.get('codigo');
    const color = formData.get('color');
    const doctor = formData.get('doctor');
    const tipo = formData.get('tipo'); // 'Análogo' o 'Digital'
    const fecha_entrega = formData.get('fecha_entrega');
    const hora_entrega = formData.get('hora_entrega');
    const comentarios = formData.get('comentarios');
    
    // Parseo de ítems del odontograma
    let items = [];
    try {
       items = JSON.parse(formData.get('items') || '[]');
    } catch(e) {}

    // Validaciones básicas
    if (!form_doctor_id || !paciente || !tipo || !codigo) {
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

    // Obtener nombre del doctor y ID de clínica real desde la tabla doctores usando el form_doctor_id
    let doctorNombre = doctor || '';
    let db_cliente_id = null;
    if (form_doctor_id) {
      const { data: docData } = await supabase
        .from('doctores')
        .select('trato, nombre, apellido, cliente_id')
        .eq('id', form_doctor_id)
        .single();
      if (docData) {
        doctorNombre = `${docData.trato || 'Dr.'} ${docData.nombre} ${docData.apellido || ''}`.trim();
        db_cliente_id = docData.cliente_id;
      }
    }

    const newCase = {
      codigo, 
      cliente_id: db_cliente_id, 
      paciente, 
      estado, 
      fecha_ingreso,
      fecha_entrega: fecha_entrega || null,
      hora_entrega: hora_entrega || null,
      color: color || '', 
      comentarios: comentarios || '',
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
      return { success: false, error: `Error DB: ${insertError.message || JSON.stringify(insertError)}` };
    }

    const masterId = insertedData.id;

    // Insertar ítems si existen
    if (items.length > 0) {
       // Obtener precios base de productos para asignar costos reales
       const { data: dbProductos } = await supabase.from('productos').select('nombre, precio');
       const priceMap = {};
       if (dbProductos) {
         dbProductos.forEach(p => {
           // Limpiar prefijo numérico "10001-Corona Zr" -> "Corona Zr"
           const cleanName = p.nombre.replace(/^\d+\-/, '').trim();
           priceMap[cleanName] = Number(p.precio) || 0;
         });
       }

       const detalles = items.map(item => {
          const matchedPrice = priceMap[item.producto] || 0;
          const numUnidades = item.unidades || 1;
          const subTotalCalculado = matchedPrice * numUnidades;

          return {
            caso_id: masterId,
            dientes: Array.isArray(item.dientes) ? item.dientes.join(',') : '',
            producto: item.producto,
            unidades: numUnidades,
            precio_unit: matchedPrice,
            subtotal: subTotalCalculado
          };
       });

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
