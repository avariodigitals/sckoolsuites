-- Add guardian detail columns to admission_guardian
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "occupation" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "employer_name" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "work_address" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "work_phone" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "home_address" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "id_document_type" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "id_document_number" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "id_document_url" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN DEFAULT false;

-- Add guardian detail columns to parent
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "occupation" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "employer_name" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "work_address" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "work_phone" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "home_address" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "id_document_type" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "id_document_number" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "id_document_url" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
