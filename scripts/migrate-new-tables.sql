-- Safe migration: add new session/privilege tables without dropping existing data
-- Run with: psql "$DATABASE_URL" -f scripts/migrate-new-tables.sql

-- 1. Add columns to announcement (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcement' AND column_name = 'school_id') THEN
        ALTER TABLE announcement ADD COLUMN school_id TEXT DEFAULT 'default' REFERENCES school(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcement' AND column_name = 'session_id') THEN
        ALTER TABLE announcement ADD COLUMN session_id INTEGER REFERENCES session(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcement' AND column_name = 'term_id') THEN
        ALTER TABLE announcement ADD COLUMN term_id INTEGER REFERENCES term(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Create student_enrollment table
CREATE TABLE IF NOT EXISTS student_enrollment (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    term_id INTEGER NOT NULL REFERENCES term(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES class(id) ON DELETE SET NULL,
    promotion_status TEXT DEFAULT 'ACTIVE' CHECK (promotion_status IN ('PROMOTED', 'REPEATING', 'WITHDRAWN', 'ACTIVE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, session_id, term_id)
);

-- 3. Create privilege system tables
CREATE TABLE IF NOT EXISTS privilege (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_privilege (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES "role"(id) ON DELETE CASCADE,
    privilege_id INTEGER NOT NULL REFERENCES privilege(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, privilege_id)
);

CREATE TABLE IF NOT EXISTS user_privilege (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    privilege_id INTEGER NOT NULL REFERENCES privilege(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT true,
    granted_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, privilege_id)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_announcement_school_id ON announcement(school_id);
CREATE INDEX IF NOT EXISTS idx_announcement_session_id ON announcement(session_id);
CREATE INDEX IF NOT EXISTS idx_announcement_term_id ON announcement(term_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_student_id ON student_enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_session_id ON student_enrollment(session_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_term_id ON student_enrollment(term_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_class_id ON student_enrollment(class_id);
CREATE INDEX IF NOT EXISTS idx_privilege_code ON privilege(code);
CREATE INDEX IF NOT EXISTS idx_privilege_category ON privilege(category);
CREATE INDEX IF NOT EXISTS idx_role_privilege_role_id ON role_privilege(role_id);
CREATE INDEX IF NOT EXISTS idx_role_privilege_privilege_id ON role_privilege(privilege_id);
CREATE INDEX IF NOT EXISTS idx_user_privilege_user_id ON user_privilege(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privilege_privilege_id ON user_privilege(privilege_id);

-- 5. Widen role constraint and ensure newer roles exist (idempotent)
DO $$
BEGIN
    ALTER TABLE "role" DROP CONSTRAINT IF EXISTS role_name_check;
    ALTER TABLE "role" ADD CONSTRAINT role_name_check
        CHECK (name IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_OF_SCHOOL', 'PRINCIPAL', 'ACCOUNTANT', 'REGISTRAR', 'TEACHER', 'PARENT', 'STUDENT', 'RECEPTIONIST'));
EXCEPTION WHEN OTHERS THEN
    -- Constraint may already match; continue.
END $$;

INSERT INTO "role" (name) VALUES
    ('HEAD_OF_SCHOOL'),
    ('RECEPTIONIST')
ON CONFLICT (name) DO NOTHING;

-- 6. Seed basic privileges (will be fully seeded by the app)
INSERT INTO privilege (code, name, category) VALUES
    ('students.view', 'View Students', 'students'),
    ('students.manage', 'Manage Students', 'students'),
    ('parents.view', 'View Parents', 'parents'),
    ('parents.manage', 'Manage Parents', 'parents'),
    ('teachers.view', 'View Teachers', 'teachers'),
    ('teachers.manage', 'Manage Teachers', 'teachers'),
    ('classes.view', 'View Classes', 'academic'),
    ('classes.manage', 'Manage Classes', 'academic'),
    ('subjects.view', 'View Subjects', 'academic'),
    ('subjects.manage', 'Manage Subjects', 'academic'),
    ('sessions.view', 'View Sessions', 'academic'),
    ('sessions.manage', 'Manage Sessions', 'academic'),
    ('terms.view', 'View Terms', 'academic'),
    ('terms.manage', 'Manage Terms', 'academic'),
    ('attendance.view', 'View Attendance', 'attendance'),
    ('attendance.manage', 'Manage Attendance', 'attendance'),
    ('results.view', 'View Results', 'results'),
    ('results.manage', 'Manage Results', 'results'),
    ('fees.view', 'View Fees', 'finance'),
    ('fees.manage', 'Manage Fees', 'finance'),
    ('bills.view', 'View Bills', 'finance'),
    ('bills.manage', 'Manage Bills', 'finance'),
    ('payments.view', 'View Payments', 'finance'),
    ('payments.manage', 'Manage Payments', 'finance'),
    ('income.view', 'View Income', 'finance'),
    ('income.manage', 'Manage Income', 'finance'),
    ('expenses.view', 'View Expenses', 'finance'),
    ('expenses.manage', 'Manage Expenses', 'finance'),
    ('debtors.view', 'View Debtors', 'finance'),
    ('ledger.view', 'View Ledger', 'finance'),
    ('revenue.view', 'View Revenue', 'finance'),
    ('announcements.view', 'View Announcements', 'communication'),
    ('announcements.manage', 'Manage Announcements', 'communication'),
    ('transport.view', 'View Transport', 'transport'),
    ('transport.manage', 'Manage Transport', 'transport'),
    ('settings.view', 'View Settings', 'settings'),
    ('settings.manage', 'Manage Settings', 'settings'),
    ('users.view', 'View Users', 'users'),
    ('users.manage', 'Manage Users', 'users'),
    ('roles.view', 'View Roles', 'users'),
    ('roles.manage', 'Manage Roles', 'users'),
    ('privileges.view', 'View Privileges', 'users'),
    ('privileges.manage', 'Manage Privileges', 'users'),
    ('profile.view', 'View Profile', 'profile'),
    ('profile.edit', 'Edit Profile', 'profile'),
    ('profile.change_password', 'Change Password', 'profile')
ON CONFLICT (code) DO NOTHING;

-- 6. Seed role privileges for SUPER_ADMIN and SCHOOL_ADMIN
INSERT INTO role_privilege (role_id, privilege_id, is_granted)
SELECT r.id, p.id, true
FROM "role" r
CROSS JOIN privilege p
WHERE r.name IN ('SUPER_ADMIN', 'SCHOOL_ADMIN')
ON CONFLICT (role_id, privilege_id) DO NOTHING;

-- 7. Seed role privileges for PRINCIPAL
INSERT INTO role_privilege (role_id, privilege_id, is_granted)
SELECT r.id, p.id, true
FROM "role" r
CROSS JOIN privilege p
WHERE r.name = 'PRINCIPAL'
ON CONFLICT (role_id, privilege_id) DO NOTHING;

-- 8. Seed role privileges for TEACHER
INSERT INTO role_privilege (role_id, privilege_id, is_granted)
SELECT r.id, p.id, true
FROM "role" r
JOIN privilege p ON p.code IN (
    'students.view', 'classes.view', 'subjects.view',
    'attendance.view', 'attendance.manage', 'results.view', 'results.manage',
    'announcements.view', 'profile.view', 'profile.edit', 'profile.change_password'
)
WHERE r.name = 'TEACHER'
ON CONFLICT (role_id, privilege_id) DO NOTHING;

-- 9. Seed role privileges for PARENT
INSERT INTO role_privilege (role_id, privilege_id, is_granted)
SELECT r.id, p.id, true
FROM "role" r
JOIN privilege p ON p.code IN (
    'students.view', 'attendance.view', 'results.view',
    'bills.view', 'payments.view', 'announcements.view',
    'profile.view', 'profile.edit', 'profile.change_password'
)
WHERE r.name = 'PARENT'
ON CONFLICT (role_id, privilege_id) DO NOTHING;

-- 10. Seed role privileges for STUDENT
INSERT INTO role_privilege (role_id, privilege_id, is_granted)
SELECT r.id, p.id, true
FROM "role" r
JOIN privilege p ON p.code IN (
    'attendance.view', 'results.view', 'bills.view', 'payments.view',
    'announcements.view', 'profile.view', 'profile.edit', 'profile.change_password'
)
WHERE r.name = 'STUDENT'
ON CONFLICT (role_id, privilege_id) DO NOTHING;

-- 11. Seed role privileges for HEAD_OF_SCHOOL
INSERT INTO role_privilege (role_id, privilege_id, is_granted)
SELECT r.id, p.id, true
FROM "role" r
JOIN privilege p ON p.code IN (
    'students.view', 'students.manage',
    'parents.view', 'parents.manage',
    'teachers.view', 'teachers.manage',
    'classes.view', 'classes.manage',
    'subjects.view', 'subjects.manage',
    'sessions.view', 'sessions.manage',
    'terms.view', 'terms.manage',
    'attendance.view', 'attendance.manage',
    'results.view', 'results.manage',
    'fees.view', 'fees.manage',
    'bills.view', 'bills.manage',
    'payments.view', 'payments.manage',
    'income.view', 'income.manage',
    'expenses.view', 'expenses.manage',
    'debtors.view', 'ledger.view', 'revenue.view',
    'announcements.view', 'announcements.manage',
    'transport.view', 'transport.manage',
    'settings.view', 'settings.manage',
    'users.view', 'users.manage',
    'roles.view', 'roles.manage',
    'privileges.view', 'privileges.manage',
    'profile.view', 'profile.edit', 'profile.change_password'
)
WHERE r.name = 'HEAD_OF_SCHOOL'
ON CONFLICT (role_id, privilege_id) DO NOTHING;

-- 12. Seed role privileges for RECEPTIONIST
INSERT INTO role_privilege (role_id, privilege_id, is_granted)
SELECT r.id, p.id, true
FROM "role" r
JOIN privilege p ON p.code IN (
    'students.view', 'parents.view',
    'attendance.view', 'attendance.manage', 'announcements.view',
    'profile.view', 'profile.edit', 'profile.change_password'
)
WHERE r.name = 'RECEPTIONIST'
ON CONFLICT (role_id, privilege_id) DO NOTHING;
