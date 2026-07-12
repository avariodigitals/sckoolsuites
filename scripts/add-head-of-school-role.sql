-- One-time data migration for existing databases that already have the privilege system.
-- Run with: psql "$DATABASE_URL" -f scripts/add-head-of-school-role.sql

BEGIN;

-- 1. Widen the role name CHECK constraint so the new role(s) can be inserted.
ALTER TABLE "role" DROP CONSTRAINT IF EXISTS role_name_check;
ALTER TABLE "role" ADD CONSTRAINT role_name_check
    CHECK (name IN (
        'SUPER_ADMIN',
        'SCHOOL_ADMIN',
        'HEAD_OF_SCHOOL',
        'PRINCIPAL',
        'ACCOUNTANT',
        'REGISTRAR',
        'TEACHER',
        'PARENT',
        'STUDENT',
        'RECEPTIONIST'
    ));

-- 2. Ensure the new roles exist.
INSERT INTO "role" (name) VALUES
    ('HEAD_OF_SCHOOL'),
    ('RECEPTIONIST')
ON CONFLICT (name) DO NOTHING;

-- 3. Seed privileges for HEAD_OF_SCHOOL (broad defaults, adjustable from the UI).
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

-- 4. Seed privileges for RECEPTIONIST if not already present.
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

COMMIT;
