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
    const { rows: exists } = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1",
      [t]
    );
    console.log(`\n=== ${t} ${exists.length ? "EXISTS" : "MISSING"} ===`);
    if (!exists.length) continue;

    const { rows: count } = await pool.query(`SELECT COUNT(*) AS c FROM "${t}"`);
    console.log(`rows: ${count[0].c}`);

    const { rows: fks } = await pool.query(
      `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column, rc.delete_rule
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema
       JOIN information_schema.referential_constraints rc ON rc.constraint_name=tc.constraint_name AND rc.constraint_schema=tc.table_schema
       WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='FOREIGN KEY'`,
      [t]
    );
    console.log(
      "FKs:",
      fks.map(r => `${r.constraint_name}(${r.column_name})->${r.foreign_table}.${r.foreign_column} ${r.delete_rule}`).join("; ") || "none"
    );

    const { rows: uniques } = await pool.query(
      `SELECT tc.constraint_name, string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) AS cols
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
       WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type IN ('PRIMARY KEY','UNIQUE')
       GROUP BY tc.constraint_name`,
      [t]
    );
    console.log(
      "PK/UNIQUE:",
      uniques.map(r => `${r.constraint_name}(${r.cols})`).join("; ") || "none"
    );

    const { rows: indexes } = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename=$1",
      [t]
    );
    console.log("Indexes:", indexes.map(r => r.indexname).join("; ") || "none");
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
