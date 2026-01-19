use log::info;
use rusqlite::Connection;
use std::path::Path;

pub fn initialize_db(db_path: &Path) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    println!("Database path: {}", db_path.display());
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| e.to_string())?;

    // Base schema
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT '1970-01-01 00:00:00',
            last_modified_at TEXT DEFAULT '1970-01-01 00:00:00'
        );

        CREATE TABLE IF NOT EXISTS options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL UNIQUE,
            display_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT '1970-01-01 00:00:00',
            updated_at TEXT DEFAULT '1970-01-01 00:00:00'
        );

        CREATE TABLE IF NOT EXISTS academic_years (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 0,
            server_id TEXT,
            is_dirty INTEGER DEFAULT 1,
            created_at TEXT DEFAULT '1970-01-01 00:00:00',
            updated_at TEXT DEFAULT '1970-01-01 00:00:00',
            last_modified_at TEXT DEFAULT '1970-01-01 00:00:00'
        );

        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            level TEXT NOT NULL,
            option TEXT NOT NULL,
            section TEXT NOT NULL,
            academic_year_id INTEGER NOT NULL,
            server_id TEXT,
            is_dirty INTEGER DEFAULT 1,
            created_at TEXT DEFAULT '1970-01-01 00:00:00',
            updated_at TEXT DEFAULT '1970-01-01 00:00:00',
            last_modified_at TEXT DEFAULT '1970-01-01 00:00:00',
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
            conduite TEXT DEFAULT '',
            conduite_p1 TEXT DEFAULT '',
            conduite_p2 TEXT DEFAULT '',
            conduite_p3 TEXT DEFAULT '',
            conduite_p4 TEXT DEFAULT '',
            is_abandoned INTEGER DEFAULT 0,
            abandon_reason TEXT DEFAULT '',
            class_id INTEGER NOT NULL,
            server_id TEXT,
            is_dirty INTEGER DEFAULT 1,
            created_at TEXT DEFAULT '1970-01-01 00:00:00',
            updated_at TEXT DEFAULT '1970-01-01 00:00:00',
            last_modified_at TEXT DEFAULT '1970-01-01 00:00:00',
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
            UNIQUE(first_name, last_name, class_id)
        );

        CREATE TABLE IF NOT EXISTS domains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            display_order INTEGER DEFAULT 0,
            server_id TEXT,
            is_dirty INTEGER DEFAULT 1,
            created_at TEXT DEFAULT '1970-01-01 00:00:00',
            updated_at TEXT DEFAULT '1970-01-01 00:00:00',
            last_modified_at TEXT DEFAULT '1970-01-01 00:00:00'
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL DEFAULT '',
            max_p1 INTEGER NOT NULL DEFAULT 10,
            max_p2 INTEGER NOT NULL DEFAULT 10,
            max_exam1 INTEGER NOT NULL DEFAULT 20,
            max_p3 INTEGER NOT NULL DEFAULT 10,
            max_p4 INTEGER NOT NULL DEFAULT 10,
            max_exam2 INTEGER NOT NULL DEFAULT 20,
            category TEXT DEFAULT '',
            sub_domain TEXT DEFAULT '',
            domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL,
            class_id INTEGER NOT NULL,
            server_id TEXT,
            is_dirty INTEGER DEFAULT 1,
            created_at TEXT DEFAULT '1970-01-01 00:00:00',
            updated_at TEXT DEFAULT '1970-01-01 00:00:00',
            last_modified_at TEXT DEFAULT '1970-01-01 00:00:00',
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS grades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            period TEXT NOT NULL,
            value REAL NOT NULL,
            server_id TEXT,
            is_dirty INTEGER DEFAULT 1,
            created_at TEXT DEFAULT '1970-01-01 00:00:00',
            updated_at TEXT DEFAULT '1970-01-01 00:00:00',
            last_modified_at TEXT DEFAULT '1970-01-01 00:00:00',
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            UNIQUE(student_id, subject_id, period)
        );

        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT DEFAULT '',
            target_type TEXT NOT NULL DEFAULT 'general',
            target_id INTEGER,
            academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
            server_id TEXT,
            is_dirty INTEGER DEFAULT 1,
            created_at TEXT DEFAULT '1970-01-01 00:00:00',
            updated_at TEXT DEFAULT '1970-01-01 00:00:00',
            last_modified_at TEXT DEFAULT '1970-01-01 00:00:00'
        );

        CREATE TABLE IF NOT EXISTS repechages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            value REAL NOT NULL DEFAULT 0,
            percentage REAL NOT NULL DEFAULT 0,
            server_id TEXT,
            is_dirty INTEGER DEFAULT 1,
            created_at TEXT DEFAULT '1970-01-01 00:00:00',
            updated_at TEXT DEFAULT '1970-01-01 00:00:00',
            last_modified_at TEXT DEFAULT '1970-01-01 00:00:00',
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            UNIQUE(student_id, subject_id)
        );
    ",
    )
    .map_err(|e| e.to_string())?;

    // Migration logic for existing databases
    let _ = conn.execute("ALTER TABLE notes ADD COLUMN tags TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE classes ADD COLUMN server_id TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE classes ADD COLUMN is_dirty INTEGER DEFAULT 1",
        [],
    );
    let _ = conn.execute("ALTER TABLE subjects ADD COLUMN server_id TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE subjects ADD COLUMN is_dirty INTEGER DEFAULT 1",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE subjects ADD COLUMN category TEXT DEFAULT ''",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE subjects ADD COLUMN sub_domain TEXT DEFAULT ''",
        [],
    );
    let _ = conn.execute("ALTER TABLE subjects ADD COLUMN domain_id INTEGER", []);
    let _ = conn.execute("ALTER TABLE domains ADD COLUMN server_id TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE domains ADD COLUMN is_dirty INTEGER DEFAULT 1",
        [],
    );

    // Setup triggers for all sync tables
    let sync_tables = vec![
        "academic_years",
        "classes",
        "students",
        "subjects",
        "grades",
        "notes",
        "domains",
        "repechages",
    ];

    for table in sync_tables {
        let trigger_updated = format!(
            "
            CREATE TRIGGER IF NOT EXISTS trg_{table}_updated_at
            AFTER UPDATE ON {table}
            FOR EACH ROW
            WHEN (NEW.is_dirty = OLD.is_dirty OR NEW.is_dirty = 1)
            BEGIN
                UPDATE {table} SET 
                    updated_at = (datetime('now')), 
                    last_modified_at = (datetime('now')),
                    is_dirty = 1 
                WHERE id = OLD.id;
            END;
        "
        );
        conn.execute(&trigger_updated, [])
            .map_err(|e| e.to_string())?;
    }

    // Settings trigger
    conn.execute(
        "
        CREATE TRIGGER IF NOT EXISTS trg_settings_updated_at
        AFTER UPDATE ON settings
        FOR EACH ROW
        BEGIN
            UPDATE settings SET 
                updated_at = (datetime('now')), 
                last_modified_at = (datetime('now'))
            WHERE id = OLD.id;
        END;
    ",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Seed default data if needed
    conn.execute(
        "INSERT OR IGNORE INTO domains (name, display_order) VALUES
        ('Domaine des Langues', 1),
        ('Domaine des Mathématiques, Sciences et Technologie', 2),
        ('Domaine de l''Univers Social et Environnement', 3),
        ('Domaine des Arts', 4),
        ('Domaine du Développement Personnel', 5);
    ",
        [],
    )
    .map_err(|e| e.to_string())?;
    info!("Database path: {}", db_path.display());
    info!("Database initialized and schema verified.");
    Ok(())
}
