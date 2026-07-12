-- Admissions module tables
-- Tracks applications from submission through enrollment

CREATE TABLE IF NOT EXISTS admission_application (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL DEFAULT 'default',
    applicant_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    date_of_birth DATE,
    age INTEGER CHECK (age >= 3 AND age <= 30),
    address TEXT,
    previous_school TEXT,
    previous_class TEXT,
    applying_for_class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,
    parent_name TEXT,
    parent_email TEXT,
    parent_phone TEXT,
    parent_relationship TEXT,
    sport_house TEXT,
    co_curricular TEXT,
    responsibilities TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'TESTED', 'INTERVIEWED', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
    test_score INTEGER CHECK (test_score >= 0 AND test_score <= 100),
    interview_notes TEXT,
    converted_student_id INTEGER REFERENCES student(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admission_status ON admission_application(status);
CREATE INDEX IF NOT EXISTS idx_admission_school ON admission_application(school_id);
CREATE INDEX IF NOT EXISTS idx_admission_created ON admission_application(created_at DESC);

-- Ensure status defaults to PENDING on existing rows
UPDATE admission_application SET status = 'PENDING' WHERE status IS NULL OR status = '';
