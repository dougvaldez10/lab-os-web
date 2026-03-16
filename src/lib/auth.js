"use server";

import Database from 'better-sqlite3';
import path from 'path';

// Asegurar que Next.js no cachee esto si se usa en un entorno de servidor
// (Eliminado export const revalidate = 0; ya que Next.js no lo permite en archivos "use server")

export async function getCurrentUser() {
  const dbPath = path.resolve('/Users/douglasvaldez/Desktop/programa/laboratorio_master.db');
  let db;
  try {
    db = new Database(dbPath, { fileMustExist: true });
    db.pragma('journal_mode = WAL');
    
    // Obtener el usuario 'douglasvaldez' para el entorno de desarrollo local (Mock Auth)
    const user = db.prepare(`SELECT * FROM usuarios WHERE username = 'douglasvaldez'`).get();
    
    return user || null;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  } finally {
    if (db) {
      db.close();
    }
  }
}
