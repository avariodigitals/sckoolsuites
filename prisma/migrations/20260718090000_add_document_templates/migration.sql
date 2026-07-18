-- AlterTable: Add field_config and eligible_class_groups to school_template (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_template' AND column_name = 'field_config') THEN
    ALTER TABLE "school_template" ADD COLUMN "field_config" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_template' AND column_name = 'eligible_class_groups') THEN
    ALTER TABLE "school_template" ADD COLUMN "eligible_class_groups" TEXT;
  END IF;
END $$;

-- Drop old check constraint and add new one with extended types (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_template_type_check') THEN
    ALTER TABLE "school_template" DROP CONSTRAINT "school_template_type_check";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_template_type_check') THEN
    ALTER TABLE "school_template" ADD CONSTRAINT "school_template_type_check" CHECK ("type" IN ('REPORT_CARD', 'INVOICE', 'RECEIPT', 'ID_CARD', 'CERTIFICATE', 'TRANSCRIPT', 'AWARD', 'TESTIMONIAL'));
  END IF;
END $$;

-- CreateTable: student_document (idempotent)
CREATE TABLE IF NOT EXISTS "student_document" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "description" TEXT,
    "uploaded_by_id" INTEGER,
    "template_id" INTEGER,
    "field_data" TEXT,
    "status" TEXT DEFAULT 'FINALIZED',
    "parent_viewable" BOOLEAN NOT NULL DEFAULT false,
    "parent_downloadable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "student_document_school_id_idx" ON "student_document"("school_id");
CREATE INDEX IF NOT EXISTS "student_document_student_id_idx" ON "student_document"("student_id");
CREATE INDEX IF NOT EXISTS "student_document_template_id_idx" ON "student_document"("template_id");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_document_school_id_fkey') THEN
    ALTER TABLE "student_document" ADD CONSTRAINT "student_document_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_document_student_id_fkey') THEN
    ALTER TABLE "student_document" ADD CONSTRAINT "student_document_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_document_uploaded_by_id_fkey') THEN
    ALTER TABLE "student_document" ADD CONSTRAINT "student_document_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_document_template_id_fkey') THEN
    ALTER TABLE "student_document" ADD CONSTRAINT "student_document_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "school_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
