"use server";

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Calcula la Media Dinámica de los últimos 30 casos completados para un departamento.
 * Implementa la lógica definida en la Directiva de Inteligencia Predictiva.
 *
 * @param {string} departamento - ID exacto del departamento (ej. "Digital_Diseno")
 * @returns {Promise<number>} Media en minutos. Retorna 120 si no hay datos históricos.
 */
export async function getRealAverage(departamento) {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('casos_tiempos_historicos')
      .select('minutos_totales')
      .eq('departamento', departamento)
      .not('minutos_totales', 'is', null)
      .order('hora_termino', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('[SLA] Error consultando histórico:', error.message);
      return 120;
    }

    if (!data || data.length === 0) {
      // Sin datos históricos → tiempo base por defecto
      return 120;
    }

    const total = data.reduce((acc, row) => acc + (row.minutos_totales || 0), 0);
    const media = total / data.length;
    return Math.round(media * 100) / 100; // 2 decimales
  } catch (e) {
    console.warn('[SLA] Error inesperado:', e.message);
    return 120;
  }
}

/**
 * Carga las medias de múltiples departamentos en una sola llamada.
 * Útil para precalcular todos los SLAs del dashboard en el servidor.
 *
 * @param {string[]} departamentos - Array de IDs de departamentos
 * @returns {Promise<Record<string, number>>} Mapa depto → media en minutos
 */
export async function getAllDeptAverages(departamentos) {
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from('casos_tiempos_historicos')
      .select('departamento, minutos_totales')
      .in('departamento', departamentos)
      .not('minutos_totales', 'is', null)
      .order('hora_termino', { ascending: false });

    if (error || !data) {
      console.warn('[SLA] Error en getAllDeptAverages:', error?.message);
      // Retornar 120 para todos como fallback
      return Object.fromEntries(departamentos.map(d => [d, 120]));
    }

    // Agrupar por departamento y tomar los últimos 30 de cada uno
    const grouped = {};
    for (const row of data) {
      const dept = row.departamento;
      if (!grouped[dept]) grouped[dept] = [];
      if (grouped[dept].length < 30) {
        grouped[dept].push(row.minutos_totales);
      }
    }

    const result = {};
    for (const dept of departamentos) {
      const vals = grouped[dept];
      if (!vals || vals.length === 0) {
        result[dept] = 120; // fallback
      } else {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        result[dept] = Math.round(avg * 100) / 100;
      }
    }

    return result;
  } catch (e) {
    console.warn('[SLA] Error inesperado en getAllDeptAverages:', e.message);
    return Object.fromEntries(departamentos.map(d => [d, 120]));
  }
}
