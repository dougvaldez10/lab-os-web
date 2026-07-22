"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createCalendarEvent } from '@/lib/googleCalendar';

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
    const form_doctor_id = formData.get('cliente_id'); // UI envía el ID del Doctor aquí
    const paciente       = formData.get('paciente');
    let codigo           = formData.get('codigo')?.trim();
    const color          = formData.get('color');
    const doctor         = formData.get('doctor');
    const tipo           = formData.get('tipo'); // 'Análogo' o 'Digital'
    const fecha_entrega  = formData.get('fecha_entrega');
    const hora_entrega   = formData.get('hora_entrega');
    const comentarios    = formData.get('comentarios');

    // Parseo de ítems del odontograma
    let items = [];
    try {
      items = JSON.parse(formData.get('items') || '[]');
    } catch (e) {}

    // Validaciones básicas
    if (!form_doctor_id || !paciente || !tipo) {
      return { success: false, error: "Faltan campos obligatorios (Cliente, Paciente, Tipo)." };
    }

    // Auto-generación de folio si viene vacío
    if (!codigo) {
      const { data: existingCodes, error: codesErr } = await supabase
        .from('casos_master')
        .select('codigo');

      let nextNum = 1;
      if (!codesErr && existingCodes && existingCodes.length > 0) {
        const usedInts = new Set();
        existingCodes.forEach(c => {
          const val = parseInt(c.codigo, 10);
          if (!isNaN(val) && val > 0) {
            usedInts.add(val);
          }
        });
        while (usedInts.has(nextNum)) {
          nextNum++;
        }
      }
      codigo = String(nextNum);
    }

    // Auto-enrutamiento inicial o override
    let depto_actual = formData.get('depto_actual');
    let estado = 'Pendiente';
    if (depto_actual === 'Facturación') {
      estado = 'Finalizado';
    } else if (!depto_actual) {
      depto_actual = 'Recepción';
      if (tipo === 'Análogo') {
        depto_actual = 'Yesos';
      } else if (tipo === 'Digital') {
        depto_actual = 'Digital_Diseno';
      }
    }

    const usuario_id = user ? user.id : null;

    const fecha_ingreso = new Date().toISOString().split('T')[0];

    // Obtener nombre del doctor y ID de clínica desde la tabla intermedia doctor_clinica
    let doctorNombre  = doctor || '';
    let db_cliente_id = null;
    if (form_doctor_id) {
      const { data: linkData } = await supabase
        .from('doctor_clinica')
        .select('cliente_id, doctores(trato, nombre, apellido)')
        .eq('id', form_doctor_id)
        .single();
      if (linkData) {
        const doc = linkData.doctores;
        doctorNombre  = `${doc?.trato || 'Dr.'} ${doc?.nombre || ''} ${doc?.apellido || ''}`.replace(/\s+/g, ' ').trim();
        db_cliente_id = linkData.cliente_id;
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

    // Crear evento en Google Calendar si tiene fecha de entrega
    let googleEventId = null;
    if (newCase.fecha_entrega) {
      try {
        const eventDetails = items.map(item => ({
          producto: item.producto,
          unidades: item.unidades || 1
        }));
        googleEventId = await createCalendarEvent({
          ...newCase,
          id: masterId
        }, eventDetails);
      } catch (calErr) {
        console.error("[Google Calendar] Error en createNewCase calendar sync:", calErr);
      }
    }

    // Insertar ítems si existen
    if (items.length > 0) {
      // Precios base desde productos
      const { data: dbProductos } = await supabase.from('productos').select('nombre, precio');

      function normalizeProdName(str) {
        if (!str) return '';
        return str
          .toLowerCase()
          .replace(/^\d+[-_]/, '')
          .replace(/\bzirconia\b/g, 'zr')
          .replace(/\bdisilicato\b/g, 'li2si2o5')
          .replace(/\bemax\b/g, 'li2si2o5')
          .replace(/[^a-z0-9]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function findPrice(inputName) {
        if (!inputName || !dbProductos || dbProductos.length === 0) return 0;
        const cleanInput = normalizeProdName(inputName.split(' - ')[0]);
        for (const p of dbProductos) {
          const raw = p.nombre.toLowerCase();
          const display = p.nombre.replace(/^\d+-/, '').trim().toLowerCase();
          if (raw === inputName.toLowerCase() || display === inputName.toLowerCase()) {
            return Number(p.precio) || 0;
          }
        }
        for (const p of dbProductos) {
          if (normalizeProdName(p.nombre) === cleanInput) {
            return Number(p.precio) || 0;
          }
        }
        const inputTokens = cleanInput.split(' ').filter(Boolean);
        let bestMatch = null, bestScore = 0;
        for (const p of dbProductos) {
          const norm = normalizeProdName(p.nombre);
          const prodTokens = norm.split(' ').filter(Boolean);
          let score = 0;
          inputTokens.forEach(t => {
            if (prodTokens.includes(t)) score += 2;
            else if (norm.includes(t)) score += 1;
          });
          if (score > bestScore) {
            bestScore = score;
            bestMatch = p;
          }
        }
        if (bestMatch && bestScore >= 2) return Number(bestMatch.precio) || 0;
        return 0;
      }

      let grandTotal = 0;

      const detalles = items.map(item => {
        const matchedPrice      = findPrice(item.producto);
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
        // No bloquear: el master ya quedó guardado
      } else {
        // Actualizar el master con el total, saldo y google_event_id
        const updatePayload = {
          total_caso: grandTotal,
          saldo_pendiente: grandTotal
        };
        if (googleEventId) {
          updatePayload.google_event_id = googleEventId;
        }
        await supabase.from('casos_master').update(updatePayload).eq('id', masterId);
      }
    } else if (googleEventId) {
      // Si no hay detalles pero sí se creó el evento, guardamos el id en casos_master
      await supabase.from('casos_master').update({
        google_event_id: googleEventId
      }).eq('id', masterId);
    }

    revalidatePath('/');

    return {
      success: true,
      insertedId:    insertedData.id,
      deptoAsignado: depto_actual,
      codigo
    };

  } catch (error) {
    console.error("Error creando caso:", error);
    return { success: false, error: "Error de servidor al guardar en BD." };
  }
}
