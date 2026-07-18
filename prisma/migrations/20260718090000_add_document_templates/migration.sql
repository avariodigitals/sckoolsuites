-- AlterTable: Add field_config and eligible_class_groups to school_template
ALTER TABLE "school_template" ADD COLUMN "field_config" TEXT;
ALTER TABLE "school_template" ADD COLUMN "eligible_class_groups" TEXT;

-- AlterTable: Add template_id, field_data, status, parent_viewable, parent_downloadable to student_document
ALTER TABLE "student_document" ADD COLUMN "template_id" INTEGER;
ALTER TABLE "student_document" ADD COLUMN "field_data" TEXT;
ALTER TABLE "student_document" ADD COLUMN "status" TEXT DEFAULT 'FINALIZED';
ALTER TABLE "student_document" ADD COLUMN "parent_viewable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "student_document" ADD COLUMN "parent_downloadable" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey: student_document.template_id -> school_template.id
ALTER TABLE "student_document" ADD CONSTRAINT "student_document_template_id_fkey" 
  FOREIGN KEY ("template_id") REFERENCES "school_template"("id") ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "student_document_template_id_idx" ON "student_document"("template_id");
