"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Cliente Admin — usa la service role key para bypassear RLS de forma segura.
// "use server" garantiza que este cÃƒÂ³digo NUNCA llega al navegador.
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Obtener el usuario actual desde la cookie de sesiÃƒÂ³n
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function getCurrentUserFromCookie() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('lab_os_user')?.value;
    if (!username) return null;

    const admin = getAdminClient();
    const { data: user } = await admin
      .from('usuarios')
      .select('id, username, rol')
      .eq('username', username)
      .single();
    return user || null;
  } catch {
    return null;
  }
}


export async function createNewCase(formData) {
  try {
    const supabase = getAdminClient();
    const user = await getCurrentUserFromCookie();

    // Obtener valores del form
    const form_doctor_id = formData.get('cliente_id'); // UI envÃƒÂ­a el ID del Doctor aquÃƒÂ­
    const paciente       = formData.get('paciente');
    const codigo         = formData.get('codigo');
    const color          = formData.get('color');
    const doctor         = formData.get('doctor');
    const tipo           = formData.get('tipo'); // 'AnÃƒ¡logo' o 'Digital'
    const fecha_entrega  = formData.get('fecha_entrega');
    const hora_entrega   = formData.get('hora_entrega');
    const comentarios    = formData.get('comentarios');

    // Parseo de ÃƒÂ­tems del odontograma
    let items = [];
    try {
      items = JSON.parse(formData.get('items') || '[]');
    } catch (e) {}

    // Validaciones bÃƒ¡sicas
    if (!form_doctor_id || !paciente || !tipo || !codigo) {
      return { success: false, error: "Faltan campos (Cliente, Paciente, Tipo, No. Orden)." };
    }

    // Auto-enrutamiento inicial
    let depto_actual = 'Recepción';
    if (tipo === 'Análogo') {
      depto_actual = 'Yesos';
    } else if (tipo === 'Digital') {
      depto_actual = 'Digital_Diseno';
    }

    const estado     = 'Pendiente';
    const usuario_id = user ? user.id : null;

    const fecha_ingreso = new Date().toISOString().split('T')[0];

    // Obtener nombre del doctor y ID de clÃƒÂ­nica desde la tabla doctores
    let doctorNombre  = doctor || '';
    let db_cliente_id = null;
    if (form_doctor_id) {
      const { data: docData } = await supabase
        .from('doctores')
        .select('trato, nombre, apellido, cliente_id')
        .eq('id', form_doctor_id)
        .single();
      if (docData) {
        doctorNombre  = `${docData.trato || 'Dr.'} ${docData.nombre} ${docData.apellido || ''}`.trim();
        db_cliente_id = docData.cliente_id;
      }
    }

    const newCase = {
      codigo,
      cliente_id:    db_cliente_id,
      paciente,
      estado,
      fecha_ingreso,
      fecha_entrega: fecha_entrega || null,
      hora_entrega:  hora_entrega  || null,
      color:         color         || '',
      comentarios:   comentarios   || '',
      doctor:        doctorNombre,
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

    // Ã¢â€â‚¬Ã¢â€â‚¬ EVENTO LLEGADA: registrar en historico al crear caso Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // Usamos el admin client para bypasear RLS (fire-and-forget, no bloquea)
    Promise.resolve().then(async () => {
      try {
        const adminSb = getAdminClient();
        await adminSb.from('casos_tiempos_historicos').insert({
          id_caso: masterId,
          departamento: depto_actual,
          hora_llegada: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[HISTORICO] Error registrando llegada en create-case:', e.message);
      }
    });

    // Insertar ÃƒÂ­tems si existen
    if (items.length > 0) {
      // Precios base desde productos
      const { data: dbProductos } = await supabase.from('productos').select('nombre, precio');
      const priceMap = {};
      if (dbProductos) {
        dbProductos.forEach(p => {
          const cleanName = p.nombre.replace(/^\d+\-/, '').trim();
          priceMap[cleanName.toLowerCase()] = Number(p.precio) || 0;
          priceMap[p.nombre.toLowerCase()]  = Number(p.precio) || 0;
        });
      }

      let grandTotal = 0;

      const detalles = items.map(item => {
        const baseProduct       = item.producto.split(' - ')[0].trim().toLowerCase();
        const fullProduct       = item.producto.toLowerCase();
        const matchedPrice      = priceMap[baseProduct] || priceMap[fullProduct] || 0;
        const numUnidades       = item.unidades || 1;
        const subTotalCalculado = matchedPrice * numUnidades;
        
        grandTotal += subTotalCalculado;

        return {
          caso_id:    masterId,
          dientes:    Array.isArray(item.dientes) ? item.dientes.join(',') : '',
          producto:   item.producto,
          unidades:   numUnidades,
          precio_unit: matchedPrice,
          subtotal:   subTotalCalculado
        };
      });

      const { error: errorDetalles } = await supabase.from('casos_detalle').insert(detalles);
      if (errorDetalles) {
        console.error("Supabase insert error (detalles):", errorDetalles);
        // No bloquear: el master ya quedÃƒÂ³ guardado
      } else {
        // Actualizar el master con el total y saldo
        await supabase.from('casos_master').update({
          total_caso: grandTotal,
          saldo_pendiente: grandTotal
        }).eq('id', masterId);
      }
    }

    revalidatePath('/');

    return {
      success: true,
      insertedId:    insertedData.id,
      deptoAsignado: depto_actual
    };

  } catch (error) {
    console.error("Error creando caso:", error);
    return { success: false, error: "Error de servidor al guardar en BD." };
  }
}
