import { Pool } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const tables = [
    "payment_method",
    "school_bank_account",
    "school_template",
    "income",
    "expense",
    "admission_guardian",
    "parent",
    "result",
  ];

  for (const t of tables) {
    const { rows: cols } = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default, is_generated, generation_expression
       FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1
       ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n=== ${t} ===`);
    if (cols.length === 0) {
      console.log("TABLE NOT FOUND");
      continue;
    }
    for (const c of cols) {
      let line = `${c.column_name} ${c.data_type}${c.is_nullable === "YES" ? "?" : ""}`;
      if (c.column_default) line += ` default=${c.column_default}`;
      if (c.is_generated === "ALWAYS") line += ` GENERATED ${c.generation_expression}`;
      console.log(line);
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
