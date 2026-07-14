-- Create SchoolEvent table
CREATE TABLE "school_event" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL DEFAULT 'default',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_type" TEXT NOT NULL DEFAULT 'general',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "location" TEXT,
    "is_all_day" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_event_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "school_event_school_id_idx" ON "school_event"("school_id");
CREATE INDEX "school_event_start_date_idx" ON "school_event"("start_date");
CREATE INDEX "school_event_event_type_idx" ON "school_event"("event_type");

-- Add foreign key constraints
ALTER TABLE "school_event" ADD CONSTRAINT "school_event_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE;
ALTER TABLE "school_event" ADD CONSTRAINT "school_event_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;
