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
    "SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public' ORDER BY sequence_name"
  );
  console.log("Sequences in database:");
  for (const row of result.rows) {
    console.log("  -", row.sequence_name);
  }
  await pool.end();
}

main().catch(console.error);
