-- Templates table for school document templates (Report Card, Invoice, Receipt)
CREATE TABLE IF NOT EXISTS school_template (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('REPORT_CARD', 'INVOICE', 'RECEIPT')),
    class_group_name TEXT,
    term_name TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'excel', 'word')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drop old unique constraint if it exists (migration from previous version)
ALTER TABLE school_template DROP CONSTRAINT IF EXISTS school_template_school_id_type_key;
