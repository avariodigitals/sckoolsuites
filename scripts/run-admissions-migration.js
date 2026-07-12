const fs = require('fs');
const { Pool } = require('pg');

const content = fs.readFileSync('.env.local', 'utf8');
const match = content.match(/DATABASE_URL\s*=\s*"([^"]+)"/s);
const url = match ? match[1].replace(/\s+/g, '') : process.env.DATABASE_URL;

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const sql = fs.readFileSync(__dirname + '/add-admissions.sql', 'utf8');

(async () => {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Admissions migration complete');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
