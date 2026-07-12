#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
  const client = await pool.connect();
  try {
    const files = [
      'add-user-columns.sql',
      'add-templates-table.sql', 
      'add-payment-methods.sql'
    ];
    for (const f of files) {
      const p = path.join(__dirname, f);
      if (!fs.existsSync(p)) { console.log(`SKIP: ${f} not found`); continue; }
      const sql = fs.readFileSync(p, 'utf8');
      await client.query(sql);
      console.log(`✅ ${f}`);
    }
    console.log('All migrations applied.');
  } catch (e) {
    console.error('❌ Migration error:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
