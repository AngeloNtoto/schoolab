export const SCHEMA = `
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
    period TEXT NOT NULL, -- P1, P2, EXAM1, P3, P4, EXAM2
    value REAL NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(student_id, subject_id, period)
  );
`;
