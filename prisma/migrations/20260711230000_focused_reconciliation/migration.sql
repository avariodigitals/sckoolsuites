-- Focused reconciliation migration
-- Objects added:
--   * payment_method table
--   * school_bank_account table
--   * parent columns missing from the live database
--   * admission_guardian columns missing from the live database
--   * foreign keys for parent and admission_guardian that are present in the baseline but missing in the live database
--
-- All added columns are nullable except is_primary, which has a default of false.
-- Existing parent rows were checked for orphan values before adding FKs; none found.

-- Create missing payment_method table (matches the clean-install baseline)
CREATE TABLE IF NOT EXISTS "payment_method" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_method_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_method_school_id_code_key" ON "payment_method"("school_id", "code");
CREATE INDEX IF NOT EXISTS "payment_method_school_id_idx" ON "payment_method"("school_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payment_method_school_id_fkey'
    ) THEN
        ALTER TABLE "payment_method"
        ADD CONSTRAINT "payment_method_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "school"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payment_method_code_check'
    ) THEN
        ALTER TABLE "payment_method"
        ADD CONSTRAINT "payment_method_code_check"
        CHECK ("code" IN ('CASH', 'CHEQUE', 'POS', 'CARD', 'BANK_TRANSFER'));
    END IF;
END $$;

-- Create missing school_bank_account table (matches the clean-install baseline)
CREATE TABLE IF NOT EXISTS "school_bank_account" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT,
    "branch" TEXT,
    "instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "school_bank_account_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "school_bank_account_school_id_idx" ON "school_bank_account"("school_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'school_bank_account_school_id_fkey'
    ) THEN
        ALTER TABLE "school_bank_account"
        ADD CONSTRAINT "school_bank_account_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "school"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add missing parent columns used by the application
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "employer_name" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "work_address" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "work_phone" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "home_address" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "id_document_type" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "id_document_number" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "id_document_url" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;

-- Add parent foreign keys that are missing from the live database
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'parent_user_id_fkey'
    ) THEN
        ALTER TABLE "parent"
        ADD CONSTRAINT "parent_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "user"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'parent_school_id_fkey'
    ) THEN
        ALTER TABLE "parent"
        ADD CONSTRAINT "parent_school_id_fkey"
        FOREIGN KEY ("school_id") REFERENCES "school"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add missing admission_guardian columns used by the application
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "employer_name" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "work_address" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "work_phone" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "home_address" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "id_document_type" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "id_document_number" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "id_document_url" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT false;

-- Add admission_guardian foreign key that is missing from the live database
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admission_guardian_application_id_fkey'
    ) THEN
        ALTER TABLE "admission_guardian"
        ADD CONSTRAINT "admission_guardian_application_id_fkey"
        FOREIGN KEY ("application_id") REFERENCES "admission_application"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
