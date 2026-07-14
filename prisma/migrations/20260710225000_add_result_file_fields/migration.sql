-- Add fields to support teacher-uploaded result PDFs
ALTER TABLE "result" ADD COLUMN IF NOT EXISTS "file_url" TEXT;
ALTER TABLE "result" ADD COLUMN IF NOT EXISTS "file_name" TEXT;
ALTER TABLE "result" ADD COLUMN IF NOT EXISTS "uploaded_by_id" INTEGER;

CREATE INDEX IF NOT EXISTS "result_uploaded_by_id_idx" ON "result"("uploaded_by_id");

-- Add explicit foreign-key relation for uploaded_by_id (Prisma will manage this, but included for safety if needed)
-- ALTER TABLE "result" ADD CONSTRAINT "result_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
