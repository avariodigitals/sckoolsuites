-- Assessment tables for EYFS / Early Beginners
-- Run with: psql "$DATABASE_URL" -f scripts/add-assessment-tables.sql

-- 1. Master assessment list (headings = JSON array of assessment areas)
CREATE TABLE IF NOT EXISTS assessment (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    headings JSONB NOT NULL DEFAULT '[]'::jsonb,
    grading_scale JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Link assessments to class groups (affects all classes in group)
CREATE TABLE IF NOT EXISTS class_group_assessment (
    id SERIAL PRIMARY KEY,
    class_group_id INTEGER NOT NULL REFERENCES class_group(id) ON DELETE CASCADE,
    assessment_id INTEGER NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(class_group_id, assessment_id)
);

-- 3. Link assessments to specific classes (overrides/adds to group)
CREATE TABLE IF NOT EXISTS class_assessment (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES class(id) ON DELETE CASCADE,
    assessment_id INTEGER NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(class_id, assessment_id)
);
