const fs = require('fs');
const { Pool } = require('pg');

const content = fs.readFileSync('.env.local', 'utf8');
const match = content.match(/DATABASE_URL\s*=\s*"([^"]+)"/s);
const url = match ? match[1].replace(/\s+/g, '') : process.env.DATABASE_URL;

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const sql = `
CREATE TABLE IF NOT EXISTS income_category (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_category (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    category_id INTEGER REFERENCES income_category(id),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    source TEXT,
    date DATE NOT NULL,
    is_from_payment BOOLEAN DEFAULT false,
    payment_id INTEGER REFERENCES payment(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    category_id INTEGER REFERENCES expense_category(id),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_income_category_school_id ON income_category(school_id);
CREATE INDEX IF NOT EXISTS idx_expense_category_school_id ON expense_category(school_id);
CREATE INDEX IF NOT EXISTS idx_income_school_id ON income(school_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_expense_school_id ON expense(school_id);
CREATE INDEX IF NOT EXISTS idx_expense_date ON expense(date);
`;

(async () => {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Finance tables created');

    // Insert default School Fee income category for existing schools
    const schools = await client.query('SELECT id FROM school');
    for (const school of schools.rows) {
      await client.query(
        'INSERT INTO income_category (school_id, name, description, is_default) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [school.id, 'School Fee', 'Automatic income from student bill payments', true]
      );
    }

    // Insert global expense categories for existing schools
    const globalExpenseCats = ['Excursion', 'Transport', 'Stationery', 'Utilities', 'Maintenance', 'Salaries', 'Others'];
    for (const school of schools.rows) {
      for (const cat of globalExpenseCats) {
        await client.query(
          'INSERT INTO expense_category (school_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [school.id, cat]
        );
      }
    }

    console.log('Default categories seeded');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
