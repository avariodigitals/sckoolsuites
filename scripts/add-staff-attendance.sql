-- Staff Attendance table for clock-in/clock-out with face capture, geo, and timestamp
CREATE TABLE IF NOT EXISTS "staff_attendance" (
  "id" SERIAL PRIMARY KEY,
  "school_id" TEXT NOT NULL DEFAULT 'default',
  "user_id" INTEGER NOT NULL,
  "teacher_id" INTEGER,
  "type" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "face_photo_url" TEXT,
  "ip_address" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "staff_attendance_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id"),
  CONSTRAINT "staff_attendance_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "staff_attendance_user_id_idx" ON "staff_attendance"("user_id");
CREATE INDEX IF NOT EXISTS "staff_attendance_school_id_idx" ON "staff_attendance"("school_id");
CREATE INDEX IF NOT EXISTS "staff_attendance_teacher_id_idx" ON "staff_attendance"("teacher_id");
CREATE INDEX IF NOT EXISTS "staff_attendance_timestamp_idx" ON "staff_attendance"("timestamp");
CREATE INDEX IF NOT EXISTS "staff_attendance_type_idx" ON "staff_attendance"("type");
