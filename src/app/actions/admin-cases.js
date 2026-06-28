"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';

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
      .select('id, codigo, cliente_id, total_caso, saldo_pendiente, estado')
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

    // 4. Actualizar casos_master a Cancelado y limpiar deuda
    // Usamos estado_pago = 'Pendiente' debido al CHECK constraint en la base de datos
    const { error: errUpdate } = await supabase
      .from('casos_master')
      .update({
        estado: 'Cancelado',
        saldo_pendiente: 0,
        estado_pago: 'Pendiente' 
      })
      .eq('id', caso_id);

    if (errUpdate) throw errUpdate;

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

