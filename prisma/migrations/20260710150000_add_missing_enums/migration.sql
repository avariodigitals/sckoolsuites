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

CREATE TYPE "AcademicStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PART_PAYMENT', 'PAID', 'PENDING', 'REVERSED');
CREATE TYPE "PaymentProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'READ', 'REPLIED', 'CLOSED');
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- ============================================================
-- 2. Back-fill NULL statuses with schema defaults
-- ============================================================

UPDATE "session" SET status = 'DRAFT' WHERE status IS NULL;
UPDATE "term" SET status = 'DRAFT' WHERE status IS NULL;
UPDATE "invoice" SET status = 'UNPAID' WHERE status IS NULL;
UPDATE "payment" SET status = 'PENDING' WHERE status IS NULL;
UPDATE "payment_proof" SET status = 'PENDING' WHERE status IS NULL;
UPDATE "result" SET status = 'DRAFT' WHERE status IS NULL;
UPDATE "attendance" SET status = 'PRESENT' WHERE status IS NULL;
UPDATE "parent_message" SET status = 'SENT' WHERE status IS NULL;
UPDATE "parent_complaint" SET status = 'OPEN' WHERE status IS NULL;

-- ============================================================
-- 3. Convert text columns to enum types and set defaults/NOT NULL
-- ============================================================

-- session.status -> AcademicStatus
ALTER TABLE "session" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_status_check";
ALTER TABLE "session" ALTER COLUMN status TYPE "AcademicStatus" USING status::"AcademicStatus";
ALTER TABLE "session" ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE "session" ALTER COLUMN status SET NOT NULL;

-- term.status -> AcademicStatus
ALTER TABLE "term" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "term" DROP CONSTRAINT IF EXISTS "term_status_check";
ALTER TABLE "term" ALTER COLUMN status TYPE "AcademicStatus" USING status::"AcademicStatus";
ALTER TABLE "term" ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE "term" ALTER COLUMN status SET NOT NULL;

-- invoice.status -> PaymentStatus
ALTER TABLE "invoice" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_status_check";
ALTER TABLE "invoice" ALTER COLUMN status TYPE "PaymentStatus" USING status::"PaymentStatus";
ALTER TABLE "invoice" ALTER COLUMN status SET DEFAULT 'UNPAID';
ALTER TABLE "invoice" ALTER COLUMN status SET NOT NULL;

-- payment.status -> PaymentStatus
ALTER TABLE "payment" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "payment_status_check";
ALTER TABLE "payment" ALTER COLUMN status TYPE "PaymentStatus" USING status::"PaymentStatus";
ALTER TABLE "payment" ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE "payment" ALTER COLUMN status SET NOT NULL;

-- payment_proof.status -> PaymentProofStatus
ALTER TABLE "payment_proof" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "payment_proof" DROP CONSTRAINT IF EXISTS "payment_proof_status_check";
ALTER TABLE "payment_proof" ALTER COLUMN status TYPE "PaymentProofStatus" USING status::"PaymentProofStatus";
ALTER TABLE "payment_proof" ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE "payment_proof" ALTER COLUMN status SET NOT NULL;

-- result.status -> ResultStatus
ALTER TABLE "result" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "result" DROP CONSTRAINT IF EXISTS "result_status_check";
ALTER TABLE "result" ALTER COLUMN status TYPE "ResultStatus" USING status::"ResultStatus";
ALTER TABLE "result" ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE "result" ALTER COLUMN status SET NOT NULL;

-- attendance.status -> AttendanceStatus
ALTER TABLE "attendance" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "attendance_status_check";
ALTER TABLE "attendance" ALTER COLUMN status TYPE "AttendanceStatus" USING status::"AttendanceStatus";
ALTER TABLE "attendance" ALTER COLUMN status SET DEFAULT 'PRESENT';
ALTER TABLE "attendance" ALTER COLUMN status SET NOT NULL;

-- parent_message.status -> MessageStatus
ALTER TABLE "parent_message" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "parent_message" DROP CONSTRAINT IF EXISTS "parent_message_status_check";
ALTER TABLE "parent_message" ALTER COLUMN status TYPE "MessageStatus" USING status::"MessageStatus";
ALTER TABLE "parent_message" ALTER COLUMN status SET DEFAULT 'SENT';
ALTER TABLE "parent_message" ALTER COLUMN status SET NOT NULL;

-- parent_complaint.status -> ComplaintStatus
ALTER TABLE "parent_complaint" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "parent_complaint" DROP CONSTRAINT IF EXISTS "parent_complaint_status_check";
ALTER TABLE "parent_complaint" ALTER COLUMN status TYPE "ComplaintStatus" USING status::"ComplaintStatus";
ALTER TABLE "parent_complaint" ALTER COLUMN status SET DEFAULT 'OPEN';
ALTER TABLE "parent_complaint" ALTER COLUMN status SET NOT NULL;

COMMIT;
