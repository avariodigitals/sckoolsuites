-- Forward-only migration to create PostgreSQL enum types
-- that already exist in prisma/schema.prisma but were missing
-- from the Neon production database.
--
-- This migration:
--   1. Creates enum types (if they do not exist).
--   2. Back-fills any NULL status values with the column default.
--   3. Drops legacy CHECK constraints that emulated enums.
--   4. Alters text columns to their proper enum types.
--   5. Adds NOT NULL constraints and defaults to match schema.prisma.
--
-- Locking impact:
--   - CREATE TYPE is a catalog-only operation.
--   - ALTER TABLE ... ALTER COLUMN TYPE takes an ACCESS EXCLUSIVE
--     lock and may rewrite the column for tables with non-trivial
--     size. The tables below are small reference/transaction tables
--     in a school-management context, so the lock duration is
--     expected to be sub-second. If any table is unexpectedly large,
--     consider running this migration during a maintenance window.
--
-- Data impact:
--   - Only NULL status rows are updated (set to the schema default).
--   - No rows are deleted or re-written beyond the column conversion.

BEGIN;

-- ============================================================
-- 1. Create enum types
-- ============================================================

CREATE TYPE IF NOT EXISTS "AcademicStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');
CREATE TYPE IF NOT EXISTS "PaymentStatus" AS ENUM ('UNPAID', 'PART_PAYMENT', 'PAID', 'PENDING', 'REVERSED');
CREATE TYPE IF NOT EXISTS "PaymentProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE IF NOT EXISTS "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
CREATE TYPE IF NOT EXISTS "MessageStatus" AS ENUM ('SENT', 'READ', 'REPLIED', 'CLOSED');
CREATE TYPE IF NOT EXISTS "ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
CREATE TYPE IF NOT EXISTS "ResultStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- ============================================================
-- 2. Back-fill NULL statuses with schema defaults
--    (only if tables exist — on a fresh DB the tables are
--    created later by initial_baseline)
-- ============================================================

DO $$ BEGIN
  IF to_regclass('public.session') IS NOT NULL THEN
    UPDATE "session" SET status = 'DRAFT' WHERE status IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.term') IS NOT NULL THEN
    UPDATE "term" SET status = 'DRAFT' WHERE status IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.invoice') IS NOT NULL THEN
    UPDATE "invoice" SET status = 'UNPAID' WHERE status IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.payment') IS NOT NULL THEN
    UPDATE "payment" SET status = 'PENDING' WHERE status IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.payment_proof') IS NOT NULL THEN
    UPDATE "payment_proof" SET status = 'PENDING' WHERE status IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.result') IS NOT NULL THEN
    UPDATE "result" SET status = 'DRAFT' WHERE status IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.attendance') IS NOT NULL THEN
    UPDATE "attendance" SET status = 'PRESENT' WHERE status IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.parent_message') IS NOT NULL THEN
    UPDATE "parent_message" SET status = 'SENT' WHERE status IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.parent_complaint') IS NOT NULL THEN
    UPDATE "parent_complaint" SET status = 'OPEN' WHERE status IS NULL;
  END IF;
END $$;

-- ============================================================
-- 3. Convert text columns to enum types and set defaults/NOT NULL
--    Each block checks if the column is already the target enum
--    type (fresh DB from initial_baseline) and skips if so.
-- ============================================================

-- session.status -> AcademicStatus
DO $$
BEGIN
  IF to_regclass('public.session') IS NULL THEN
    -- table doesn't exist yet (fresh DB, will be created by initial_baseline)
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session' AND column_name = 'status'
      AND udt_name = 'academicstatus'
  ) THEN
    ALTER TABLE "session" ALTER COLUMN status SET DEFAULT 'DRAFT';
    ALTER TABLE "session" ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE "session" ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_status_check";
    ALTER TABLE "session" ALTER COLUMN status TYPE "AcademicStatus" USING status::"AcademicStatus";
    ALTER TABLE "session" ALTER COLUMN status SET DEFAULT 'DRAFT';
    ALTER TABLE "session" ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- term.status -> AcademicStatus
DO $$
BEGIN
  IF to_regclass('public.term') IS NULL THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'term' AND column_name = 'status'
      AND udt_name = 'academicstatus'
  ) THEN
    ALTER TABLE "term" ALTER COLUMN status SET DEFAULT 'DRAFT';
    ALTER TABLE "term" ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE "term" ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "term" DROP CONSTRAINT IF EXISTS "term_status_check";
    ALTER TABLE "term" ALTER COLUMN status TYPE "AcademicStatus" USING status::"AcademicStatus";
    ALTER TABLE "term" ALTER COLUMN status SET DEFAULT 'DRAFT';
    ALTER TABLE "term" ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- invoice.status -> PaymentStatus
DO $$
BEGIN
  IF to_regclass('public.invoice') IS NULL THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice' AND column_name = 'status'
      AND udt_name = 'paymentstatus'
  ) THEN
    ALTER TABLE "invoice" ALTER COLUMN status SET DEFAULT 'UNPAID';
    ALTER TABLE "invoice" ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE "invoice" ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_status_check";
    ALTER TABLE "invoice" ALTER COLUMN status TYPE "PaymentStatus" USING status::"PaymentStatus";
    ALTER TABLE "invoice" ALTER COLUMN status SET DEFAULT 'UNPAID';
    ALTER TABLE "invoice" ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- payment.status -> PaymentStatus
DO $$
BEGIN
  IF to_regclass('public.payment') IS NULL THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment' AND column_name = 'status'
      AND udt_name = 'paymentstatus'
  ) THEN
    ALTER TABLE "payment" ALTER COLUMN status SET DEFAULT 'PENDING';
    ALTER TABLE "payment" ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE "payment" ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "payment_status_check";
    ALTER TABLE "payment" ALTER COLUMN status TYPE "PaymentStatus" USING status::"PaymentStatus";
    ALTER TABLE "payment" ALTER COLUMN status SET DEFAULT 'PENDING';
    ALTER TABLE "payment" ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- payment_proof.status -> PaymentProofStatus
DO $$
BEGIN
  IF to_regclass('public.payment_proof') IS NULL THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_proof' AND column_name = 'status'
      AND udt_name = 'paymentproofstatus'
  ) THEN
    ALTER TABLE "payment_proof" ALTER COLUMN status SET DEFAULT 'PENDING';
    ALTER TABLE "payment_proof" ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE "payment_proof" ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "payment_proof" DROP CONSTRAINT IF EXISTS "payment_proof_status_check";
    ALTER TABLE "payment_proof" ALTER COLUMN status TYPE "PaymentProofStatus" USING status::"PaymentProofStatus";
    ALTER TABLE "payment_proof" ALTER COLUMN status SET DEFAULT 'PENDING';
    ALTER TABLE "payment_proof" ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- result.status -> ResultStatus
DO $$
BEGIN
  IF to_regclass('public.result') IS NULL THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'result' AND column_name = 'status'
      AND udt_name = 'resultstatus'
  ) THEN
    ALTER TABLE "result" ALTER COLUMN status SET DEFAULT 'DRAFT';
    ALTER TABLE "result" ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE "result" ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "result" DROP CONSTRAINT IF EXISTS "result_status_check";
    ALTER TABLE "result" ALTER COLUMN status TYPE "ResultStatus" USING status::"ResultStatus";
    ALTER TABLE "result" ALTER COLUMN status SET DEFAULT 'DRAFT';
    ALTER TABLE "result" ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- attendance.status -> AttendanceStatus
DO $$
BEGIN
  IF to_regclass('public.attendance') IS NULL THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'status'
      AND udt_name = 'attendancestatus'
  ) THEN
    ALTER TABLE "attendance" ALTER COLUMN status SET DEFAULT 'PRESENT';
    ALTER TABLE "attendance" ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE "attendance" ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "attendance_status_check";
    ALTER TABLE "attendance" ALTER COLUMN status TYPE "AttendanceStatus" USING status::"AttendanceStatus";
    ALTER TABLE "attendance" ALTER COLUMN status SET DEFAULT 'PRESENT';
    ALTER TABLE "attendance" ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- parent_message.status -> MessageStatus
DO $$
BEGIN
  IF to_regclass('public.parent_message') IS NULL THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parent_message' AND column_name = 'status'
      AND udt_name = 'messagestatus'
  ) THEN
    ALTER TABLE "parent_message" ALTER COLUMN status SET DEFAULT 'SENT';
    ALTER TABLE "parent_message" ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE "parent_message" ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "parent_message" DROP CONSTRAINT IF EXISTS "parent_message_status_check";
    ALTER TABLE "parent_message" ALTER COLUMN status TYPE "MessageStatus" USING status::"MessageStatus";
    ALTER TABLE "parent_message" ALTER COLUMN status SET DEFAULT 'SENT';
    ALTER TABLE "parent_message" ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- parent_complaint.status -> ComplaintStatus
DO $$
BEGIN
  IF to_regclass('public.parent_complaint') IS NULL THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parent_complaint' AND column_name = 'status'
      AND udt_name = 'complaintstatus'
  ) THEN
    ALTER TABLE "parent_complaint" ALTER COLUMN status SET DEFAULT 'OPEN';
    ALTER TABLE "parent_complaint" ALTER COLUMN status SET NOT NULL;
  ELSE
    ALTER TABLE "parent_complaint" ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE "parent_complaint" DROP CONSTRAINT IF EXISTS "parent_complaint_status_check";
    ALTER TABLE "parent_complaint" ALTER COLUMN status TYPE "ComplaintStatus" USING status::"ComplaintStatus";
    ALTER TABLE "parent_complaint" ALTER COLUMN status SET DEFAULT 'OPEN';
    ALTER TABLE "parent_complaint" ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

COMMIT;
