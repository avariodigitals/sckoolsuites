#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function debug() {
  const client = await pool.connect();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Split by semicolon to run statements individually
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + ';');

  console.log(`Found ${statements.length} statements`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 120);
    try {
      await client.query(stmt);
      console.log(`✅ [${i + 1}] ${preview}`);
    } catch (err) {
      console.error(`❌ [${i + 1}] FAILED: ${preview}`);
      console.error(`   Error: ${err.message}`);
      break;
    }
  }
  
  client.release();
  await pool.end();
}

debug();
