"use server";

import Database from 'better-sqlite3';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';

export async function createNewCase(formData) {
  let db;
  try {
    const user = await getCurrentUser();
    
    // Obtener valores del form
    const cliente_id = formData.get('cliente_id');
    const paciente = formData.get('paciente');
    const edad = formData.get('edad');
    const color = formData.get('color');
    const doctor = formData.get('doctor');
    const tipo = formData.get('tipo'); // 'Análogo' o 'Digital'

    // Validaciones básicas
    if (!cliente_id || !paciente || !tipo) {
      return { success: false, error: "Cliente, paciente y tipo son requeridos." };
    }

    // Auto-Enrutamiento Inicial
    let depto_actual = 'Recepción';
    if (tipo === 'Análogo') {
      depto_actual = 'Yesos';
    } else if (tipo === 'Digital') {
      depto_actual = 'Digital_Diseno'; // "Diseño" en UI (de Digital_Diseno para machear código)
    }

    const estado = 'Pendiente';
    const usuario_id = user ? user.id : null;
    
    // Generar un código visual de caso (ej., C-XXXX)
    const fecha = new Date();
    const codigo = `C-${fecha.getFullYear().toString().slice(-2)}${(fecha.getMonth()+1).toString().padStart(2, '0')}${Math.floor(Math.random()*1000).toString().padStart(3, '0')}`;
    const fecha_ingreso = fecha.toISOString().split('T')[0];

    // DB Connection
    const dbPath = path.resolve('/Users/douglasvaldez/Desktop/programa/laboratorio_master.db');
    db = new Database(dbPath, { fileMustExist: true });
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');

    // Mapeo a columnas válidas usando el schema real
    // campos reales de sqlite schema: codigo, cliente_id, paciente, estado, fecha_ingreso, edad, color, doctor, tipo, depto_actual, usuario_id
    const stmt = db.prepare(`
      INSERT INTO casos_master 
      (codigo, cliente_id, paciente, estado, fecha_ingreso, edad, color, doctor, tipo, depto_actual, usuario_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      codigo, 
      cliente_id, 
      paciente, 
      estado, 
      fecha_ingreso, 
      edad || '', 
      color || '', 
      doctor || '', 
      tipo, 
      depto_actual, 
      usuario_id
    );

    // Revalidar para que el Dashboard actualice
    revalidatePath('/');

    return { 
      success: true, 
      insertedId: info.lastInsertRowid, 
      deptoAsignado: depto_actual 
    };

  } catch (error) {
    console.error("Error creando caso:", error);
    if (error.code === 'SQLITE_BUSY') {
        return { success: false, error: "Base de datos ocupada. Reintente." };
    }
    return { success: false, error: "Error interno al guardar en BD." };
  } finally {
    if (db) db.close();
  }
}
