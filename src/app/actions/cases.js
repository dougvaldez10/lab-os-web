"use server";

import Database from 'better-sqlite3';
import path from 'path';
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

export async function updateCaseState(internalId, action) {
  let db;
  try {
    if (!internalId || !['START', 'PAUSE', 'COMPLETE'].includes(action)) {
      return { success: false, error: "Datos de acción inválidos." };
    }

    const dbPath = path.resolve('/Users/douglasvaldez/Desktop/programa/laboratorio_master.db');
    db = new Database(dbPath, { fileMustExist: true });
    
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000'); // Esperar hasta 5s

    // Primero consultamos el estado actual para saber el depto en 'COMPLETE'
    const currentCase = db.prepare('SELECT depto_actual FROM casos_master WHERE id = ?').get(internalId);
    
    if (!currentCase) {
      return { success: false, error: "Caso no encontrado." };
    }

    let query;
    let params;

    if (action === 'START') {
        query = `UPDATE casos_master SET estado = 'En Proceso' WHERE id = ?`;
        params = [internalId];
    } else if (action === 'PAUSE') {
        query = `UPDATE casos_master SET estado = 'En Pausa' WHERE id = ?`;
        params = [internalId];
    } else if (action === 'COMPLETE') {
        // Lógica de avanzar al siguiente departamento y ponerlo en Pendiente
        const currentIndex = workflow.indexOf(currentCase.depto_actual);
        const nextDept = currentIndex >= 0 && currentIndex < workflow.length - 1 
            ? workflow[currentIndex + 1] 
            : currentCase.depto_actual; // Si ya es Terminado, se queda ahí
        
        query = `UPDATE casos_master SET depto_actual = ?, estado = 'Pendiente' WHERE id = ?`;
        params = [nextDept, internalId];
    }

    const info = db.prepare(query).run(...params);

    if (info.changes === 0) {
      return { success: false, error: "No se pudo modificar el registro." };
    }

    revalidatePath('/');
    return { success: true };

  } catch (error) {
    console.error("Error al actualizar caso:", error);
    
    if (error.code === 'SQLITE_BUSY') {
        return { success: false, error: "El sistema está ocupado. Intenta de nuevo en unos segundos." };
    }
    
    return { success: false, error: "Error interno al guardar." };
  } finally {
    if (db) {
      db.close();
    }
  }
}

