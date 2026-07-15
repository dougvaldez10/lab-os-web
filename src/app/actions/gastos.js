"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Cliente de Supabase con Service Role para evadir RLS si es admin/creador
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key'
);

/**
 * Valida que el usuario sea administrador o administrativo.
 */
async function checkAdminAccess() {
  const cookieStore = await cookies();
  const username = cookieStore.get('lab_os_user')?.value;
  if (!username) throw new Error("No autenticado.");

  const { data: user, error } = await supabaseAdmin
    .from('usuarios')
    .select('rol')
    .eq('username', username)
    .single();

  if (error || !user) throw new Error("Acceso denegado.");

  const isAuthorized = user.rol?.includes('lab_owner') || user.rol?.includes('Administrativo') || username.toLowerCase() === 'legion';
  if (!isAuthorized) throw new Error("Acceso denegado.");
  return username;
}

/**
 * Obtiene el listado de gastos filtrado y ordenado.
 */
export async function getGastos(filters = {}) {
  try {
    await checkAdminAccess();

    const { startDate, endDate, category, provider } = filters;

    let query = supabaseAdmin
      .from('gastos')
      .select('*');

    if (category) {
      query = query.eq('tipo_producto', category);
    }
    if (provider) {
      query = query.ilike('proveedor', `%${provider}%`);
    }
    if (startDate) {
      query = query.gte('fecha', startDate);
    }
    if (endDate) {
      query = query.lte('fecha', endDate);
    }

    const { data: expenses, error: errExpenses } = await query.order('fecha', { ascending: false });
    if (errExpenses) throw errExpenses;

    // Obtener detalles de gastos
    const { data: details, error: errDetails } = await supabaseAdmin
      .from('gastos_detalle')
      .select('*');

    if (errDetails) throw errDetails;

    const expensesWithDetails = (expenses || []).map(e => ({
      ...e,
      detalles: (details || []).filter(d => d.gasto_id === e.id)
    }));

    return { success: true, expenses: expensesWithDetails };

  } catch (err) {
    console.error("getGastos error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Registra un gasto en el sistema.
 */
export async function registrarGasto(formData) {
  try {
    const adminUser = await checkAdminAccess();

    const concepto = formData.get('concepto');
    const montoStr = formData.get('monto');
    const tipo_producto = formData.get('tipo_producto'); // Categoría
    const proveedor = formData.get('proveedor') || 'Genérico';
    const fecha = formData.get('fecha') || new Date().toISOString().split('T')[0];
    const file = formData.get('comprobante'); // Objeto File
    const itemsJson = formData.get('items'); // JSON opcional de detalles

    if (!concepto || !montoStr || !tipo_producto) {
      return { success: false, error: "Concepto, monto y categoría son obligatorios." };
    }

    const monto = parseFloat(montoStr);
    if (isNaN(monto) || monto <= 0) {
      return { success: false, error: "El monto debe ser un número positivo." };
    }

    // 1. Cargar archivo si existe
    let comprobanteUrl = null;
    if (file && file.size > 0 && file.name) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileExt = file.name.split('.').pop() || 'png';
      const timestamp = Date.now();
      const filePath = `gastos/gasto_${timestamp}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('comprobantes_pago')
        .upload(filePath, buffer, {
          contentType: file.type || 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return { success: false, error: `Error al guardar el comprobante: ${uploadError.message}` };
      }

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('comprobantes_pago')
        .getPublicUrl(filePath);

      comprobanteUrl = publicUrl;
    }

    // 2. Insertar cabecera de gasto
    const { data: gasto, error: errGasto } = await supabaseAdmin
      .from('gastos')
      .insert({
        fecha,
        concepto,
        monto,
        tipo_producto,
        proveedor,
        comprobante_url: comprobanteUrl,
        creado_por: adminUser
      })
      .select()
      .single();

    if (errGasto) {
      console.error("Error al insertar gasto:", errGasto);
      return { success: false, error: `Error de base de datos: ${errGasto.message}` };
    }

    // 3. Insertar desglose de detalles si se especificó
    if (itemsJson) {
      try {
        const items = JSON.parse(itemsJson);
        if (Array.isArray(items) && items.length > 0) {
          const detailRows = items.map(item => ({
            gasto_id: gasto.id,
            descripcion: item.descripcion,
            cantidad: parseFloat(item.cantidad) || 1.0,
            precio_unitario: parseFloat(item.precio_unitario) || 0.0,
            subtotal: (parseFloat(item.cantidad) || 1.0) * (parseFloat(item.precio_unitario) || 0.0)
          }));

          const { error: errDetails } = await supabaseAdmin
            .from('gastos_detalle')
            .insert(detailRows);

          if (errDetails) {
            console.error("Error al insertar detalles de gasto:", errDetails);
            // No revertimos el gasto principal pero reportamos
          }
        }
      } catch (e) {
        console.error("Error al procesar JSON de detalles:", e);
      }
    }

    revalidatePath('/admin/gastos');
    return { success: true, gasto };

  } catch (err) {
    console.error("registrarGasto error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Elimina un gasto y sus detalles en cascada.
 */
export async function eliminarGasto(id) {
  try {
    await checkAdminAccess();

    const { error } = await supabaseAdmin
      .from('gastos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error al eliminar gasto:", error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/gastos');
    return { success: true };

  } catch (err) {
    console.error("eliminarGasto error:", err);
    return { success: false, error: err.message };
  }
}
