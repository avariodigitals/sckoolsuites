-- AlterTable: Add designation, reports_to_id, class_group_id to teacher table
ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "designation" TEXT;
ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "reports_to_id" INTEGER;
ALTER TABLE "teacher" ADD COLUMN IF NOT EXISTS "class_group_id" INTEGER;

-- Add self-referencing foreign key for teacher reporting structure
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_reports_to_id_fkey') THEN
    ALTER TABLE "teacher" ADD CONSTRAINT "teacher_reports_to_id_fkey" FOREIGN KEY ("reports_to_id") REFERENCES "teacher"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key for class group
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_class_group_id_fkey') THEN
    ALTER TABLE "teacher" ADD CONSTRAINT "teacher_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_group"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_teacher_reports_to" ON "teacher"("reports_to_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_class_group" ON "teacher"("class_group_id");
