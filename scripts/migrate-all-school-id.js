#!/usr/bin/env node
/**
 * Migration: Add school_id to all tables that need it for multi-school support
 */

const fs = require('fs');
const { Pool } = require('pg');

const content = fs.readFileSync('.env.local', 'utf8');
const match = content.match(/DATABASE_URL\s*=\s*"([^"]+)"/s);
const url = match ? match[1].replace(/\s+/g, '') : process.env.DATABASE_URL;

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const tables = [
  'parent',
  'teacher',
  'student',
  'class',
  'subject',
  'fee_group',
  'fee_item',
  'invoice',
  'payment',
  'score',
  'result',
  'lesson',
  'assignment',
  'quiz',
  'online_class',
  'attendance',
  'announcement',
  'vehicle',
  'driver',
  'route',
  'route_stop',
  'visitor',
  'enquiry',
  'gate_pass',
  'reception_complaint',
  'call_log',
  'correspondence',
  'query',
  'parent_message',
  'parent_complaint',
  'audit_log',
  'invoice_contest_audit',
];

async function migrate() {
  const client = await pool.connect();
  try {
    for (const table of tables) {
      const col = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'school_id'`,
        [table]
      );
      if (col.rows.length === 0) {
        await client.query(`ALTER TABLE ${table} ADD COLUMN school_id TEXT DEFAULT 'default'`);
        await client.query(`UPDATE ${table} SET school_id = 'default' WHERE school_id IS NULL`);
        console.log(`✅ Added school_id to ${table}`);
      } else {
        console.log(`⏭ ${table} already has school_id`);
      }
    }
    console.log('\n🎉 All migrations complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
