ALTER TABLE subjects ADD COLUMN created_at TEXT DEFAULT (datetime('now'));
ALTER TABLE subjects ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
