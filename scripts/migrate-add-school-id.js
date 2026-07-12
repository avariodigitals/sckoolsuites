#!/usr/bin/env node
/**
 * Migration: Add school_id to session and term tables
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Manually load DATABASE_URL from .env.local (handles multi-line quoted values)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/DATABASE_URL\s*=\s*"([^"]+)"/s);
  if (match) {
    process.env.DATABASE_URL = match[1].replace(/\s+/g, '');
  }
}
loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Checking session table...');
    const sessionCol = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'session' AND column_name = 'school_id'
    `);
    if (sessionCol.rows.length === 0) {
      await client.query(`
        ALTER TABLE session
        ADD COLUMN school_id TEXT DEFAULT 'default' REFERENCES school(id) ON DELETE CASCADE,
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added school_id to session table');
    } else {
      console.log('⏭ school_id already exists on session');
    }

    console.log('Checking term table...');
    const termCol = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'term' AND column_name = 'school_id'
    `);
    if (termCol.rows.length === 0) {
      await client.query(`
        ALTER TABLE term
        ADD COLUMN school_id TEXT DEFAULT 'default' REFERENCES school(id) ON DELETE CASCADE,
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added school_id to term table');
    } else {
      console.log('⏭ school_id already exists on term');
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
