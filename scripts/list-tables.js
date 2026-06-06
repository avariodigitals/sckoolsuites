const { Pool } = require("pg");
const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/DATABASE_URL=(.+)/);
if (!match) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const url = match[1].trim().replace(/^["']|["']$/g, "");
const pool = new Pool({ connectionString: url, ssl: false });

async function main() {
  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  console.log("Tables in database:");
  for (const row of result.rows) {
    console.log("  -", row.table_name);
  }
  await pool.end();
}

main().catch(console.error);
