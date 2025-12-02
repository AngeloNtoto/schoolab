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

  return db;
}
