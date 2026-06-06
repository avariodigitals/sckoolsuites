#!/usr/bin/env node
/**
 * Database Initialization Script
 * 
 * This script initializes the PostgreSQL database with the schema.
 * Run with: node scripts/init-db.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema...');
    await client.query(schema);
    
    console.log('✅ Database schema created successfully!');
    console.log('');
    console.log('Default roles created:');
    console.log('  - SUPER_ADMIN (for initial setup)');
    console.log('  - SCHOOL_ADMIN (main administrator)');
    console.log('  - PRINCIPAL');
    console.log('  - ACCOUNTANT');
    console.log('  - TEACHER');
    console.log('  - PARENT');
    console.log('  - STUDENT');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start the application: npm run dev');
    console.log('  2. Login as Super Admin to complete setup');
    console.log('  3. Or use /setup to initialize your school');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
