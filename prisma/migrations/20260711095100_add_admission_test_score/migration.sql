-- Add missing testScore column to admission_application
ALTER TABLE "admission_application" ADD COLUMN IF NOT EXISTS "test_score" INTEGER;
