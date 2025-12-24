import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';


let db: Database.Database;

export function getDb(): Database.Database {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'ecole.db');
  
  console.log('Database path:', dbPath);
  
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  
  // Initialize schema
  initializeSchema(db);
  
  // Run migrations
  runMigrations(db);
  
  return db;
}

function initializeSchema(db: Database.Database) {
  // Create base tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS academic_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      level TEXT NOT NULL,
      option TEXT NOT NULL,
      section TEXT NOT NULL,
      academic_year_id INTEGER NOT NULL,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      post_name TEXT DEFAULT '',
      gender TEXT CHECK(gender IN ('M', 'F')) NOT NULL,
      birth_date TEXT,
      birthplace TEXT DEFAULT '',
      class_id INTEGER NOT NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      UNIQUE(first_name, last_name, class_id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
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

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      period TEXT NOT NULL,
      value REAL NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(student_id, subject_id, period)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_type TEXT NOT NULL, -- 'student', 'class', 'general'
      target_id INTEGER,
      tags TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function runMigrations(db: Database.Database) {
  // Check if domains table exists
  const domainsTableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='domains'
  `).get();

  if (!domainsTableExists) {
    console.log('Running domains migration...');
    
    // Create domains table
    db.exec(`
      CREATE TABLE IF NOT EXISTS domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        display_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Insert default domains
    db.exec(`
      INSERT OR IGNORE INTO domains (name, display_order) VALUES
        ('Domaine des Langues', 1),
        ('Domaine des Mathématiques, Sciences et Technologie', 2),
        ('Domaine de l''Univers Social et Environnement', 3),
        ('Domaine des Arts', 4),
        ('Domaine du Développement Personnel', 5);
    `);

    console.log('Domains table created and populated');
  }

  // Check if domain_id column exists in subjects table
  const subjectsInfo = db.pragma('table_info(subjects)') as Array<{ name: string }>;
  const hasDomainId = subjectsInfo.some((col) => col.name === 'domain_id');

  if (!hasDomainId) {
    console.log('Adding domain_id to subjects table...');
    db.exec(`
      ALTER TABLE subjects ADD COLUMN domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL;
    `);
    console.log('domain_id column added to subjects');
  }

  // Check if sub_domain column exists in subjects table
  const hasSubDomain = subjectsInfo.some((col) => col.name === 'sub_domain');
  if (!hasSubDomain) {
    console.log('Adding sub_domain column to subjects table...');
    db.exec(`ALTER TABLE subjects ADD COLUMN sub_domain TEXT DEFAULT ''`);
    console.log('sub_domain column added to subjects');
  }

  // Check if conduite column exists in students table and add it if missing
  const studentsInfo = db.pragma('table_info(students)') as Array<{ name: string }>;
  const hasConduite = studentsInfo.some((col) => col.name === 'conduite');

  if (!hasConduite) {
    console.log('Adding conduite column to students table...');
    try {
      db.exec(`ALTER TABLE students ADD COLUMN conduite TEXT DEFAULT ''`);
      console.log('conduite column added to students');
    } catch (err) {
      console.error('Failed to add conduite column:', err);
    }
  }

  // Ensure conduite for each period exists (conduite_p1 .. conduite_p4)
  const hasConduiteP1 = studentsInfo.some((col) => col.name === 'conduite_p1');
  if (!hasConduiteP1) {
    console.log('Adding conduite_p1..p4 columns to students table...');
    try {
      db.exec(`ALTER TABLE students ADD COLUMN conduite_p1 TEXT DEFAULT ''`);
      db.exec(`ALTER TABLE students ADD COLUMN conduite_p2 TEXT DEFAULT ''`);
      db.exec(`ALTER TABLE students ADD COLUMN conduite_p3 TEXT DEFAULT ''`);
      db.exec(`ALTER TABLE students ADD COLUMN conduite_p4 TEXT DEFAULT ''`);
      console.log('conduite_p1..p4 columns added to students');
    } catch (err) {
      console.error('Failed to add conduite_p1..p4 columns:', err);
    }
  }

  // Check and add is_abandoned flag to students table
  const hasIsAbandoned = studentsInfo.some((col) => col.name === 'is_abandoned');
  if (!hasIsAbandoned) {
    console.log('Adding is_abandoned column to students table...');
    try {
      db.exec(`ALTER TABLE students ADD COLUMN is_abandoned INTEGER DEFAULT 0`);
      console.log('is_abandoned column added to students');
    } catch (err) {
      console.error('Failed to add is_abandoned column:', err);
    }
  }

  // Check and add abandon_reason column to students table
  const studentsInfoAfter = db.pragma('table_info(students)') as Array<{ name: string }>;
  const hasAbandonReason = studentsInfoAfter.some((col) => col.name === 'abandon_reason');
  if (!hasAbandonReason) {
    console.log('Adding abandon_reason column to students table...');
    try {
      db.exec(`ALTER TABLE students ADD COLUMN abandon_reason TEXT DEFAULT ''`);
      console.log('abandon_reason column added to students');
    } catch (err) {
      console.error('Failed to add abandon_reason column:', err);
    }
  }
}
