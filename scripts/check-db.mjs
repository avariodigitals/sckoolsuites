import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
async function main() {
  const queries = [
    "SELECT id, name, email FROM school WHERE id = 'default'",
    "SELECT name FROM role ORDER BY name",
    "SELECT u.id, u.name, u.email, r.name as role FROM \"user\" u JOIN role r ON u.role_id = r.id WHERE r.name IN ('SCHOOL_ADMIN', 'SUPER_ADMIN') LIMIT 1",
    "SELECT COUNT(*) as c FROM student",
    "SELECT COUNT(*) as c FROM teacher",
    "SELECT COUNT(*) as c FROM parent",
    "SELECT COUNT(*) as c FROM session",
    "SELECT COUNT(*) as c FROM term",
    "SELECT COUNT(*) as c FROM class",
  ];
  const [schoolRes, rolesRes, adminRes, studentRes, teacherRes, parentRes, sessionRes, termRes, classRes] = await Promise.all(queries.map(q => pool.query(q)));
  console.log('School:', schoolRes.rows[0] || 'NOT FOUND');
  console.log('Roles:', rolesRes.rows.map(r => r.name));
  console.log('Admin:', adminRes.rows[0] || 'NOT FOUND');
  console.log('Counts:', {
    students: Number(studentRes.rows[0].c),
    teachers: Number(teacherRes.rows[0].c),
    parents: Number(parentRes.rows[0].c),
    sessions: Number(sessionRes.rows[0].c),
    terms: Number(termRes.rows[0].c),
    classes: Number(classRes.rows[0].c),
  });
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
