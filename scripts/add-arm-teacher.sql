-- Add teacher_id to class_arm for per-arm teacher assignment
-- Run with: psql "$DATABASE_URL" -f scripts/add-arm-teacher.sql

ALTER TABLE class_arm
ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES teacher(id) ON DELETE SET NULL;
