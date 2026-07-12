const fs = require('fs');
const { Pool } = require('pg');

const content = fs.readFileSync('.env.local', 'utf8');
const match = content.match(/DATABASE_URL\s*=\s*"([^"]+)"/s);
const url = match ? match[1].replace(/\s+/g, '') : process.env.DATABASE_URL;

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  try {
    // Check if school is_setup
    const school = await client.query("SELECT is_setup, is_active FROM school WHERE id = 'default'");
    console.log('School setup state:', school.rows[0]);

    // Upsert setup_wizard_status with completed state
    const status = JSON.stringify({
      setupCompleted: true,
      lastCompletedStep: 7,
      completedSteps: ['school-profile','academic-setup','classes-arms','subjects','grading-assessment','finance-setup','users-roles'],
      updatedAt: new Date().toISOString()
    });

    await client.query(
      "INSERT INTO school_setting (school_id, key, value) VALUES ('default', 'setup_wizard_status', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [status]
    );
    console.log('✅ setup_wizard_status updated to completed');

    // Verify
    const verify = await client.query("SELECT value FROM school_setting WHERE key = 'setup_wizard_status'");
    console.log('Stored value:', verify.rows[0]?.value);
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
