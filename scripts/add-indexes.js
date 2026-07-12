const fs = require('fs');
const { Pool } = require('pg');

const content = fs.readFileSync('.env.local', 'utf8');
const match = content.match(/DATABASE_URL\s*=\s*"([^"]+)"/s);
const url = match ? match[1].replace(/\s+/g, '') : process.env.DATABASE_URL;

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_student_school_id ON student(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_student_user_id ON student(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_student_parent_id ON student(parent_id)',
  'CREATE INDEX IF NOT EXISTS idx_student_class_id ON student(class_id)',
  'CREATE INDEX IF NOT EXISTS idx_teacher_school_id ON teacher(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_teacher_user_id ON teacher(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_parent_school_id ON parent(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_parent_user_id ON parent(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_class_school_id ON class(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_class_group_school_id ON class_group(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_class_arm_school_id ON class_arm(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_subject_school_id ON subject(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_session_school_id ON session(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_term_school_id ON term(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_term_session_id ON term(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_fee_group_school_id ON fee_group(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_fee_item_school_id ON fee_item(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_fee_item_group_id ON fee_item(fee_group_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_school_id ON invoice(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_session_id ON invoice(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_term_id ON invoice(term_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoice_student_id ON invoice(student_id)',
  'CREATE INDEX IF NOT EXISTS idx_payment_school_id ON payment(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_payment_invoice_id ON payment(invoice_id)',
  'CREATE INDEX IF NOT EXISTS idx_score_school_id ON score(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_score_session_id ON score(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_score_term_id ON score(term_id)',
  'CREATE INDEX IF NOT EXISTS idx_score_student_id ON score(student_id)',
  'CREATE INDEX IF NOT EXISTS idx_score_subject_id ON score(subject_id)',
  'CREATE INDEX IF NOT EXISTS idx_result_school_id ON result(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON attendance(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_attendance_term_id ON attendance(term_id)',
  'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)',
  'CREATE INDEX IF NOT EXISTS idx_announcement_school_id ON announcement(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_lesson_school_id ON lesson(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_assignment_school_id ON assignment(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_quiz_school_id ON quiz(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_online_class_school_id ON online_class(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_receipt_school_id ON receipt(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_school_setting_school_id ON school_setting(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_school_setting_key ON school_setting(key)',
  'CREATE INDEX IF NOT EXISTS idx_audit_log_school_id ON audit_log(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_visitor_school_id ON visitor(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_enquiry_school_id ON enquiry(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_gate_pass_school_id ON gate_pass(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_reception_complaint_school_id ON reception_complaint(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_call_log_school_id ON call_log(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_correspondence_school_id ON correspondence(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_query_school_id ON "query"(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_parent_message_school_id ON parent_message(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_parent_complaint_school_id ON parent_complaint(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_vehicle_school_id ON vehicle(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_driver_school_id ON driver(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_route_school_id ON route(school_id)',
  'CREATE INDEX IF NOT EXISTS idx_route_stop_school_id ON route_stop(school_id)',
];

(async () => {
  const client = await pool.connect();
  try {
    for (const idx of indexes) {
      await client.query(idx);
      console.log('✅', idx.substring(0, 60) + '...');
    }
    console.log('\n🎉 All ' + indexes.length + ' indexes created!');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
