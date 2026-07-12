#!/usr/bin/env node
const fs = require('fs');
const { Pool } = require('pg');

const content = fs.readFileSync('.env.local', 'utf8');
const match = content.match(/DATABASE_URL\s*=\s*"([^"]+)"/s);
const url = match ? match[1].replace(/\s+/g, '') : process.env.DATABASE_URL;

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  try {
    const col = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'school_setting' AND column_name = 'school_id'");
    if (col.rows.length === 0) {
      await client.query('ALTER TABLE school_setting ADD COLUMN school_id TEXT DEFAULT \'default\'');
      await client.query("UPDATE school_setting SET school_id = 'default' WHERE school_id IS NULL");
      await client.query('ALTER TABLE school_setting ALTER COLUMN school_id SET NOT NULL');
      console.log('✅ Added school_id to school_setting');
    } else {
      console.log('⏭ school_setting already has school_id');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
