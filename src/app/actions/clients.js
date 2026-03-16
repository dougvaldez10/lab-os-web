"use server";

import Database from 'better-sqlite3';
import path from 'path';

export async function getClients() {
  let db;
  try {
    const dbPath = path.resolve('/Users/douglasvaldez/Desktop/programa/laboratorio_master.db');
    db = new Database(dbPath, { fileMustExist: true });
    db.pragma('journal_mode = WAL');
    
    // Solo necesitamos ID y Nombre para el dropdown
    return db.prepare('SELECT id, nombre, nombre_dentista FROM clientes ORDER BY nombre ASC').all();
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  } finally {
    if (db) db.close();
  }
}
