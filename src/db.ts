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
      target_type TEXT NOT NULL DEFAULT 'general', -- 'student', 'class', 'general'
      target_id INTEGER,
      academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
      tags TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_modified_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      type TEXT NOT NULL, -- 'PUSH', 'PULL', 'FULL_SYNC'
      status TEXT NOT NULL, -- 'SUCCESS', 'ERROR'
      records_synced TEXT, -- JSON string detailing counts per table
      error_message TEXT,
      duration_ms INTEGER
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

  // Check if category column exists in subjects table
  const hasCategory = subjectsInfo.some((col) => col.name === 'category');
  if (!hasCategory) {
    console.log('Adding category column to subjects table...');
    db.exec(`ALTER TABLE subjects ADD COLUMN category TEXT DEFAULT ''`);
    console.log('category column added to subjects');
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
  // Check if academic_year_id exists in notes
  const notesInfo = db.pragma('table_info(notes)') as Array<{ name: string }>;
  if (!notesInfo.some(col => col.name === 'academic_year_id')) {
    console.log('Adding academic_year_id to notes table...');
    db.exec(`ALTER TABLE notes ADD COLUMN academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL;`);
    console.log('academic_year_id added to notes');
  }

  // Check if target_type exists in notes (for very old versions)
  if (!notesInfo.some(col => col.name === 'target_type')) {
    console.log('Adding target_type to notes table...');
    db.exec(`ALTER TABLE notes ADD COLUMN target_type TEXT DEFAULT 'general';`);
  }

  // Check if target_id exists in notes
  if (!notesInfo.some(col => col.name === 'target_id')) {
    console.log('Adding target_id to notes table...');
    db.exec(`ALTER TABLE notes ADD COLUMN target_id INTEGER;`);
  }
  // --- Tombstone System for Sync Deletions ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_deletions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      deleted_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // --- Cloud Sync Migrations ---
  const syncTables = ['academic_years', 'classes', 'students', 'subjects', 'grades', 'notes', 'domains'];
  
  syncTables.forEach(table => {
    const tableInfo = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
    
    // Add updated_at
    if (!tableInfo.some(col => col.name === 'updated_at')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT DEFAULT '1970-01-01 00:00:00'`);
    }

    // Add created_at
    if (!tableInfo.some(col => col.name === 'created_at')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN created_at TEXT DEFAULT '1970-01-01 00:00:00'`);
    }
    
    // Add server_id
    if (!tableInfo.some(col => col.name === 'server_id')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN server_id TEXT`);
    }
    
    // Add is_dirty
    if (!tableInfo.some(col => col.name === 'is_dirty')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN is_dirty INTEGER DEFAULT 1`);
    }

    // Add last_modified_at
    if (!tableInfo.some(col => col.name === 'last_modified_at')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN last_modified_at TEXT DEFAULT '1970-01-01 00:00:00'`);
    }

    // Create trigger for updated_at and last_modified_at
    db.exec(`
      DROP TRIGGER IF EXISTS trg_${table}_updated_at;
      CREATE TRIGGER trg_${table}_updated_at
      AFTER UPDATE ON ${table}
      FOR EACH ROW
      WHEN (NEW.is_dirty = OLD.is_dirty OR NEW.is_dirty = 1)
      BEGIN
        UPDATE ${table} SET 
          updated_at = (datetime('now')), 
          last_modified_at = (datetime('now')),
          is_dirty = 1 
        WHERE id = OLD.id;
      END;

      DROP TRIGGER IF EXISTS trg_${table}_inserted;
    `);

    // Create trigger for deletion tracking (Tombstones)
    db.exec(`
      DROP TRIGGER IF EXISTS trg_${table}_deleted;
      CREATE TRIGGER trg_${table}_deleted
      AFTER DELETE ON ${table}
      BEGIN
        INSERT INTO sync_deletions (table_name, local_id)
        VALUES ('${table}', OLD.id);
      END;
    `);
  });

  // Special case for settings (license, school_id)
  const settingsInfo = db.pragma("table_info(settings)") as Array<{ name: string }>;
  if (!settingsInfo.some(col => col.name === 'updated_at')) {
    db.exec(`ALTER TABLE settings ADD COLUMN updated_at TEXT DEFAULT '1970-01-01 00:00:00'`);
  }
  if (!settingsInfo.some(col => col.name === 'last_modified_at')) {
    db.exec(`ALTER TABLE settings ADD COLUMN last_modified_at TEXT DEFAULT '1970-01-01 00:00:00'`);
  }

  // Create trigger for settings
  db.exec(`
    DROP TRIGGER IF EXISTS trg_settings_updated_at;
    CREATE TRIGGER trg_settings_updated_at
    AFTER UPDATE ON settings
    FOR EACH ROW
    BEGIN
      UPDATE settings SET 
        updated_at = (datetime('now')), 
        last_modified_at = (datetime('now'))
      WHERE id = OLD.id;
    END;
  `);
}
