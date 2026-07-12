-- Add capacity to class_arm and make class_id nullable for standalone (preset) arms
-- Run with: psql "$DATABASE_URL" -f scripts/add-arm-capacity.sql

-- 1. Add capacity column
ALTER TABLE class_arm ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- 2. Make class_id nullable so arms can exist without a class assignment
ALTER TABLE class_arm ALTER COLUMN class_id DROP NOT NULL;
