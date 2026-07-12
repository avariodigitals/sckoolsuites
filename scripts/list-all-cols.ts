import { Pool } from "pg";
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const { rows } = await pool.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema='public'
     ORDER BY table_name, ordinal_position`
  );
  let current = '';
  for (const r of rows) {
    if (r.table_name !== current) { current = r.table_name; console.log(`\n=== ${current} ===`); }
    console.log(`${r.column_name} ${r.data_type}${r.is_nullable==='YES'?'?':''}${r.column_default?' default='+r.column_default:''}`);
  }
  await pool.end();
}
main().catch(e=>{console.error(e);process.exit(1)});
