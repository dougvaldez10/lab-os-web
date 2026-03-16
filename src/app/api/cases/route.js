import Database from 'better-sqlite3';
import path from 'path';

export async function GET() {
  try {
    // Path to the SQLite database
    const dbPath = path.resolve('/Users/douglasvaldez/Desktop/programa/laboratorio_master.db');
    
    // Open the database (removing readonly to allow the WAL pragma to apply)
    const db = new Database(dbPath, { fileMustExist: true });
    
    // Enable WAL (Write-Ahead Logging) mode for concurrent reads/writes
    db.pragma('journal_mode = WAL');

    // Query to fetch active cases from casos_master
    // Mapping: 
    // codigo -> id (Case ID)
    // paciente -> patient
    // doctor -> doctor
    // depto_actual -> dept
    // estado -> status
    // fecha_ingreso -> date
    const query = `
      SELECT 
        id as internal_id,
        codigo as id, 
        paciente as patient, 
        doctor, 
        depto_actual as dept, 
        estado as status, 
        fecha_ingreso as date,
        tipo
      FROM casos_master 
      ORDER BY id DESC 
      LIMIT 100
    `;

    const rows = db.prepare(query).all();
    
    // Add logic for 'urgent' if needed, for now we map columns
    const cases = rows.map(row => ({
      ...row,
      urgent: row.tipo?.toLowerCase() === 'digital' // Example mapping: digital cases might be flagged
    }));

    db.close();

    return Response.json(cases);
  } catch (error) {
    console.error('Database error:', error);
    return Response.json({ error: 'Failed to fetch cases', details: error.message }, { status: 500 });
  }
}
