-- AlterTable: Add firstName, middleName, lastName to student table
-- firstName and lastName are NOT NULL; middleName is nullable
-- Backfill from user.name for existing rows, then enforce NOT NULL

ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "middle_name" TEXT;
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "last_name" TEXT;

-- Backfill: split user.name into first/middle/last for existing students
UPDATE "student" s
SET
  "first_name" = COALESCE(
    "first_name",
    CASE
      WHEN array_length(string_to_array(u."name", ' '), 1) >= 1
      THEN split_part(u."name", ' ', 1)
      ELSE 'Unknown'
    END
  ),
  "middle_name" = COALESCE(
    "middle_name",
    CASE
      WHEN array_length(string_to_array(u."name", ' '), 1) >= 3
      THEN array_to_string(
        (string_to_array(u."name", ' '))[2 : array_length(string_to_array(u."name", ' '), 1) - 1],
        ' '
      )
      ELSE NULL
    END
  ),
  "last_name" = COALESCE(
    "last_name",
    CASE
      WHEN array_length(string_to_array(u."name", ' '), 1) >= 2
      THEN split_part(u."name", ' ', array_length(string_to_array(u."name", ' '), 1))
      ELSE 'Unknown'
    END
  )
FROM "user" u
WHERE s."user_id" = u."id";

-- Set defaults for any rows that still have NULL first_name or last_name
UPDATE "student" SET "first_name" = 'Unknown' WHERE "first_name" IS NULL;
UPDATE "student" SET "last_name" = 'Unknown' WHERE "last_name" IS NULL;

-- Now enforce NOT NULL (wrap in DO block in case already NOT NULL)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student' AND column_name = 'first_name' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "student" ALTER COLUMN "first_name" SET NOT NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student' AND column_name = 'last_name' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "student" ALTER COLUMN "last_name" SET NOT NULL;
  END IF;
END $$;
