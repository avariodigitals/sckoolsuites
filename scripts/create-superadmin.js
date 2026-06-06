#!/usr/bin/env node
/**
 * Create Super Admin Script
 * Run with: node scripts/create-superadmin.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const client = await pool.connect();
  
  try {
    // Get or create Super Admin role
    const roleResult = await client.query(
      `INSERT INTO role (name) VALUES ('SUPER_ADMIN') 
       ON CONFLICT (name) DO UPDATE SET name = 'SUPER_ADMIN'
       RETURNING id`
    );
    const superAdminRoleId = roleResult.rows[0].id;

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Super Admin user
    const userResult = await client.query(
      `INSERT INTO "user" (email, name, password, role_id, is_active) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET 
         name = EXCLUDED.name,
         password = EXCLUDED.password,
         role_id = EXCLUDED.role_id,
         is_active = EXCLUDED.is_active
       RETURNING email, name`,
      ['superadmin@sckoolsuite.com', 'Super Administrator', hashedPassword, superAdminRoleId, true]
    );

    const user = userResult.rows[0];

    console.log('Super Admin created/updated:');
    console.log(`Email: ${user.email}`);
    console.log(`Password: password123`);
    console.log(`Role: SUPER_ADMIN`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
