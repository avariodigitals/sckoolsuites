-- SckoolSuite ERP - Database Cleanup Script
-- Wipes all transactional and master data while preserving schema and default roles.
-- Use case: Reset an instance before re-running the /setup wizard.
--
-- Usage:
--   psql "$DATABASE_URL" < scripts/cleanup.sql
--
-- What is preserved:
--   - Database schema (all tables, indexes, triggers)
--   - Default roles (SUPER_ADMIN, SCHOOL_ADMIN, etc.)
--   - The school record (id = 'default') and its branding
--
-- What is removed:
--   - All users, students, parents, teachers
--   - All academic data (sessions, terms, classes, subjects, scores, results)
--   - All financial data (fee groups, fee items, invoices, payments, receipts)
--   - All operational data (attendance, lessons, assignments, announcements)
--   - All communication data (messages, complaints, audit logs)
--   - All transport and reception data

BEGIN;

-- Disable triggers to prevent updated_at triggers firing during cleanup
ALTER TABLE school DISABLE TRIGGER update_school_updated_at;
ALTER TABLE "user" DISABLE TRIGGER update_user_updated_at;
ALTER TABLE parent DISABLE TRIGGER update_parent_updated_at;
ALTER TABLE teacher DISABLE TRIGGER update_teacher_updated_at;
ALTER TABLE student DISABLE TRIGGER update_student_updated_at;
ALTER TABLE class DISABLE TRIGGER update_class_updated_at;
ALTER TABLE subject DISABLE TRIGGER update_subject_updated_at;
ALTER TABLE fee_group DISABLE TRIGGER update_fee_group_updated_at;
ALTER TABLE fee_item DISABLE TRIGGER update_fee_item_updated_at;

-- Delete data from tables in reverse dependency order (child tables first)
-- ON DELETE CASCADE will automatically clear dependent rows

-- 1. Junction / heavily dependent tables
DELETE FROM fee_profile_arm;
DELETE FROM fee_profile_class;
DELETE FROM fee_profile_item;
DELETE FROM fee_profile;

-- 2. Financial detail tables
DELETE FROM invoice_item;
DELETE FROM receipt;
DELETE FROM payment_proof;
DELETE FROM payment;
DELETE FROM invoice;

-- 3. Academic detail tables
DELETE FROM result;
DELETE FROM score;
DELETE FROM attendance;
DELETE FROM assignment;
DELETE FROM quiz;
DELETE FROM online_class;
DELETE FROM lesson;

-- 4. Communication & audit
DELETE FROM parent_complaint;
DELETE FROM parent_message;
DELETE FROM audit_log;
DELETE FROM announcement;
DELETE FROM school_setting;

-- 5. Transport
DELETE FROM route_stop;
DELETE FROM route;
DELETE FROM vehicle;
DELETE FROM driver;

-- 6. Reception
DELETE FROM reception_complaint;
DELETE FROM call_log;
DELETE FROM correspondence;
DELETE FROM query;
DELETE FROM gate_pass;
DELETE FROM enquiry;
DELETE FROM visitor;

-- 7. Academic master data
DELETE FROM subject;
DELETE FROM class_arm;
DELETE FROM class;
DELETE FROM class_group;
DELETE FROM term;
DELETE FROM session;

-- 8. Financial master data
DELETE FROM fee_item;
DELETE FROM fee_component;
DELETE FROM fee_group;

-- 9. People (order matters due to FKs: student -> parent/teacher -> user)
DELETE FROM student;
DELETE FROM parent;
DELETE FROM teacher;
DELETE FROM "user";

-- 10. School branding (keep school record intact)
DELETE FROM school_branding;

-- Re-enable triggers
ALTER TABLE school ENABLE TRIGGER update_school_updated_at;
ALTER TABLE "user" ENABLE TRIGGER update_user_updated_at;
ALTER TABLE parent ENABLE TRIGGER update_parent_updated_at;
ALTER TABLE teacher ENABLE TRIGGER update_teacher_updated_at;
ALTER TABLE student ENABLE TRIGGER update_student_updated_at;
ALTER TABLE class ENABLE TRIGGER update_class_updated_at;
ALTER TABLE subject ENABLE TRIGGER update_subject_updated_at;
ALTER TABLE fee_group ENABLE TRIGGER update_fee_group_updated_at;
ALTER TABLE fee_item ENABLE TRIGGER update_fee_item_updated_at;

-- Reset all SERIAL sequences back to 1
SELECT setval('announcement_id_seq', 1, false);
SELECT setval('assignment_id_seq', 1, false);
SELECT setval('attendance_id_seq', 1, false);
SELECT setval('audit_log_id_seq', 1, false);
SELECT setval('call_log_id_seq', 1, false);
SELECT setval('class_arm_id_seq', 1, false);
SELECT setval('class_group_id_seq', 1, false);
SELECT setval('class_id_seq', 1, false);
SELECT setval('correspondence_id_seq', 1, false);
SELECT setval('driver_id_seq', 1, false);
SELECT setval('enquiry_id_seq', 1, false);
SELECT setval('fee_component_id_seq', 1, false);
SELECT setval('fee_group_id_seq', 1, false);
SELECT setval('fee_item_id_seq', 1, false);
SELECT setval('fee_profile_arm_id_seq', 1, false);
SELECT setval('fee_profile_class_id_seq', 1, false);
SELECT setval('fee_profile_id_seq', 1, false);
SELECT setval('fee_profile_item_id_seq', 1, false);
SELECT setval('gate_pass_id_seq', 1, false);
SELECT setval('invoice_id_seq', 1, false);
SELECT setval('invoice_item_id_seq', 1, false);
SELECT setval('lesson_id_seq', 1, false);
SELECT setval('online_class_id_seq', 1, false);
SELECT setval('parent_complaint_id_seq', 1, false);
SELECT setval('parent_id_seq', 1, false);
SELECT setval('parent_message_id_seq', 1, false);
SELECT setval('payment_id_seq', 1, false);
SELECT setval('payment_proof_id_seq', 1, false);
SELECT setval('query_id_seq', 1, false);
SELECT setval('quiz_id_seq', 1, false);
SELECT setval('receipt_id_seq', 1, false);
SELECT setval('reception_complaint_id_seq', 1, false);
SELECT setval('result_id_seq', 1, false);
SELECT setval('role_id_seq', (SELECT MAX(id) FROM role), true);
SELECT setval('route_id_seq', 1, false);
SELECT setval('route_stop_id_seq', 1, false);
SELECT setval('school_branding_id_seq', 1, false);
SELECT setval('school_setting_id_seq', 1, false);
SELECT setval('score_id_seq', 1, false);
SELECT setval('session_id_seq', 1, false);
SELECT setval('student_id_seq', 1, false);
SELECT setval('subject_id_seq', 1, false);
SELECT setval('teacher_id_seq', 1, false);
SELECT setval('term_id_seq', 1, false);
SELECT setval('user_id_seq', 1, false);
SELECT setval('vehicle_id_seq', 1, false);
SELECT setval('visitor_id_seq', 1, false);

COMMIT;
