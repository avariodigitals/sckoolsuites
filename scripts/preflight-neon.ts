/**
 * Read-only preflight checks for the focused Neon migration.
 *
 * Usage:
 *   npx tsx scripts/preflight-neon.ts
 */

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required.");
  process.exit(1);
}

function describeTarget(urlStr: string) {
  const url = new URL(urlStr);
  const hostname = url.hostname;
  const dbName = url.pathname.replace(/^\//, "");
  const sslMode = url.searchParams.get("sslmode") ?? "unspecified";
  const isPooled = hostname.includes("pooler");
  const isNeon = hostname.endsWith("neon.tech");
  return { hostname, dbName, isPooled, isNeon, sslMode };
}

async function main() {
  const target = describeTarget(DATABASE_URL);
  console.log("\n=== Neon migration preflight ===\n");
  console.log(`Target host class: ${target.isNeon ? "Neon" : "Non-Neon"}`);
  console.log(`Database name: ${target.dbName}`);
  console.log(`Endpoint type: ${target.isPooled ? "pooled" : "direct"}`);
  console.log(`SSL mode: ${target.sslMode}`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  let client;
  try {
    client = await pool.connect();

    const checks = [
      {
        name: "orphan parent.user_id",
        sql: `SELECT COUNT(*) AS cnt FROM parent p LEFT JOIN "user" u ON p.user_id = u.id WHERE p.user_id IS NOT NULL AND u.id IS NULL`,
      },
      {
        name: "orphan parent.school_id",
        sql: `SELECT COUNT(*) AS cnt FROM parent p LEFT JOIN school s ON p.school_id = s.id WHERE p.school_id IS NOT NULL AND s.id IS NULL`,
      },
      {
        name: "orphan admission_guardian.application_id",
        sql: `SELECT COUNT(*) AS cnt FROM admission_guardian g LEFT JOIN admission_application a ON g.application_id = a.id WHERE g.application_id IS NOT NULL AND a.id IS NULL`,
      },
      {
        name: "duplicate payment_method (school_id, code)",
        sql: `SELECT COUNT(*) AS cnt FROM payment_method GROUP BY school_id, code HAVING COUNT(*) > 1`,
      },
      {
        name: "existing payment_method table count",
        sql: `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_method'`,
      },
      {
        name: "existing school_bank_account table count",
        sql: `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_bank_account'`,
      },
      {
        name: "parent row count",
        sql: `SELECT COUNT(*) AS cnt FROM parent`,
      },
      {
        name: "admission_guardian row count",
        sql: `SELECT COUNT(*) AS cnt FROM admission_guardian`,
      },
    ];

    let failures = 0;
    for (const check of checks) {
      const { rows } = await client.query<{ cnt: number }>(check.sql);
      const value = Number(rows[0]?.cnt ?? 0);
      const ok = check.name.startsWith("orphan") || check.name.startsWith("duplicate")
        ? value === 0
        : true;
      if (!ok) failures++;
      const severity = check.name.startsWith("orphan") || check.name.startsWith("duplicate")
        ? (value === 0 ? "PASS" : "FAIL")
        : "INFO";
      console.log(`[${severity}] ${check.name}: ${value}`);
    }

    console.log("\n=== Preflight result ===");
    if (failures === 0) {
      console.log("[PASS] All migration-blocking preflight checks passed.");
    } else {
      console.log(`[FAIL] ${failures} migration-blocking check(s) failed. Do not proceed.`);
      process.exit(1);
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Preflight failed:", err);
  process.exit(1);
});
