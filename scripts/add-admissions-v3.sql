-- Admissions module tables v3 - Add Photo, Contact, Document, Qualification fields

-- Add new columns to admission_application
ALTER TABLE admission_application
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS alternate_contact_number TEXT,
  ADD COLUMN IF NOT EXISTS alternate_email TEXT,
  ADD COLUMN IF NOT EXISTS birth_place TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS mother_tongue TEXT,
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS present_address JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS permanent_address JSONB DEFAULT '{}';

-- Documents linked to an application
CREATE TABLE IF NOT EXISTS admission_document (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES admission_application(id) ON DELETE CASCADE,
    document_type TEXT,
    title TEXT NOT NULL,
    issue_date DATE,
    validity_start DATE,
    description TEXT,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admission_document_app ON admission_document(application_id);

-- Qualifications linked to an application
CREATE TABLE IF NOT EXISTS admission_qualification (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES admission_application(id) ON DELETE CASCADE,
    qualification_level TEXT,
    course TEXT,
    session TEXT,
    institute TEXT,
    institute_address TEXT,
    affiliated_to TEXT,
    start_date DATE,
    end_date DATE,
    result TEXT,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admission_qualification_app ON admission_qualification(application_id);
