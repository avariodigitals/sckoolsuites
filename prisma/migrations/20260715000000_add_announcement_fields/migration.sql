-- Add new fields to announcement table for rich text editor, email sending, and attachments
ALTER TABLE "announcement" ADD COLUMN IF NOT EXISTS "is_html" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "announcement" ADD COLUMN IF NOT EXISTS "send_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "announcement" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;
ALTER TABLE "announcement" ADD COLUMN IF NOT EXISTS "attachment_name" VARCHAR(255);
