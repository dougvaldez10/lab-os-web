"use server";

import { supabase } from '@/lib/supabase';

export async function getProducts() {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('nombre, categoria')
      .order('nombre', { ascending: true });

    if (error) throw error;

    // Quitar el prefijo numérico para el display (ej. "10001-Corona Zr" → "Corona Zr")
    // y agrupar por categoría
    const grouped = {};
    for (const p of data) {
      const displayName = p.nombre.replace(/^\d+-/, '').trim();
      if (!grouped[p.categoria]) grouped[p.categoria] = [];
      grouped[p.categoria].push({ raw: p.nombre, display: displayName });
    }
    return grouped;
  } catch (error) {
    console.error("Error fetching products:", error);
    return {};
  }
}
