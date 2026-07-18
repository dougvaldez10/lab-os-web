"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/googleCalendar';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Verifica si el usuario actual es admin
async function checkAdminAccess() {
  const user = await getCurrentUser();
  const isSuperAdmin = user?.is_superadmin || user?.rol === 'lab_owner';
  const isAdminRole = user?.rol?.toLowerCase().includes('admin') || user?.rol?.toLowerCase().includes('administrativo');
  const isExplicitAdmin = user?.username?.toLowerCase() === 'admin' || user?.username?.toLowerCase() === 'coloraturacorp' || user?.username?.toLowerCase() === 'legion';
  
  if (!user || (!isSuperAdmin && !isAdminRole && !isExplicitAdmin)) {
    throw new Error('No autorizado');
  }
  return user;
}

export async function updateAdminCase(internalId, payload) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('casos_master')
      .update(payload)
      .eq('id', internalId);

    if (error) {
      console.error(error);
      return { success: false, error: "Error al actualizar el caso." };
    }

    // Sincronizar con Google Calendar
    try {
      const { data: updatedCase } = await supabase
        .from('casos_master')
        .select('*')
        .eq('id', internalId)
        .single();

      if (updatedCase) {
        const { data: detalles } = await supabase
          .from('casos_detalle')
          .select('producto, unidades')
          .eq('caso_id', internalId);

        const eventDetails = detalles ? detalles.map(d => ({
          producto: d.producto,
          unidades: d.unidades || 1
        })) : [];

        if (updatedCase.google_event_id) {
          const newEventId = await updateCalendarEvent(updatedCase.google_event_id, updatedCase, eventDetails);
          if (newEventId !== updatedCase.google_event_id) {
            await supabase
              .from('casos_master')
              .update({ google_event_id: newEventId })
              .eq('id', internalId);
          }
        } else if (updatedCase.fecha_entrega) {
          const newEventId = await createCalendarEvent(updatedCase, eventDetails);
          if (newEventId) {
            await supabase
              .from('casos_master')
              .update({ google_event_id: newEventId })
              .eq('id', internalId);
          }
        }
      }
    } catch (calErr) {
      console.error("[Google Calendar] Error al sincronizar en updateAdminCase:", calErr);
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error("updateAdminCase error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteAdminCase(internalId) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    // Primero obtener el caso para tener todos sus posibles identificadores
    const { data: casoMaster } = await supabase.from('casos_master').select('*').eq('id', internalId).single();
    
    // Eliminar evento de Google Calendar si existe
    if (casoMaster && casoMaster.google_event_id) {
      try {
        await deleteCalendarEvent(casoMaster.google_event_id);
      } catch (calErr) {
        console.error("[Google Calendar] Error al eliminar evento por eliminación de caso:", calErr);
      }
    }
    
    // Limpieza agresiva de tablas relacionadas
    await supabase.from('casos_detalle').delete().eq('caso_id', internalId);
    if (casoMaster && casoMaster.codigo) {
      await supabase.from('casos_detalle').delete().eq('caso_id', casoMaster.codigo);
    }

    await supabase.from('casos_tiempos_historicos').delete().eq('caso_id', internalId);
    await supabase.from('casos_tiempos_historicos').delete().eq('id_caso', internalId);
    if (casoMaster && casoMaster.codigo) {
      await supabase.from('casos_tiempos_historicos').delete().eq('caso_id', casoMaster.codigo);
      await supabase.from('casos_tiempos_historicos').delete().eq('id_caso', casoMaster.codigo);
    }

    await supabase.from('cuenta_corriente_clinica').delete().eq('caso_id', internalId);
    if (casoMaster && casoMaster.codigo) {
      await supabase.from('cuenta_corriente_clinica').delete().eq('caso_id', casoMaster.codigo);
    }

    // Eliminar el caso maestro
    const { error } = await supabase
      .from('casos_master')
      .delete()
      .eq('id', internalId);

    if (error) {
      console.error(error);
      return { success: false, error: `Error DB: ${error.message || JSON.stringify(error)}` };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error("deleteAdminCase error:", err);
    return { success: false, error: err.message };
  }
}

export async function cancelarCaso({ caso_id, motivo }) {
  try {
    const user = await checkAdminAccess();
    
    if (!motivo || motivo.trim().length < 5) {
      return { success: false, error: 'El motivo es obligatorio (mínimo 5 caracteres).' };
    }

    const supabase = getAdminClient();

    // 1. Obtener información actual del caso
    const { data: caso, error: errCaso } = await supabase
      .from('casos_master')
      .select('id, codigo, cliente_id, total_caso, saldo_pendiente, estado, google_event_id')
      .eq('id', caso_id)
      .single();

    if (errCaso || !caso) {
      return { success: false, error: 'Caso no encontrado.' };
    }

    if (caso.estado === 'Cancelado') {
      return { success: false, error: 'El caso ya se encuentra cancelado.' };
    }

    // 2. Calcular lo pagado
    const totalCaso = Number(caso.total_caso) || 0;
    const saldoPendiente = Number(caso.saldo_pendiente) || 0;
    const montoPagado = totalCaso - saldoPendiente;

    // 3. Si hay saldo pagado, lo sumamos al saldo a favor de la clínica
    if (montoPagado > 0) {
      const { data: cliente, error: getCliErr } = await supabase
        .from('clientes')
        .select('saldo_favor')
        .eq('id', caso.cliente_id)
        .single();

      if (!getCliErr && cliente) {
        const nuevoSaldoFavor = (Number(cliente.saldo_favor) || 0) + montoPagado;
        
        await supabase
          .from('clientes')
          .update({ saldo_favor: nuevoSaldoFavor })
          .eq('id', caso.cliente_id);
          
        // Registrar el abono al saldo a favor por cancelación en pagos_historico
        await supabase
          .from('pagos_historico')
          .insert({
            cliente_id: caso.cliente_id,
            id_caso: caso_id,
            monto_abono: montoPagado,
            metodo_pago: 'Saldo a Favor',
            creado_por: user.username || 'Sistema',
            notas: `Monto transferido a saldo a favor por cancelación del caso. Motivo: ${motivo.trim()}`,
            motivo: motivo.trim()
          });
      }
    }

    // 4. Actualizar casos_master a Cancelado, limpiar deuda y google_event_id
    // Usamos estado_pago = 'Pendiente' debido al CHECK constraint en la base de datos
    const { error: errUpdate } = await supabase
      .from('casos_master')
      .update({
        estado: 'Cancelado',
        saldo_pendiente: 0,
        estado_pago: 'Pendiente',
        google_event_id: null
      })
      .eq('id', caso_id);

    if (errUpdate) throw errUpdate;

    // Eliminar el evento en Google Calendar si existe
    if (caso && caso.google_event_id) {
      try {
        await deleteCalendarEvent(caso.google_event_id);
      } catch (calErr) {
        console.error("[Google Calendar] Error al eliminar evento por cancelación de caso:", calErr);
      }
    }

    // 5. Registrar auditoría general
    await supabase
      .from('pagos_historico')
      .insert({
        cliente_id: caso.cliente_id,
        id_caso: caso_id,
        monto_abono: 0,
        tipo_movimiento: 'auditoria',
        metodo_pago: 'Cancelación',
        creado_por: user.username || 'Sistema',
        notas: `Caso cancelado. Motivo: ${motivo.trim()}`,
        motivo: motivo.trim()
      });

    revalidatePath('/');
    revalidatePath('/admin/facturacion');
    
    return { success: true };

  } catch (err) {
    console.error('cancelarCaso error:', err);
    return { success: false, error: err.message };
  }
}

export async function getMetricsData(timeFilter, customStart, customEnd, searchQuery) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const now = new Date();
    let isoActualStart, isoActualEnd, isoPrevStart, isoPrevEnd;

    if (timeFilter === "custom" && customStart && customEnd) {
      isoActualStart = customStart;
      isoActualEnd = customEnd;
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      const diffTime = Math.abs(endDate - startDate);
      const prevStartDate = new Date(startDate.getTime() - diffTime - (24 * 60 * 60 * 1000));
      const prevEndDate = new Date(endDate.getTime() - diffTime - (24 * 60 * 60 * 1000));
      isoPrevStart = prevStartDate.toISOString().split('T')[0];
      isoPrevEnd = prevEndDate.toISOString().split('T')[0];
    } else {
      let fechaInicioActual = new Date();
      let fechaInicioAnterior = new Date();
      let fechaFinAnterior = new Date();

      if (timeFilter === "30d") {
        fechaInicioActual.setDate(now.getDate() - 30);
        fechaInicioAnterior.setDate(now.getDate() - 60);
        fechaFinAnterior.setDate(now.getDate() - 30);
      } else if (timeFilter === "3m") {
        fechaInicioActual.setMonth(now.getMonth() - 3);
        fechaInicioAnterior.setMonth(now.getMonth() - 6);
        fechaFinAnterior.setMonth(now.getMonth() - 3);
      } else if (timeFilter === "year") {
        fechaInicioActual = new Date(now.getFullYear(), 0, 1);
        fechaInicioAnterior = new Date(now.getFullYear() - 1, 0, 1);
        fechaFinAnterior = new Date(now.getFullYear() - 1, 11, 31);
      }

      isoActualStart = fechaInicioActual.toISOString().split('T')[0];
      isoActualEnd = now.toISOString().split('T')[0];
      isoPrevStart = fechaInicioAnterior.toISOString().split('T')[0];
      isoPrevEnd = fechaFinAnterior.toISOString().split('T')[0];
    }

    let queryActual = supabase
      .from('casos_master')
      .select('cliente_id, total_caso, saldo_pendiente, tipo, doctor, estado, estado_pago, clientes(nombre), casos_detalle(unidades)')
      .gte('fecha_ingreso', isoActualStart)
      .lte('fecha_ingreso', isoActualEnd);

    let queryAnterior = supabase
      .from('casos_master')
      .select('cliente_id, estado, estado_pago, casos_detalle(unidades)')
      .gte('fecha_ingreso', isoPrevStart)
      .lte('fecha_ingreso', isoPrevEnd);

    if (searchQuery && searchQuery.trim().length > 0) {
      const search = searchQuery.trim();
      queryActual = queryActual.or(`codigo.ilike.%${search}%,paciente.ilike.%${search}%`);
      queryAnterior = queryAnterior.or(`codigo.ilike.%${search}%,paciente.ilike.%${search}%`);
    }

    const { data: casosActuales, error: errorActual } = await queryActual;
    if (errorActual) throw errorActual;

    const { data: casosAnteriores, error: errorAnterior } = await queryAnterior;
    if (errorAnterior) throw errorAnterior;

    return { success: true, casosActuales, casosAnteriores };
  } catch (err) {
    console.error('getMetricsData error:', err);
    return { success: false, error: err.message };
  }
}
export async function getAnnualProductionMetrics(year) {
  try {
    await checkAdminAccess();
    const supabase = getAdminClient();

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data: casos, error } = await supabase
      .from('casos_master')
      .select('fecha_ingreso, estado, total_caso')
      .gte('fecha_ingreso', startDate)
      .lte('fecha_ingreso', endDate)
      .neq('estado', 'Cancelado');

    if (error) throw error;

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      ingresos: 0
    }));

    casos?.forEach(c => {
      if (!c.fecha_ingreso) return;
      // Using UTC parsing to avoid timezone shifts
      const d = new Date(c.fecha_ingreso + 'T12:00:00Z');
      const month = d.getMonth();
      const ingresos = Number(c.total_caso) || 0;
      if (month >= 0 && month < 12) {
        monthlyData[month].ingresos += ingresos;
      }
    });

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    // Mismos colores que las donas
    const colors = ["#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E", "#EF4444", "#F59E0B", "#F97316", "#14B8A6", "#06B6D4", "#8B5CF6"];

    const chartData = monthlyData.map((d, i) => ({
      name: monthNames[i],
      ingresos: d.ingresos,
      color: colors[i]
    }));

    return { success: true, chartData };
  } catch (err) {
    console.error('getAnnualProductionMetrics error:', err);
    return { success: false, error: err.message };
  }
}
