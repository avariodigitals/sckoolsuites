-- Add student_guardian junction table for multiple guardians per student
-- Also add passport_url update capability to existing tables

-- Junction table for additional guardians (beyond the primary parent_id on student)
CREATE TABLE IF NOT EXISTS student_guardian (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    parent_id INTEGER NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
    relationship TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, parent_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_student_guardian_student ON student_guardian(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardian_parent ON student_guardian(parent_id);
