-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AcademicStatus') THEN
    CREATE TYPE "AcademicStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PART_PAYMENT', 'PAID', 'PENDING', 'REVERSED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentProofStatus') THEN
    CREATE TYPE "PaymentProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN
    CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
    CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'READ', 'REPLIED', 'CLOSED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplaintStatus') THEN
    CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResultStatus') THEN
    CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED', 'REJECTED');
  END IF;
END $$;

-- CreateTable
CREATE TABLE "school" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "website" TEXT,
    "motto" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_setup" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_branding" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#0B1F4D',
    "secondary_color" TEXT NOT NULL DEFAULT '#0E9F6E',
    "report_card_theme" TEXT NOT NULL DEFAULT 'classic',
    "invoice_theme" TEXT NOT NULL DEFAULT 'clean',
    "receipt_theme" TEXT NOT NULL DEFAULT 'simple',
    "bank_name" TEXT,
    "bank_account_name" TEXT,
    "bank_account_number" TEXT,
    "bank_instructions" TEXT,
    "principal_signature" TEXT,
    "teacher_signature" TEXT,
    "school_stamp" TEXT,
    "report_header_text" TEXT,
    "receipt_footer_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "avatar_url" TEXT,
    "password" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "occupation" TEXT,
    "employer_name" TEXT,
    "work_address" TEXT,
    "work_phone" TEXT,
    "home_address" TEXT,
    "id_document_type" TEXT,
    "id_document_number" TEXT,
    "id_document_url" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "parent_id" INTEGER,
    "teacher_id" INTEGER,
    "class_id" INTEGER,
    "arm_id" INTEGER,
    "admission_no" TEXT,
    "gender" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "sport_house" TEXT,
    "passport_url" TEXT,
    "co_curricular" TEXT,
    "responsibilities" TEXT,
    "route_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_guardian" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "relationship" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_enrollment" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,
    "class_id" INTEGER,
    "promotion_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_group" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "class_group_id" INTEGER,
    "class_teacher" TEXT,
    "teacher_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_arm" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "class_id" INTEGER,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "teacher_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_arm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" "AcademicStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "session_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" "AcademicStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "resumption_date" TIMESTAMP(3),
    "break_dates" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "class_id" INTEGER,
    "class_names" TEXT,
    "class_group_id" INTEGER,
    "class_group_names" TEXT,
    "teacher_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_group" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_component" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_item" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "fee_group_id" INTEGER NOT NULL,
    "class_id" INTEGER,
    "arm_id" INTEGER,
    "session_id" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "due_date" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_profile" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "fee_group_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "session_id" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_profile_item" (
    "id" SERIAL NOT NULL,
    "fee_profile_id" INTEGER NOT NULL,
    "fee_component_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_profile_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_profile_class" (
    "id" SERIAL NOT NULL,
    "fee_profile_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_profile_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_profile_arm" (
    "id" SERIAL NOT NULL,
    "fee_profile_id" INTEGER NOT NULL,
    "arm_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_profile_arm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "student_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "class_id" INTEGER,
    "term_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "amount_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "payment_instructions" TEXT,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_item" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "fee_item_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "invoice_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "confirmed_at" TIMESTAMP(3),
    "received_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_proof" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "payment_id" INTEGER NOT NULL,
    "bank_name" TEXT,
    "transaction_reference" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "proof_url" TEXT,
    "status" "PaymentProofStatus" NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "invoice_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "receipt_number" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "received_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "student_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "teacher_id" INTEGER,
    "term_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "ca_score" DOUBLE PRECISION,
    "exam_score" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "grade" TEXT,
    "gpa" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "student_id" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "cumulative_total" DOUBLE PRECISION,
    "average" DOUBLE PRECISION,
    "term_percentage" DOUBLE PRECISION,
    "term_grade" TEXT,
    "term_gpa" DOUBLE PRECISION,
    "class_teacher_comment" TEXT,
    "principal_comment" TEXT,
    "attendance_present" INTEGER NOT NULL DEFAULT 0,
    "attendance_total" INTEGER NOT NULL DEFAULT 0,
    "cognitive_assessment" TEXT,
    "affective_assessment" TEXT,
    "psychomotor_assessment" TEXT,
    "next_term_resumption" TIMESTAMP(3),
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "review_note" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "uploaded_by_id" INTEGER,
    "approved_by_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "published_by_id" INTEGER,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "session_id" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "class_id" INTEGER,
    "teacher_id" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "class_id" INTEGER,
    "subject_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "lesson_id" INTEGER,
    "class_id" INTEGER,
    "subject_id" INTEGER,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER,
    "title" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "submission_note" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "class_id" INTEGER,
    "subject_id" INTEGER,
    "teacher_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instruction" TEXT,
    "total_marks" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_class" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "class_id" INTEGER,
    "subject_id" INTEGER,
    "teacher_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT,
    "meeting_link" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "online_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "session_id" INTEGER,
    "term_id" INTEGER,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "target_roles" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_setting" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_config_version" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_config_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_category" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_category" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "category_id" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "is_from_payment" BOOLEAN NOT NULL DEFAULT false,
    "payment_id" INTEGER,
    "payment_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "category_id" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_application" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "session_id" INTEGER,
    "applicant_number" TEXT NOT NULL,
    "enrollment_type" TEXT NOT NULL DEFAULT 'REGULAR',
    "date_of_registration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact_number" TEXT,
    "alternate_contact_number" TEXT,
    "alternate_email" TEXT,
    "gender" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "age" INTEGER,
    "birth_place" TEXT,
    "nationality" TEXT,
    "mother_tongue" TEXT,
    "blood_group" TEXT,
    "religion" TEXT,
    "address" TEXT,
    "present_address" JSONB,
    "permanent_address" JSONB,
    "previous_institute" TEXT,
    "previous_class" TEXT,
    "applying_for_class_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "test_score" INTEGER,
    "interview_notes" TEXT,
    "notes" TEXT,
    "last_school_report_url" TEXT,
    "photo_url" TEXT,
    "converted_student_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admission_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_guardian" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "contact_number" TEXT,
    "relationship" TEXT NOT NULL,
    "is_new" BOOLEAN NOT NULL DEFAULT true,
    "occupation" TEXT,
    "employer_name" TEXT,
    "work_address" TEXT,
    "work_phone" TEXT,
    "home_address" TEXT,
    "id_document_type" TEXT,
    "id_document_number" TEXT,
    "id_document_url" TEXT,
    "photo_url" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admission_guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_document" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "document_type" TEXT,
    "title" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3),
    "validity_start" TIMESTAMP(3),
    "description" TEXT,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admission_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_qualification" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "qualification_level" TEXT,
    "course" TEXT,
    "session" TEXT,
    "institute" TEXT,
    "institute_address" TEXT,
    "affiliated_to" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "result" TEXT,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admission_qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "driver_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "license_number" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "vehicle_id" INTEGER,
    "pickup_time" TEXT,
    "dropoff_time" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stop" (
    "id" SERIAL NOT NULL,
    "route_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "pickup_time" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "purpose" TEXT NOT NULL,
    "whom_to_see" TEXT,
    "department" TEXT,
    "check_in_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out_time" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'CHECKED_IN',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "enquiry_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "notes" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_pass" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "pass_number" TEXT NOT NULL,
    "person_name" TEXT NOT NULL,
    "person_type" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "destination" TEXT,
    "exit_time" TIMESTAMP(3) NOT NULL,
    "expected_return" TIMESTAMP(3),
    "actual_return" TIMESTAMP(3),
    "issued_by_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_pass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reception_complaint" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "complaint_number" TEXT NOT NULL,
    "complainant_name" TEXT NOT NULL,
    "complainant_type" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "complaint_type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolved_by_id" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reception_complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_log" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "call_number" TEXT NOT NULL,
    "caller_name" TEXT NOT NULL,
    "caller_phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "recipient" TEXT,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correspondence" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "ref_number" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_address" TEXT,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "received_date" TIMESTAMP(3),
    "dispatched_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correspondence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "query_number" TEXT NOT NULL,
    "query_type" TEXT NOT NULL,
    "querier_name" TEXT NOT NULL,
    "querier_contact" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responded_by_id" INTEGER,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_message" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "parent_id" INTEGER NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_complaint" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "parent_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "complaint" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "reviewed_by_id" INTEGER,
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "actor_user_id" INTEGER,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_contest_audit" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "invoice_id" INTEGER NOT NULL,
    "actor_user_id" INTEGER,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_contest_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privilege" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privilege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_privilege" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "privilege_id" INTEGER NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_privilege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_privilege" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "privilege_id" INTEGER NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "granted_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_privilege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "type" TEXT,
    "description" TEXT,
    "headings" JSONB NOT NULL DEFAULT '[]',
    "grading_scale" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_assessment" (
    "id" SERIAL NOT NULL,
    "class_id" INTEGER NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_group_assessment" (
    "id" SERIAL NOT NULL,
    "class_group_id" INTEGER NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_group_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method" (
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

-- CreateTable
CREATE TABLE "school_bank_account" (
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

-- CreateTable
CREATE TABLE "school_template" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "class_group_name" TEXT,
    "term_name" TEXT,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_branding_school_id_key" ON "school_branding"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_id_idx" ON "user"("role_id");

-- CreateIndex
CREATE INDEX "user_school_id_idx" ON "user"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_user_id_key" ON "parent"("user_id");

-- CreateIndex
CREATE INDEX "parent_user_id_idx" ON "parent"("user_id");

-- CreateIndex
CREATE INDEX "parent_school_id_idx" ON "parent"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_user_id_key" ON "teacher"("user_id");

-- CreateIndex
CREATE INDEX "teacher_user_id_idx" ON "teacher"("user_id");

-- CreateIndex
CREATE INDEX "teacher_school_id_idx" ON "teacher"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_user_id_key" ON "student"("user_id");

-- CreateIndex
CREATE INDEX "student_user_id_idx" ON "student"("user_id");

-- CreateIndex
CREATE INDEX "student_parent_id_idx" ON "student"("parent_id");

-- CreateIndex
CREATE INDEX "student_class_id_idx" ON "student"("class_id");

-- CreateIndex
CREATE INDEX "student_school_id_idx" ON "student"("school_id");

-- CreateIndex
CREATE INDEX "student_guardian_student_id_idx" ON "student_guardian"("student_id");

-- CreateIndex
CREATE INDEX "student_guardian_parent_id_idx" ON "student_guardian"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_guardian_student_id_parent_id_key" ON "student_guardian"("student_id", "parent_id");

-- CreateIndex
CREATE INDEX "student_enrollment_student_id_idx" ON "student_enrollment"("student_id");

-- CreateIndex
CREATE INDEX "student_enrollment_session_id_idx" ON "student_enrollment"("session_id");

-- CreateIndex
CREATE INDEX "student_enrollment_term_id_idx" ON "student_enrollment"("term_id");

-- CreateIndex
CREATE INDEX "student_enrollment_class_id_idx" ON "student_enrollment"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollment_student_id_session_id_term_id_key" ON "student_enrollment"("student_id", "session_id", "term_id");

-- CreateIndex
CREATE INDEX "class_group_school_id_idx" ON "class_group"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_group_school_id_name_key" ON "class_group"("school_id", "name");

-- CreateIndex
CREATE INDEX "class_school_id_idx" ON "class"("school_id");

-- CreateIndex
CREATE INDEX "class_class_group_id_idx" ON "class"("class_group_id");

-- CreateIndex
CREATE INDEX "class_teacher_id_idx" ON "class"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_school_id_name_key" ON "class"("school_id", "name");

-- CreateIndex
CREATE INDEX "class_arm_school_id_idx" ON "class_arm"("school_id");

-- CreateIndex
CREATE INDEX "class_arm_class_id_idx" ON "class_arm"("class_id");

-- CreateIndex
CREATE INDEX "class_arm_teacher_id_idx" ON "class_arm"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_arm_class_id_name_key" ON "class_arm"("class_id", "name");

-- CreateIndex
CREATE INDEX "session_school_id_idx" ON "session"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_school_id_name_key" ON "session"("school_id", "name");

-- CreateIndex
CREATE INDEX "term_school_id_idx" ON "term"("school_id");

-- CreateIndex
CREATE INDEX "term_session_id_idx" ON "term"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "term_session_id_name_key" ON "term"("session_id", "name");

-- CreateIndex
CREATE INDEX "subject_school_id_idx" ON "subject"("school_id");

-- CreateIndex
CREATE INDEX "subject_class_id_idx" ON "subject"("class_id");

-- CreateIndex
CREATE INDEX "subject_teacher_id_idx" ON "subject"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_group_code_key" ON "fee_group"("code");

-- CreateIndex
CREATE INDEX "fee_group_school_id_idx" ON "fee_group"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_group_school_id_name_key" ON "fee_group"("school_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "fee_component_name_key" ON "fee_component"("name");

-- CreateIndex
CREATE INDEX "fee_item_school_id_idx" ON "fee_item"("school_id");

-- CreateIndex
CREATE INDEX "fee_item_fee_group_id_idx" ON "fee_item"("fee_group_id");

-- CreateIndex
CREATE INDEX "fee_item_class_id_idx" ON "fee_item"("class_id");

-- CreateIndex
CREATE INDEX "fee_item_arm_id_idx" ON "fee_item"("arm_id");

-- CreateIndex
CREATE INDEX "fee_item_session_id_idx" ON "fee_item"("session_id");

-- CreateIndex
CREATE INDEX "fee_item_term_id_idx" ON "fee_item"("term_id");

-- CreateIndex
CREATE INDEX "fee_profile_school_id_idx" ON "fee_profile"("school_id");

-- CreateIndex
CREATE INDEX "fee_profile_fee_group_id_idx" ON "fee_profile"("fee_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_profile_item_fee_profile_id_fee_component_id_key" ON "fee_profile_item"("fee_profile_id", "fee_component_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_profile_class_fee_profile_id_class_id_key" ON "fee_profile_class"("fee_profile_id", "class_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_profile_arm_fee_profile_id_arm_id_key" ON "fee_profile_arm"("fee_profile_id", "arm_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_invoice_number_key" ON "invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "invoice_school_id_idx" ON "invoice"("school_id");

-- CreateIndex
CREATE INDEX "invoice_student_id_idx" ON "invoice"("student_id");

-- CreateIndex
CREATE INDEX "invoice_term_id_idx" ON "invoice"("term_id");

-- CreateIndex
CREATE INDEX "invoice_session_id_idx" ON "invoice"("session_id");

-- CreateIndex
CREATE INDEX "invoice_parent_id_idx" ON "invoice"("parent_id");

-- CreateIndex
CREATE INDEX "invoice_class_id_idx" ON "invoice"("class_id");

-- CreateIndex
CREATE INDEX "invoice_item_invoice_id_idx" ON "invoice_item"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_item_fee_item_id_idx" ON "invoice_item"("fee_item_id");

-- CreateIndex
CREATE INDEX "payment_school_id_idx" ON "payment"("school_id");

-- CreateIndex
CREATE INDEX "payment_invoice_id_idx" ON "payment"("invoice_id");

-- CreateIndex
CREATE INDEX "payment_student_id_idx" ON "payment"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_proof_payment_id_key" ON "payment_proof"("payment_id");

-- CreateIndex
CREATE INDEX "payment_proof_school_id_idx" ON "payment_proof"("school_id");

-- CreateIndex
CREATE INDEX "payment_proof_payment_id_idx" ON "payment_proof"("payment_id");

-- CreateIndex
CREATE INDEX "payment_proof_reviewed_by_id_idx" ON "payment_proof"("reviewed_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_invoice_id_key" ON "receipt"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_receipt_number_key" ON "receipt"("receipt_number");

-- CreateIndex
CREATE INDEX "receipt_school_id_idx" ON "receipt"("school_id");

-- CreateIndex
CREATE INDEX "receipt_invoice_id_idx" ON "receipt"("invoice_id");

-- CreateIndex
CREATE INDEX "receipt_student_id_idx" ON "receipt"("student_id");

-- CreateIndex
CREATE INDEX "score_school_id_idx" ON "score"("school_id");

-- CreateIndex
CREATE INDEX "score_student_id_idx" ON "score"("student_id");

-- CreateIndex
CREATE INDEX "score_subject_id_idx" ON "score"("subject_id");

-- CreateIndex
CREATE INDEX "score_term_id_idx" ON "score"("term_id");

-- CreateIndex
CREATE INDEX "score_session_id_idx" ON "score"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "score_student_id_subject_id_term_id_session_id_key" ON "score"("student_id", "subject_id", "term_id", "session_id");

-- CreateIndex
CREATE INDEX "result_school_id_idx" ON "result"("school_id");

-- CreateIndex
CREATE INDEX "result_student_id_idx" ON "result"("student_id");

-- CreateIndex
CREATE INDEX "result_term_id_idx" ON "result"("term_id");

-- CreateIndex
CREATE INDEX "result_session_id_idx" ON "result"("session_id");

-- CreateIndex
CREATE INDEX "result_uploaded_by_id_idx" ON "result"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "result_approved_by_id_idx" ON "result"("approved_by_id");

-- CreateIndex
CREATE INDEX "result_published_by_id_idx" ON "result"("published_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "result_student_id_term_id_session_id_key" ON "result"("student_id", "term_id", "session_id");

-- CreateIndex
CREATE INDEX "attendance_school_id_idx" ON "attendance"("school_id");

-- CreateIndex
CREATE INDEX "attendance_session_id_idx" ON "attendance"("session_id");

-- CreateIndex
CREATE INDEX "attendance_term_id_idx" ON "attendance"("term_id");

-- CreateIndex
CREATE INDEX "attendance_student_id_idx" ON "attendance"("student_id");

-- CreateIndex
CREATE INDEX "attendance_class_id_idx" ON "attendance"("class_id");

-- CreateIndex
CREATE INDEX "attendance_teacher_id_idx" ON "attendance"("teacher_id");

-- CreateIndex
CREATE INDEX "attendance_date_idx" ON "attendance"("date");

-- CreateIndex
CREATE INDEX "lesson_school_id_idx" ON "lesson"("school_id");

-- CreateIndex
CREATE INDEX "lesson_subject_id_idx" ON "lesson"("subject_id");

-- CreateIndex
CREATE INDEX "lesson_teacher_id_idx" ON "lesson"("teacher_id");

-- CreateIndex
CREATE INDEX "assignment_school_id_idx" ON "assignment"("school_id");

-- CreateIndex
CREATE INDEX "assignment_teacher_id_idx" ON "assignment"("teacher_id");

-- CreateIndex
CREATE INDEX "assignment_student_id_idx" ON "assignment"("student_id");

-- CreateIndex
CREATE INDEX "quiz_school_id_idx" ON "quiz"("school_id");

-- CreateIndex
CREATE INDEX "quiz_teacher_id_idx" ON "quiz"("teacher_id");

-- CreateIndex
CREATE INDEX "online_class_school_id_idx" ON "online_class"("school_id");

-- CreateIndex
CREATE INDEX "online_class_teacher_id_idx" ON "online_class"("teacher_id");

-- CreateIndex
CREATE INDEX "announcement_school_id_idx" ON "announcement"("school_id");

-- CreateIndex
CREATE INDEX "announcement_session_id_idx" ON "announcement"("session_id");

-- CreateIndex
CREATE INDEX "announcement_term_id_idx" ON "announcement"("term_id");

-- CreateIndex
CREATE INDEX "school_setting_school_id_idx" ON "school_setting"("school_id");

-- CreateIndex
CREATE INDEX "school_setting_key_idx" ON "school_setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "school_setting_school_id_key_key" ON "school_setting"("school_id", "key");

-- CreateIndex
CREATE INDEX "school_config_version_school_id_idx" ON "school_config_version"("school_id");

-- CreateIndex
CREATE INDEX "school_config_version_is_active_idx" ON "school_config_version"("is_active");

-- CreateIndex
CREATE INDEX "income_category_school_id_idx" ON "income_category"("school_id");

-- CreateIndex
CREATE INDEX "expense_category_school_id_idx" ON "expense_category"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "income_payment_id_key" ON "income"("payment_id");

-- CreateIndex
CREATE INDEX "income_school_id_idx" ON "income"("school_id");

-- CreateIndex
CREATE INDEX "income_category_id_idx" ON "income"("category_id");

-- CreateIndex
CREATE INDEX "income_payment_id_idx" ON "income"("payment_id");

-- CreateIndex
CREATE INDEX "income_date_idx" ON "income"("date");

-- CreateIndex
CREATE INDEX "expense_school_id_idx" ON "expense"("school_id");

-- CreateIndex
CREATE INDEX "expense_category_id_idx" ON "expense"("category_id");

-- CreateIndex
CREATE INDEX "expense_date_idx" ON "expense"("date");

-- CreateIndex
CREATE UNIQUE INDEX "admission_application_applicant_number_key" ON "admission_application"("applicant_number");

-- CreateIndex
CREATE UNIQUE INDEX "admission_application_converted_student_id_key" ON "admission_application"("converted_student_id");

-- CreateIndex
CREATE INDEX "admission_application_school_id_idx" ON "admission_application"("school_id");

-- CreateIndex
CREATE INDEX "admission_application_status_idx" ON "admission_application"("status");

-- CreateIndex
CREATE INDEX "admission_application_session_id_idx" ON "admission_application"("session_id");

-- CreateIndex
CREATE INDEX "admission_guardian_application_id_idx" ON "admission_guardian"("application_id");

-- CreateIndex
CREATE INDEX "admission_document_application_id_idx" ON "admission_document"("application_id");

-- CreateIndex
CREATE INDEX "admission_qualification_application_id_idx" ON "admission_qualification"("application_id");

-- CreateIndex
CREATE INDEX "vehicle_school_id_idx" ON "vehicle"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_user_id_key" ON "driver"("user_id");

-- CreateIndex
CREATE INDEX "driver_user_id_idx" ON "driver"("user_id");

-- CreateIndex
CREATE INDEX "driver_school_id_idx" ON "driver"("school_id");

-- CreateIndex
CREATE INDEX "route_school_id_idx" ON "route"("school_id");

-- CreateIndex
CREATE INDEX "route_vehicle_id_idx" ON "route"("vehicle_id");

-- CreateIndex
CREATE INDEX "route_stop_route_id_idx" ON "route_stop"("route_id");

-- CreateIndex
CREATE INDEX "visitor_school_id_idx" ON "visitor"("school_id");

-- CreateIndex
CREATE INDEX "visitor_status_idx" ON "visitor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "enquiry_enquiry_number_key" ON "enquiry"("enquiry_number");

-- CreateIndex
CREATE INDEX "enquiry_school_id_idx" ON "enquiry"("school_id");

-- CreateIndex
CREATE INDEX "enquiry_stage_idx" ON "enquiry"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "gate_pass_pass_number_key" ON "gate_pass"("pass_number");

-- CreateIndex
CREATE INDEX "gate_pass_school_id_idx" ON "gate_pass"("school_id");

-- CreateIndex
CREATE INDEX "gate_pass_issued_by_id_idx" ON "gate_pass"("issued_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "reception_complaint_complaint_number_key" ON "reception_complaint"("complaint_number");

-- CreateIndex
CREATE INDEX "reception_complaint_school_id_idx" ON "reception_complaint"("school_id");

-- CreateIndex
CREATE INDEX "reception_complaint_resolved_by_id_idx" ON "reception_complaint"("resolved_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "call_log_call_number_key" ON "call_log"("call_number");

-- CreateIndex
CREATE INDEX "call_log_school_id_idx" ON "call_log"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "correspondence_ref_number_key" ON "correspondence"("ref_number");

-- CreateIndex
CREATE INDEX "correspondence_school_id_idx" ON "correspondence"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "query_query_number_key" ON "query"("query_number");

-- CreateIndex
CREATE INDEX "query_school_id_idx" ON "query"("school_id");

-- CreateIndex
CREATE INDEX "query_responded_by_id_idx" ON "query"("responded_by_id");

-- CreateIndex
CREATE INDEX "parent_message_school_id_idx" ON "parent_message"("school_id");

-- CreateIndex
CREATE INDEX "parent_message_parent_id_idx" ON "parent_message"("parent_id");

-- CreateIndex
CREATE INDEX "parent_complaint_school_id_idx" ON "parent_complaint"("school_id");

-- CreateIndex
CREATE INDEX "parent_complaint_parent_id_idx" ON "parent_complaint"("parent_id");

-- CreateIndex
CREATE INDEX "parent_complaint_reviewed_by_id_idx" ON "parent_complaint"("reviewed_by_id");

-- CreateIndex
CREATE INDEX "audit_log_school_id_idx" ON "audit_log"("school_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_user_id_idx" ON "audit_log"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "invoice_contest_audit_school_id_idx" ON "invoice_contest_audit"("school_id");

-- CreateIndex
CREATE INDEX "invoice_contest_audit_invoice_id_idx" ON "invoice_contest_audit"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_contest_audit_actor_user_id_idx" ON "invoice_contest_audit"("actor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "privilege_code_key" ON "privilege"("code");

-- CreateIndex
CREATE INDEX "privilege_code_idx" ON "privilege"("code");

-- CreateIndex
CREATE INDEX "privilege_category_idx" ON "privilege"("category");

-- CreateIndex
CREATE INDEX "role_privilege_role_id_idx" ON "role_privilege"("role_id");

-- CreateIndex
CREATE INDEX "role_privilege_privilege_id_idx" ON "role_privilege"("privilege_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_privilege_role_id_privilege_id_key" ON "role_privilege"("role_id", "privilege_id");

-- CreateIndex
CREATE INDEX "user_privilege_user_id_idx" ON "user_privilege"("user_id");

-- CreateIndex
CREATE INDEX "user_privilege_privilege_id_idx" ON "user_privilege"("privilege_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_privilege_user_id_privilege_id_key" ON "user_privilege"("user_id", "privilege_id");

-- CreateIndex
CREATE INDEX "assessment_school_id_idx" ON "assessment"("school_id");

-- CreateIndex
CREATE INDEX "class_assessment_class_id_idx" ON "class_assessment"("class_id");

-- CreateIndex
CREATE INDEX "class_assessment_assessment_id_idx" ON "class_assessment"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_assessment_class_id_assessment_id_key" ON "class_assessment"("class_id", "assessment_id");

-- CreateIndex
CREATE INDEX "class_group_assessment_class_group_id_idx" ON "class_group_assessment"("class_group_id");

-- CreateIndex
CREATE INDEX "class_group_assessment_assessment_id_idx" ON "class_group_assessment"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_group_assessment_class_group_id_assessment_id_key" ON "class_group_assessment"("class_group_id", "assessment_id");

-- CreateIndex
CREATE INDEX "payment_method_school_id_idx" ON "payment_method"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_school_id_code_key" ON "payment_method"("school_id", "code");

-- CreateIndex
CREATE INDEX "school_bank_account_school_id_idx" ON "school_bank_account"("school_id");

-- CreateIndex
CREATE INDEX "school_template_school_id_idx" ON "school_template"("school_id");

-- AddForeignKey
ALTER TABLE "school_branding" ADD CONSTRAINT "school_branding_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent" ADD CONSTRAINT "parent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent" ADD CONSTRAINT "parent_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher" ADD CONSTRAINT "teacher_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher" ADD CONSTRAINT "teacher_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_arm_id_fkey" FOREIGN KEY ("arm_id") REFERENCES "class_arm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardian" ADD CONSTRAINT "student_guardian_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardian" ADD CONSTRAINT "student_guardian_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollment" ADD CONSTRAINT "student_enrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollment" ADD CONSTRAINT "student_enrollment_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollment" ADD CONSTRAINT "student_enrollment_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollment" ADD CONSTRAINT "student_enrollment_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class" ADD CONSTRAINT "class_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class" ADD CONSTRAINT "class_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class" ADD CONSTRAINT "class_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm" ADD CONSTRAINT "class_arm_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm" ADD CONSTRAINT "class_arm_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm" ADD CONSTRAINT "class_arm_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term" ADD CONSTRAINT "term_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term" ADD CONSTRAINT "term_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_group" ADD CONSTRAINT "fee_group_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_item" ADD CONSTRAINT "fee_item_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_item" ADD CONSTRAINT "fee_item_fee_group_id_fkey" FOREIGN KEY ("fee_group_id") REFERENCES "fee_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_item" ADD CONSTRAINT "fee_item_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_item" ADD CONSTRAINT "fee_item_arm_id_fkey" FOREIGN KEY ("arm_id") REFERENCES "class_arm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_item" ADD CONSTRAINT "fee_item_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_item" ADD CONSTRAINT "fee_item_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_profile" ADD CONSTRAINT "fee_profile_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_profile" ADD CONSTRAINT "fee_profile_fee_group_id_fkey" FOREIGN KEY ("fee_group_id") REFERENCES "fee_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_profile" ADD CONSTRAINT "fee_profile_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_profile" ADD CONSTRAINT "fee_profile_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_profile_item" ADD CONSTRAINT "fee_profile_item_fee_profile_id_fkey" FOREIGN KEY ("fee_profile_id") REFERENCES "fee_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_profile_item" ADD CONSTRAINT "fee_profile_item_fee_component_id_fkey" FOREIGN KEY ("fee_component_id") REFERENCES "fee_component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_profile_class" ADD CONSTRAINT "fee_profile_class_fee_profile_id_fkey" FOREIGN KEY ("fee_profile_id") REFERENCES "fee_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_profile_class" ADD CONSTRAINT "fee_profile_class_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_profile_arm" ADD CONSTRAINT "fee_profile_arm_fee_profile_id_fkey" FOREIGN KEY ("fee_profile_id") REFERENCES "fee_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_profile_arm" ADD CONSTRAINT "fee_profile_arm_arm_id_fkey" FOREIGN KEY ("arm_id") REFERENCES "class_arm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_fee_item_id_fkey" FOREIGN KEY ("fee_item_id") REFERENCES "fee_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proof" ADD CONSTRAINT "payment_proof_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proof" ADD CONSTRAINT "payment_proof_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proof" ADD CONSTRAINT "payment_proof_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result" ADD CONSTRAINT "result_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result" ADD CONSTRAINT "result_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result" ADD CONSTRAINT "result_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result" ADD CONSTRAINT "result_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result" ADD CONSTRAINT "result_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result" ADD CONSTRAINT "result_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result" ADD CONSTRAINT "result_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_class" ADD CONSTRAINT "online_class_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_class" ADD CONSTRAINT "online_class_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_class" ADD CONSTRAINT "online_class_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_class" ADD CONSTRAINT "online_class_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_setting" ADD CONSTRAINT "school_setting_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_config_version" ADD CONSTRAINT "school_config_version_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_category" ADD CONSTRAINT "income_category_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_category" ADD CONSTRAINT "expense_category_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "income_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_application" ADD CONSTRAINT "admission_application_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_application" ADD CONSTRAINT "admission_application_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_application" ADD CONSTRAINT "admission_application_applying_for_class_id_fkey" FOREIGN KEY ("applying_for_class_id") REFERENCES "class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_application" ADD CONSTRAINT "admission_application_converted_student_id_fkey" FOREIGN KEY ("converted_student_id") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_guardian" ADD CONSTRAINT "admission_guardian_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "admission_application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_document" ADD CONSTRAINT "admission_document_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "admission_application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_qualification" ADD CONSTRAINT "admission_qualification_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "admission_application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver" ADD CONSTRAINT "driver_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver" ADD CONSTRAINT "driver_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route" ADD CONSTRAINT "route_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route" ADD CONSTRAINT "route_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stop" ADD CONSTRAINT "route_stop_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor" ADD CONSTRAINT "visitor_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry" ADD CONSTRAINT "enquiry_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_pass" ADD CONSTRAINT "gate_pass_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_pass" ADD CONSTRAINT "gate_pass_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_complaint" ADD CONSTRAINT "reception_complaint_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_complaint" ADD CONSTRAINT "reception_complaint_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_log" ADD CONSTRAINT "call_log_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correspondence" ADD CONSTRAINT "correspondence_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query" ADD CONSTRAINT "query_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query" ADD CONSTRAINT "query_responded_by_id_fkey" FOREIGN KEY ("responded_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_message" ADD CONSTRAINT "parent_message_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_message" ADD CONSTRAINT "parent_message_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_complaint" ADD CONSTRAINT "parent_complaint_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_complaint" ADD CONSTRAINT "parent_complaint_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_complaint" ADD CONSTRAINT "parent_complaint_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_contest_audit" ADD CONSTRAINT "invoice_contest_audit_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_contest_audit" ADD CONSTRAINT "invoice_contest_audit_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_contest_audit" ADD CONSTRAINT "invoice_contest_audit_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_privilege" ADD CONSTRAINT "role_privilege_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_privilege" ADD CONSTRAINT "role_privilege_privilege_id_fkey" FOREIGN KEY ("privilege_id") REFERENCES "privilege"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_privilege" ADD CONSTRAINT "user_privilege_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_privilege" ADD CONSTRAINT "user_privilege_privilege_id_fkey" FOREIGN KEY ("privilege_id") REFERENCES "privilege"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assessment" ADD CONSTRAINT "class_assessment_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assessment" ADD CONSTRAINT "class_assessment_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_group_assessment" ADD CONSTRAINT "class_group_assessment_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_group_assessment" ADD CONSTRAINT "class_group_assessment_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_bank_account" ADD CONSTRAINT "school_bank_account_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_template" ADD CONSTRAINT "school_template_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints previously enforced by the runtime /api/admin/migrate endpoint
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_code_check" CHECK ("code" IN ('CASH', 'CHEQUE', 'POS', 'CARD', 'BANK_TRANSFER'));
ALTER TABLE "school_template" ADD CONSTRAINT "school_template_type_check" CHECK ("type" IN ('REPORT_CARD', 'INVOICE', 'RECEIPT'));
ALTER TABLE "school_template" ADD CONSTRAINT "school_template_file_type_check" CHECK ("file_type" IN ('pdf', 'excel', 'word'));
