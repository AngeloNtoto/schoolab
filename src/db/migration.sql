-- Previous migrations
ALTER TABLE subjects ADD COLUMN created_at TEXT DEFAULT (datetime('now'));
ALTER TABLE subjects ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- Add domains table for primary school bulletin organization
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Add domain_id to subjects table
ALTER TABLE subjects ADD COLUMN domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL;

-- Insert default domains for primary school (7ème and 8ème)
INSERT OR IGNORE INTO domains (name, display_order) VALUES
  ('Domaine des Langues', 1),
  ('Domaine des Mathématiques, Sciences et Technologie', 2),
  ('Domaine de l''Univers Social et Environnement', 3),
  ('Domaine des Arts', 4),
  ('Domaine du Développement Personnel', 5);
