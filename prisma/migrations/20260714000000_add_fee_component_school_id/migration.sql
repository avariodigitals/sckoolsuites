-- Add school_id column to fee_component table to match the Prisma schema
ALTER TABLE "fee_component" ADD COLUMN IF NOT EXISTS "school_id" TEXT NOT NULL DEFAULT 'default';
