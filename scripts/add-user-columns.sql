-- Add phone and address columns to user table (safe migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user' AND column_name = 'phone'
    ) THEN
        ALTER TABLE "user" ADD COLUMN phone TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user' AND column_name = 'address'
    ) THEN
        ALTER TABLE "user" ADD COLUMN address TEXT;
    END IF;
END $$;
