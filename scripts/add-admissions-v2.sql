-- Admissions module tables v2

-- Drop old version if exists without data
DROP TABLE IF EXISTS admission_guardian CASCADE;
DROP TABLE IF EXISTS admission_application CASCADE;

CREATE TABLE admission_application (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL DEFAULT 'default',
    session_id INTEGER REFERENCES session(id) ON DELETE SET NULL,
    applicant_number TEXT UNIQUE NOT NULL,
    enrollment_type TEXT CHECK (enrollment_type IN ('PRIVATE', 'REGULAR')) DEFAULT 'REGULAR',
    date_of_registration DATE DEFAULT CURRENT_DATE,

    -- Student info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    email TEXT NOT NULL,
    contact_number TEXT,
    gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    date_of_birth DATE,
    age INTEGER CHECK (age >= 3 AND age <= 30),
    address TEXT,
    previous_institute TEXT,
    previous_class TEXT,
    applying_for_class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,

    -- Pipeline
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'TESTED', 'INTERVIEWED', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
    test_score INTEGER CHECK (test_score >= 0 AND test_score <= 100),
    interview_notes TEXT,
    notes TEXT,
    last_school_report_url TEXT,

    -- Converted student
    converted_student_id INTEGER REFERENCES student(id) ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admission_status ON admission_application(status);
CREATE INDEX idx_admission_school ON admission_application(school_id);
CREATE INDEX idx_admission_created ON admission_application(created_at DESC);
CREATE INDEX idx_admission_session ON admission_application(session_id);

-- Guardians linked to an application
CREATE TABLE admission_guardian (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES admission_application(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    contact_number TEXT,
    relationship TEXT NOT NULL,
    is_new BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admission_guardian_app ON admission_guardian(application_id);
