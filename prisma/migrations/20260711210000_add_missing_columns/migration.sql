-- Add columns required by the application that are missing from the current database
ALTER TABLE "income" ADD COLUMN IF NOT EXISTS "payment_method" TEXT;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "payment_method" TEXT;
ALTER TABLE "admission_guardian" ADD COLUMN IF NOT EXISTS "occupation" TEXT;
ALTER TABLE "parent" ADD COLUMN IF NOT EXISTS "occupation" TEXT;
