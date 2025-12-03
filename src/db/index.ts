import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { SCHEMA } from './schema';

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'ecole.db');
  
  console.log('Database path:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // Initialize schema
  db.exec(SCHEMA);

  // Migration: Convert old max_score to new 6-maxima schema
  try {
    const tableInfo = db.pragma('table_info(subjects)') as Array<{ name: string }>;
    const hasOldSchema = tableInfo.some(col => col.name === 'max_score');
    
    if (hasOldSchema) {
      console.log('Migrating subjects table to new schema...');
      
      // Step 1: Rename old table
      db.exec('ALTER TABLE subjects RENAME TO subjects_old;');
      
      // Step 2: Create new table with new schema
      db.exec(`
        CREATE TABLE subjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT NOT NULL,
          max_p1 INTEGER NOT NULL DEFAULT 10,
          max_p2 INTEGER NOT NULL DEFAULT 10,
          max_exam1 INTEGER NOT NULL DEFAULT 20,
          max_p3 INTEGER NOT NULL DEFAULT 10,
          max_p4 INTEGER NOT NULL DEFAULT 10,
          max_exam2 INTEGER NOT NULL DEFAULT 20,
          class_id INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        );
      `);
      
      // Step 3: Copy data from old table to new table, converting max_score to maxima
      db.exec(`
        INSERT INTO subjects (id, name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, created_at, updated_at)
        SELECT 
          id, 
          name, 
          code, 
          max_score, 
          max_score, 
          max_score * 2, 
          max_score, 
          max_score, 
          max_score * 2, 
          class_id, 
          created_at, 
          updated_at
        FROM subjects_old;
      `);
      
      // Step 4: Drop old table
      db.exec('DROP TABLE subjects_old;');
      
      console.log('Migration completed successfully');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  return db;
}
