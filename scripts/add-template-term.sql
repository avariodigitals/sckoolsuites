-- Add term_name column to school_template for term-specific templates (e.g., First Term, Second Term, Third Term Report Cards)
ALTER TABLE school_template ADD COLUMN IF NOT EXISTS term_name TEXT;
