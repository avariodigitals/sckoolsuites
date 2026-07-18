-- AlterTable: Add field_config and eligible_class_groups to school_template
ALTER TABLE "school_template" ADD COLUMN "field_config" TEXT;
ALTER TABLE "school_template" ADD COLUMN "eligible_class_groups" TEXT;

-- Drop old check constraint and add new one with extended types
ALTER TABLE "school_template" DROP CONSTRAINT "school_template_type_check";
ALTER TABLE "school_template" ADD CONSTRAINT "school_template_type_check" CHECK ("type" IN ('REPORT_CARD', 'INVOICE', 'RECEIPT', 'ID_CARD', 'CERTIFICATE', 'TRANSCRIPT', 'AWARD', 'TESTIMONIAL'));

-- CreateTable: student_document (table does not exist yet)
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "student_document_school_id_idx" ON "student_document"("school_id");
CREATE INDEX IF NOT EXISTS "student_document_student_id_idx" ON "student_document"("student_id");
CREATE INDEX IF NOT EXISTS "student_document_template_id_idx" ON "student_document"("template_id");

-- AddForeignKey
ALTER TABLE "student_document" ADD CONSTRAINT "student_document_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON UPDATE CASCADE;
ALTER TABLE "student_document" ADD CONSTRAINT "student_document_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_document" ADD CONSTRAINT "student_document_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_document" ADD CONSTRAINT "student_document_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "school_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
