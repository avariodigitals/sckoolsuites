-- Create notification_record table for persistent notifications with read tracking
CREATE TABLE "notification_record" (
    "id" SERIAL PRIMARY KEY,
    "school_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "actor_user_id" INTEGER,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE "notification_record" ADD CONSTRAINT "notification_record_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "notification_record" ADD CONSTRAINT "notification_record_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL;

-- Add indexes
CREATE INDEX "notification_record_user_id_is_read_idx" ON "notification_record"("user_id", "is_read");
CREATE INDEX "notification_record_school_id_idx" ON "notification_record"("school_id");
CREATE INDEX "notification_record_created_at_idx" ON "notification_record"("created_at");
