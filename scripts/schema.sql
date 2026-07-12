-- =============================================================================
-- DEPRECATED — Historical Reference Only
-- =============================================================================
-- This file is no longer used to provision databases. It is kept as a
-- historical reference of the hand-written schema that existed before the
-- repository adopted Prisma Migrate as the single source of truth.
--
-- To provision a new database, use:
--   npm run db:setup
--   or
--   npx prisma generate
--   npx prisma migrate deploy
--   npx prisma db seed
--
-- DO NOT RUN THIS FILE AGAINST PRODUCTION OR DEVELOPMENT DATABASES.
-- =============================================================================

-- Sckool Suite - Single School Database Schema
-- PostgreSQL Raw SQL Schema (historical)

-- Drop tables if they exist (clean slate)
DROP TABLE IF EXISTS query CASCADE;
DROP TABLE IF EXISTS correspondence CASCADE;
DROP TABLE IF EXISTS call_log CASCADE;
DROP TABLE IF EXISTS reception_complaint CASCADE;
DROP TABLE IF EXISTS gate_pass CASCADE;
DROP TABLE IF EXISTS enquiry CASCADE;
DROP TABLE IF EXISTS visitor CASCADE;
DROP TABLE IF EXISTS route_stop CASCADE;
DROP TABLE IF EXISTS route CASCADE;
DROP TABLE IF EXISTS driver CASCADE;
DROP TABLE IF EXISTS vehicle CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS parent_complaint CASCADE;
DROP TABLE IF EXISTS parent_message CASCADE;
DROP TABLE IF EXISTS user_privilege CASCADE;
DROP TABLE IF EXISTS role_privilege CASCADE;
DROP TABLE IF EXISTS privilege CASCADE;
DROP TABLE IF EXISTS school_config_version CASCADE;
DROP TABLE IF EXISTS expense CASCADE;
DROP TABLE IF EXISTS income CASCADE;
DROP TABLE IF EXISTS expense_category CASCADE;
DROP TABLE IF EXISTS income_category CASCADE;
DROP TABLE IF EXISTS school_setting CASCADE;
DROP TABLE IF EXISTS announcement CASCADE;
DROP TABLE IF EXISTS online_class CASCADE;
DROP TABLE IF EXISTS quiz CASCADE;
DROP TABLE IF EXISTS assignment CASCADE;
DROP TABLE IF EXISTS lesson CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS result CASCADE;
DROP TABLE IF EXISTS score CASCADE;
DROP TABLE IF EXISTS receipt CASCADE;
DROP TABLE IF EXISTS payment_proof CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS invoice_item CASCADE;
DROP TABLE IF EXISTS invoice CASCADE;
DROP TABLE IF EXISTS fee_profile_arm CASCADE;
DROP TABLE IF EXISTS fee_profile_class CASCADE;
DROP TABLE IF EXISTS fee_profile_item CASCADE;
DROP TABLE IF EXISTS fee_profile CASCADE;
DROP TABLE IF EXISTS fee_component CASCADE;
DROP TABLE IF EXISTS fee_item CASCADE;
DROP TABLE IF EXISTS fee_group CASCADE;
DROP TABLE IF EXISTS term CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS subject CASCADE;
DROP TABLE IF EXISTS class_arm CASCADE;
DROP TABLE IF EXISTS class CASCADE;
DROP TABLE IF EXISTS class_group CASCADE;
DROP TABLE IF EXISTS student_enrollment CASCADE;
DROP TABLE IF EXISTS student CASCADE;
DROP TABLE IF EXISTS teacher CASCADE;
DROP TABLE IF EXISTS parent CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS role CASCADE;
DROP TABLE IF EXISTS school_branding CASCADE;
DROP TABLE IF EXISTS school CASCADE;

-- Enum types as CHECK constraints or separate tables
-- We'll use TEXT with CHECK constraints for simplicity

-- School (Singleton - only one record)
CREATE TABLE school (
    id TEXT PRIMARY KEY DEFAULT 'default',
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    website TEXT,
    motto TEXT,
    is_active BOOLEAN DEFAULT true,
    is_setup BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- School Branding
CREATE TABLE school_branding (
    id SERIAL PRIMARY KEY,
    school_id TEXT UNIQUE DEFAULT 'default' REFERENCES school(id) ON DELETE CASCADE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0B1F4D',
    secondary_color TEXT DEFAULT '#0E9F6E',
    report_card_theme TEXT DEFAULT 'classic',
    invoice_theme TEXT DEFAULT 'clean',
    receipt_theme TEXT DEFAULT 'simple',
    bank_name TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    bank_instructions TEXT,
    principal_signature TEXT,
    teacher_signature TEXT,
    school_stamp TEXT,
    report_header_text TEXT,
    receipt_footer_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles
CREATE TABLE role (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL CHECK (name IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_OF_SCHOOL', 'PRINCIPAL', 'ACCOUNTANT', 'REGISTRAR', 'TEACHER', 'PARENT', 'STUDENT', 'RECEPTIONIST')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES role(id),
    name TEXT NOT NULL,
    avatar_url TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parents
CREATE TABLE parent (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teachers
CREATE TABLE teacher (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students
CREATE TABLE student (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES parent(id) ON DELETE SET NULL,
    teacher_id INTEGER REFERENCES teacher(id) ON DELETE SET NULL,
    class_id INTEGER,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL,
    sport_house TEXT,
    passport_url TEXT,
    co_curricular TEXT,
    responsibilities TEXT,
    route_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Enrollment (session/term scoped with promotion status)
CREATE TABLE student_enrollment (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    term_id INTEGER NOT NULL,
    class_id INTEGER,
    promotion_status TEXT DEFAULT 'ACTIVE' CHECK (promotion_status IN ('PROMOTED', 'REPEATING', 'WITHDRAWN', 'ACTIVE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, session_id, term_id)
);

-- Class Groups
CREATE TABLE class_group (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classes
CREATE TABLE class (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    class_group_id INTEGER REFERENCES class_group(id) ON DELETE SET NULL,
    class_teacher TEXT,
    teacher_id INTEGER REFERENCES teacher(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign keys after dependent tables exist
ALTER TABLE student ADD FOREIGN KEY (class_id) REFERENCES class(id) ON DELETE SET NULL;
ALTER TABLE student_enrollment ADD FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE;

-- Class Arms
CREATE TABLE class_arm (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES class(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, name)
);

-- Academic Sessions
CREATE TABLE session (
    id SERIAL PRIMARY KEY,
    school_id TEXT DEFAULT 'default' REFERENCES school(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE(school_id, name),
    is_current BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Terms
CREATE TABLE term (
    id SERIAL PRIMARY KEY,
    school_id TEXT DEFAULT 'default' REFERENCES school(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_current BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED')),
    start_date DATE,
    end_date DATE,
    resumption_date DATE,
    break_dates JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, name)
);

-- Add remaining student_enrollment foreign keys
ALTER TABLE student_enrollment ADD FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE;
ALTER TABLE student_enrollment ADD FOREIGN KEY (term_id) REFERENCES term(id) ON DELETE CASCADE;
ALTER TABLE student_enrollment ADD FOREIGN KEY (class_id) REFERENCES class(id) ON DELETE SET NULL;

-- Subjects
CREATE TABLE subject (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,
    class_names TEXT,
    class_group_id INTEGER REFERENCES class_group(id) ON DELETE SET NULL,
    class_group_names TEXT,
    teacher_id INTEGER REFERENCES teacher(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fee Groups
CREATE TABLE fee_group (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fee Components
CREATE TABLE fee_component (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fee Items
CREATE TABLE fee_item (
    id SERIAL PRIMARY KEY,
    fee_group_id INTEGER NOT NULL REFERENCES fee_group(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,
    arm_id INTEGER REFERENCES class_arm(id) ON DELETE SET NULL,
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    term_id INTEGER NOT NULL REFERENCES term(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    is_optional BOOLEAN DEFAULT false,
    due_date DATE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fee Profiles
CREATE TABLE fee_profile (
    id SERIAL PRIMARY KEY,
    fee_group_id INTEGER NOT NULL REFERENCES fee_group(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    term_id INTEGER NOT NULL REFERENCES term(id) ON DELETE CASCADE,
    due_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fee Profile Items
CREATE TABLE fee_profile_item (
    id SERIAL PRIMARY KEY,
    fee_profile_id INTEGER NOT NULL REFERENCES fee_profile(id) ON DELETE CASCADE,
    fee_component_id INTEGER NOT NULL REFERENCES fee_component(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    is_optional BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fee_profile_id, fee_component_id)
);

-- Fee Profile Classes (junction)
CREATE TABLE fee_profile_class (
    id SERIAL PRIMARY KEY,
    fee_profile_id INTEGER NOT NULL REFERENCES fee_profile(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES class(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fee_profile_id, class_id)
);

-- Fee Profile Arms (junction)
CREATE TABLE fee_profile_arm (
    id SERIAL PRIMARY KEY,
    fee_profile_id INTEGER NOT NULL REFERENCES fee_profile(id) ON DELETE CASCADE,
    arm_id INTEGER NOT NULL REFERENCES class_arm(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fee_profile_id, arm_id)
);

-- Invoices
CREATE TABLE invoice (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES parent(id) ON DELETE SET NULL,
    class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,
    term_id INTEGER NOT NULL REFERENCES term(id) ON DELETE RESTRICT,
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE RESTRICT,
    invoice_number TEXT UNIQUE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PART_PAYMENT', 'PAID', 'PENDING', 'REVERSED')),
    payment_instructions TEXT,
    created_by_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE
);

-- Invoice Items
CREATE TABLE invoice_item (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
    fee_item_id INTEGER NOT NULL REFERENCES fee_item(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL
);

-- Payments
CREATE TABLE payment (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('UNPAID', 'PART_PAYMENT', 'PAID', 'PENDING', 'REVERSED')),
    confirmed_at TIMESTAMP,
    received_by_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Proofs
CREATE TABLE payment_proof (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER UNIQUE NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
    bank_name TEXT,
    transaction_reference TEXT NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    proof_url TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    review_note TEXT,
    reviewed_by_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Receipts
CREATE TABLE receipt (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER UNIQUE NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES parent(id) ON DELETE SET NULL,
    receipt_number TEXT UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balance DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    received_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scores
CREATE TABLE score (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subject(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teacher(id) ON DELETE SET NULL,
    term_id INTEGER NOT NULL REFERENCES term(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    ca_score DECIMAL(5, 2) NOT NULL,
    exam_score DECIMAL(5, 2) NOT NULL,
    total DECIMAL(5, 2) NOT NULL,
    grade TEXT NOT NULL,
    gpa DECIMAL(3, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id, term_id, session_id)
);

-- Results
CREATE TABLE result (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    term_id INTEGER NOT NULL REFERENCES term(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    cumulative_total DECIMAL(10, 2),
    average DECIMAL(5, 2),
    term_percentage DECIMAL(5, 2),
    term_grade TEXT,
    term_gpa DECIMAL(3, 2),
    class_teacher_comment TEXT,
    principal_comment TEXT,
    attendance_present INTEGER DEFAULT 0,
    attendance_total INTEGER DEFAULT 0,
    cognitive_assessment TEXT,
    affective_assessment TEXT,
    psychomotor_assessment TEXT,
    next_term_resumption DATE,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'PUBLISHED', 'REJECTED')),
    review_note TEXT,
    approved_by_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    published_by_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, term_id, session_id)
);

-- Attendance
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    term_id INTEGER NOT NULL REFERENCES term(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,
    teacher_id INTEGER REFERENCES teacher(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons
CREATE TABLE lesson (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,
    subject_id INTEGER NOT NULL REFERENCES subject(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES teacher(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments
CREATE TABLE assignment (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES lesson(id) ON DELETE SET NULL,
    class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,
    subject_id INTEGER REFERENCES subject(id) ON DELETE SET NULL,
    teacher_id INTEGER NOT NULL REFERENCES teacher(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instruction TEXT NOT NULL,
    due_date TIMESTAMP NOT NULL,
    student_id INTEGER REFERENCES student(id) ON DELETE SET NULL,
    submission_note TEXT,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes
CREATE TABLE quiz (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,
    subject_id INTEGER REFERENCES subject(id) ON DELETE SET NULL,
    teacher_id INTEGER NOT NULL REFERENCES teacher(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instruction TEXT,
    total_marks DECIMAL(5, 2) DEFAULT 100,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Online Classes
CREATE TABLE online_class (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,
    subject_id INTEGER REFERENCES subject(id) ON DELETE SET NULL,
    teacher_id INTEGER NOT NULL REFERENCES teacher(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    platform TEXT,
    meeting_link TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE announcement (
    id SERIAL PRIMARY KEY,
    school_id TEXT DEFAULT 'default' REFERENCES school(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES session(id) ON DELETE CASCADE,
    term_id INTEGER REFERENCES term(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    audience TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- School Settings
CREATE TABLE school_setting (
    id SERIAL PRIMARY KEY,
    school_id TEXT DEFAULT 'default' REFERENCES school(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, key)
);

-- Parent Messages
CREATE TABLE parent_message (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'SENT' CHECK (status IN ('SENT', 'READ', 'REPLIED', 'CLOSED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent Complaints
CREATE TABLE parent_complaint (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    complaint TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED')),
    reviewed_by_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    actor_user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles
CREATE TABLE vehicle (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    driver_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers
CREATE TABLE driver (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    license_number TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add driver FK to vehicle after driver table exists
ALTER TABLE vehicle ADD FOREIGN KEY (driver_id) REFERENCES driver(id) ON DELETE SET NULL;

-- Routes
CREATE TABLE route (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    vehicle_id INTEGER REFERENCES vehicle(id) ON DELETE SET NULL,
    pickup_time TEXT,
    dropoff_time TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add route FK to student
ALTER TABLE student ADD FOREIGN KEY (route_id) REFERENCES route(id) ON DELETE SET NULL;

-- Route Stops
CREATE TABLE route_stop (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES route(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    pickup_time TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visitors
CREATE TABLE visitor (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    purpose TEXT NOT NULL,
    whom_to_see TEXT,
    department TEXT,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP,
    status TEXT DEFAULT 'CHECKED_IN',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enquiries
CREATE TABLE enquiry (
    id SERIAL PRIMARY KEY,
    enquiry_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    source TEXT NOT NULL,
    type TEXT NOT NULL,
    stage TEXT NOT NULL,
    subject TEXT NOT NULL,
    notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gate Passes
CREATE TABLE gate_pass (
    id SERIAL PRIMARY KEY,
    pass_number TEXT UNIQUE NOT NULL,
    person_name TEXT NOT NULL,
    person_type TEXT NOT NULL,
    purpose TEXT NOT NULL,
    destination TEXT,
    exit_time TIMESTAMP NOT NULL,
    expected_return TIMESTAMP,
    actual_return TIMESTAMP,
    issued_by_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reception Complaints
CREATE TABLE reception_complaint (
    id SERIAL PRIMARY KEY,
    complaint_number TEXT UNIQUE NOT NULL,
    complainant_name TEXT NOT NULL,
    complainant_type TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    complaint_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    resolution TEXT,
    resolved_by_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call Logs
CREATE TABLE call_log (
    id SERIAL PRIMARY KEY,
    call_number TEXT UNIQUE NOT NULL,
    caller_name TEXT NOT NULL,
    caller_phone TEXT NOT NULL,
    purpose TEXT NOT NULL,
    recipient TEXT,
    duration INTEGER,
    status TEXT DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Correspondence
CREATE TABLE correspondence (
    id SERIAL PRIMARY KEY,
    ref_number TEXT UNIQUE NOT NULL,
    sender_name TEXT NOT NULL,
    sender_address TEXT,
    type TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    received_date DATE,
    dispatched_date DATE,
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queries
CREATE TABLE query (
    id SERIAL PRIMARY KEY,
    query_number TEXT UNIQUE NOT NULL,
    query_type TEXT NOT NULL,
    querier_name TEXT NOT NULL,
    querier_contact TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    response TEXT,
    status TEXT DEFAULT 'PENDING',
    responded_by_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_role ON "user"(role_id);
CREATE INDEX idx_student_user ON student(user_id);
CREATE INDEX idx_student_parent ON student(parent_id);
CREATE INDEX idx_student_class ON student(class_id);
CREATE INDEX idx_teacher_user ON teacher(user_id);
CREATE INDEX idx_parent_user ON parent(user_id);
CREATE INDEX idx_invoice_student ON invoice(student_id);
CREATE INDEX idx_invoice_term ON invoice(term_id);
CREATE INDEX idx_payment_invoice ON payment(invoice_id);
CREATE INDEX idx_score_student ON score(student_id);
CREATE INDEX idx_score_subject ON score(subject_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_lesson_teacher ON lesson(teacher_id);
CREATE INDEX idx_assignment_teacher ON assignment(teacher_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_enquiry_stage ON enquiry(stage);
CREATE INDEX idx_visitor_status ON visitor(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_school_updated_at BEFORE UPDATE ON school FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parent_updated_at BEFORE UPDATE ON parent FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teacher_updated_at BEFORE UPDATE ON teacher FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_updated_at BEFORE UPDATE ON student FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_class_updated_at BEFORE UPDATE ON class FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subject_updated_at BEFORE UPDATE ON subject FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_group_updated_at BEFORE UPDATE ON fee_group FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_item_updated_at BEFORE UPDATE ON fee_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles
INSERT INTO role (name) VALUES 
    ('SUPER_ADMIN'),
    ('SCHOOL_ADMIN'),
    ('HEAD_OF_SCHOOL'),
    ('PRINCIPAL'),
    ('ACCOUNTANT'),
    ('REGISTRAR'),
    ('TEACHER'),
    ('PARENT'),
    ('STUDENT'),
    ('RECEPTIONIST')
ON CONFLICT (name) DO NOTHING;

-- Performance indexes for school-scoped queries
-- Note: school_id indexes are added after migrations add the column
CREATE INDEX IF NOT EXISTS idx_student_user_id ON student(user_id);
CREATE INDEX IF NOT EXISTS idx_student_parent_id ON student(parent_id);
CREATE INDEX IF NOT EXISTS idx_student_class_id ON student(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_user_id ON teacher(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_user_id ON parent(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_item_group_id ON fee_item(fee_group_id);
CREATE INDEX IF NOT EXISTS idx_invoice_session_id ON invoice(session_id);
CREATE INDEX IF NOT EXISTS idx_invoice_term_id ON invoice(term_id);
CREATE INDEX IF NOT EXISTS idx_invoice_student_id ON invoice(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoice_id ON payment(invoice_id);
CREATE INDEX IF NOT EXISTS idx_score_session_id ON score(session_id);
CREATE INDEX IF NOT EXISTS idx_score_term_id ON score(term_id);
CREATE INDEX IF NOT EXISTS idx_score_student_id ON score(student_id);
CREATE INDEX IF NOT EXISTS idx_score_subject_id ON score(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_term_id ON attendance(term_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_announcement_session_id ON announcement(session_id);
CREATE INDEX IF NOT EXISTS idx_announcement_term_id ON announcement(term_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_student_id ON student_enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_session_id ON student_enrollment(session_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_term_id ON student_enrollment(term_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_class_id ON student_enrollment(class_id);
CREATE INDEX IF NOT EXISTS idx_school_setting_key ON school_setting(key);

-- Income & Expense Categories
CREATE TABLE income_category (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expense_category (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Income Ledger (auto from payments + manual entries)
CREATE TABLE income (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    category_id INTEGER REFERENCES income_category(id),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    source TEXT,
    date DATE NOT NULL,
    is_from_payment BOOLEAN DEFAULT false,
    payment_id INTEGER REFERENCES payment(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense Ledger
CREATE TABLE expense (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    category_id INTEGER REFERENCES expense_category(id),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_income_category_school_id ON income_category(school_id);
CREATE INDEX IF NOT EXISTS idx_expense_category_school_id ON expense_category(school_id);
CREATE INDEX IF NOT EXISTS idx_income_school_id ON income(school_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_expense_school_id ON expense(school_id);
CREATE INDEX IF NOT EXISTS idx_expense_date ON expense(date);

CREATE TABLE IF NOT EXISTS school_config_version (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    source TEXT DEFAULT 'manual',
    notes TEXT,
    created_by_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_school_config_version_school_id ON school_config_version(school_id);
CREATE INDEX IF NOT EXISTS idx_school_config_version_active ON school_config_version(school_id, is_active);

-- Privilege System
CREATE TABLE privilege (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role Privilege (default privileges per role)
CREATE TABLE role_privilege (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES "role"(id) ON DELETE CASCADE,
    privilege_id INTEGER NOT NULL REFERENCES privilege(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, privilege_id)
);

-- User Privilege (user-specific overrides)
CREATE TABLE user_privilege (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    privilege_id INTEGER NOT NULL REFERENCES privilege(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT true,
    granted_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, privilege_id)
);

CREATE INDEX IF NOT EXISTS idx_privilege_code ON privilege(code);
CREATE INDEX IF NOT EXISTS idx_privilege_category ON privilege(category);
CREATE INDEX IF NOT EXISTS idx_role_privilege_role_id ON role_privilege(role_id);
CREATE INDEX IF NOT EXISTS idx_role_privilege_privilege_id ON role_privilege(privilege_id);
CREATE INDEX IF NOT EXISTS idx_user_privilege_user_id ON user_privilege(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privilege_privilege_id ON user_privilege(privilege_id);
