const fs = require('fs');
const { Pool } = require('pg');

const content = fs.readFileSync('.env.local', 'utf8');
const match = content.match(/DATABASE_URL\s*=\s*"([^"]+)"/s);
const url = match ? match[1].replace(/\s+/g, '') : process.env.DATABASE_URL;

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const tables = [
  'class_arm', 'class_group', 'fee_component', 'fee_profile',
  'fee_profile_item', 'fee_profile_class', 'fee_profile_arm',
  'receipt', 'school_config_version'
];

(async () => {
  const client = await pool.connect();
  try {
    for (const table of tables) {
      const col = await client.query(
        'SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
        [table, 'school_id']
      );
      if (col.rows.length === 0) {
        await client.query(`ALTER TABLE ${table} ADD COLUMN school_id TEXT DEFAULT 'default'`);
        await client.query(`UPDATE ${table} SET school_id = 'default' WHERE school_id IS NULL`);
        console.log(`✅ Added school_id to ${table}`);
      } else {
        console.log(`⏭ ${table} already has school_id`);
      }
    }
    console.log('\n🎉 Done!');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
