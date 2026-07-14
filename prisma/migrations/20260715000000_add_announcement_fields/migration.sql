-- Add new fields to announcement table for rich text editor, email sending, and attachments
ALTER TABLE "announcement" ADD COLUMN "is_html" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "announcement" ADD COLUMN "send_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "announcement" ADD COLUMN "attachment_url" TEXT;
ALTER TABLE "announcement" ADD COLUMN "attachment_name" VARCHAR(255);
