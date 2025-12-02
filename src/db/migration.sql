-- Migration: Add postnom and birthplace to students table
ALTER TABLE students ADD COLUMN post_name TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN birthplace TEXT DEFAULT '';
