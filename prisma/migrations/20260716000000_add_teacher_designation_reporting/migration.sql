-- AlterTable: Add designation, reports_to_id, class_group_id to teacher table
ALTER TABLE "teacher" ADD COLUMN "designation" TEXT;
ALTER TABLE "teacher" ADD COLUMN "reports_to_id" INTEGER;
ALTER TABLE "teacher" ADD COLUMN "class_group_id" INTEGER;

-- Add self-referencing foreign key for teacher reporting structure
ALTER TABLE "teacher" ADD CONSTRAINT "teacher_reports_to_id_fkey" FOREIGN KEY ("reports_to_id") REFERENCES "teacher"("id") ON DELETE SET NULL;

-- Add foreign key for class group
ALTER TABLE "teacher" ADD CONSTRAINT "teacher_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_group"("id") ON DELETE SET NULL;

-- Create indexes
CREATE INDEX "idx_teacher_reports_to" ON "teacher"("reports_to_id");
CREATE INDEX "idx_teacher_class_group" ON "teacher"("class_group_id");
