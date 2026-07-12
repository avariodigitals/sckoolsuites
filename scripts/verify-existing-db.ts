/**
 * Read-only verification script for existing SckoolSuite databases.
 *
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host:5432/db" npx tsx scripts/verify-existing-db.ts
 *
 * This script performs no writes. It reports:
 *   - required system tables and columns
 *   - required roles and duplicate roles
 *   - payment-method / bank-account / template tables and columns
 *   - Prisma migration-table state
 *   - schema drift between the database and prisma/schema.prisma
 */

import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { Pool } from "pg";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const REQUIRED_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "HEAD_OF_SCHOOL",
  "PRINCIPAL",
  "ACCOUNTANT",
  "REGISTRAR",
  "TEACHER",
  "PARENT",
  "STUDENT",
  "RECEPTIONIST",
];

// Prisma model names. Physical table names are resolved from @@map in schema.prisma.
const REQUIRED_MODELS = [
  "School",
  "SchoolBranding",
  "Role",
  "Privilege",
  "RolePrivilege",
  "UserPrivilege",
  "User",
  "Session",
  "Term",
  "Class",
  "ClassArm",
  "Subject",
  "Student",
  "Parent",
  "Teacher",
  "FeeGroup",
  "FeeItem",
  "Invoice",
  "InvoiceItem",
  "Payment",
  "Receipt",
  "Score",
  "Result",
  "Attendance",
  "Income",
  "Expense",
  "IncomeCategory",
  "ExpenseCategory",
  "Announcement",
  "SchoolSetting",
  "AdmissionApplication",
  "AdmissionGuardian",
  "AdmissionDocument",
  "AdmissionQualification",
  "PaymentMethod",
  "SchoolBankAccount",
  "SchoolTemplate",
];

// Required fields per Prisma model. Physical column names are resolved from @map.
const REQUIRED_FIELDS: Record<string, string[]> = {
  Income: ["paymentMethod"],
  Expense: ["paymentMethod"],
  SchoolTemplate: ["termName"],
  Result: ["fileUrl", "fileName", "uploadedById"],
  AdmissionApplication: ["testScore"],
  AdmissionGuardian: ["occupation", "employerName", "workAddress", "workPhone", "homeAddress", "idDocumentType", "idDocumentNumber", "idDocumentUrl", "photoUrl", "isPrimary"],
  Parent: ["occupation", "employerName", "workAddress", "workPhone", "homeAddress", "idDocumentType", "idDocumentNumber", "idDocumentUrl", "photoUrl"],
};

interface SchemaMaps {
  tableMap: Map<string, string>;
  columnMap: Map<string, Map<string, string>>;
}

function loadSchemaMaps(schemaPath = path.join(process.cwd(), "prisma", "schema.prisma")): SchemaMaps {
  const source = readFileSync(schemaPath, "utf-8");
  const tableMap = new Map<string, string>();
  const columnMap = new Map<string, Map<string, string>>();

  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  let match: RegExpExecArray | null;
  while ((match = modelRegex.exec(source)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const tableMapMatch = body.match(/@@map\("([^"]+)"\)/);
    const tableName = tableMapMatch ? tableMapMatch[1] : modelName.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
    tableMap.set(modelName, tableName);

    const cols = new Map<string, string>();
    const fieldRegex = /^\s+(\w+)\s+/gm;
    const fieldMatches = [...body.matchAll(fieldRegex)];
    for (let i = 0; i < fieldMatches.length; i++) {
      const fieldName = fieldMatches[i][1];
      const fieldStart = fieldMatches[i].index ?? 0;
      const fieldEnd = i < fieldMatches.length - 1 ? fieldMatches[i + 1].index : body.length;
      const fieldBlock = body.slice(fieldStart, fieldEnd);
      const colMapMatch = fieldBlock.match(/@map\("([^"]+)"\)/);
      const colName = colMapMatch ? colMapMatch[1] : fieldName.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
      cols.set(fieldName, colName);
    }
    columnMap.set(modelName, cols);
  }
  return { tableMap, columnMap };
}

const { tableMap, columnMap } = loadSchemaMaps();

const REQUIRED_TABLES = REQUIRED_MODELS.map((m) => {
  const t = tableMap.get(m);
  if (!t) throw new Error(`Prisma model ${m} not found in schema.prisma`);
  return t;
});

const FOCUSED_TABLES = ["payment_method", "school_bank_account"];

const FOCUSED_COLUMNS: Array<{ table: string; column: string; label: string }> = [
  { table: "parent", column: "occupation", label: "parent occupation" },
  { table: "parent", column: "employer_name", label: "parent employer_name" },
  { table: "parent", column: "work_address", label: "parent work_address" },
  { table: "parent", column: "work_phone", label: "parent work_phone" },
  { table: "parent", column: "home_address", label: "parent home_address" },
  { table: "parent", column: "id_document_type", label: "parent id_document_type" },
  { table: "parent", column: "id_document_number", label: "parent id_document_number" },
  { table: "parent", column: "id_document_url", label: "parent id_document_url" },
  { table: "parent", column: "photo_url", label: "parent photo_url" },
  { table: "admission_guardian", column: "occupation", label: "admission_guardian occupation" },
  { table: "admission_guardian", column: "employer_name", label: "admission_guardian employer_name" },
  { table: "admission_guardian", column: "work_address", label: "admission_guardian work_address" },
  { table: "admission_guardian", column: "work_phone", label: "admission_guardian work_phone" },
  { table: "admission_guardian", column: "home_address", label: "admission_guardian home_address" },
  { table: "admission_guardian", column: "id_document_type", label: "admission_guardian id_document_type" },
  { table: "admission_guardian", column: "id_document_number", label: "admission_guardian id_document_number" },
  { table: "admission_guardian", column: "id_document_url", label: "admission_guardian id_document_url" },
  { table: "admission_guardian", column: "photo_url", label: "admission_guardian photo_url" },
  { table: "admission_guardian", column: "is_primary", label: "admission_guardian is_primary" },
];

const FOCUSED_FKS: Array<{ table: string; name: string; label: string }> = [
  { table: "parent", name: "parent_user_id_fkey", label: "parent.user_id -> user.id" },
  { table: "parent", name: "parent_school_id_fkey", label: "parent.school_id -> school.id" },
  { table: "admission_guardian", name: "admission_guardian_application_id_fkey", label: "admission_guardian.application_id -> admission_application.id" },
];

const REQUIRED_COLUMNS: Array<{ table: string; column: string }> = [];
for (const [model, fields] of Object.entries(REQUIRED_FIELDS)) {
  const table = tableMap.get(model);
  if (!table) throw new Error(`Prisma model ${model} not found in schema.prisma`);
  for (const field of fields) {
    const col = columnMap.get(model)?.get(field);
    if (!col) throw new Error(`Prisma field ${model}.${field} not found in schema.prisma`);
    REQUIRED_COLUMNS.push({ table, column: col });
  }
}

type Severity = "PASS" | "WARNING" | "FAIL";

interface CheckResult {
  severity: Severity;
  message: string;
}

function logSeverity(severity: Severity, message: string): CheckResult {
  return { severity, message };
}

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  const results: CheckResult[] = [];
  let client;
  try {
    client = await pool.connect();
    const { rows: tables } = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const tableNames = new Set(tables.map((t) => t.table_name));

    // Focused migration verification (separate from broad drift)
    console.log("\n1. Focused Migration Verification");
    console.log("==================================\n");
    for (const table of FOCUSED_TABLES) {
      if (tableNames.has(table)) {
        results.push(logSeverity("PASS", `Focused table exists: ${table}`));
      } else {
        results.push(logSeverity("FAIL", `Focused table missing: ${table}`));
      }
    }

    for (const { table, column, label } of FOCUSED_COLUMNS) {
      if (!tableNames.has(table)) continue;
      const { rows } = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [table, column]
      );
      if (rows.length > 0) {
        results.push(logSeverity("PASS", `Focused column exists: ${label}`));
      } else {
        results.push(logSeverity("FAIL", `Focused column missing: ${label}`));
      }
    }

    for (const { table, name, label } of FOCUSED_FKS) {
      if (!tableNames.has(table)) continue;
      const { rows } = await client.query(
        `SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND conname = $2`,
        [table, name]
      );
      if (rows.length > 0) {
        results.push(logSeverity("PASS", `Focused foreign key exists: ${label}`));
      } else {
        results.push(logSeverity("FAIL", `Focused foreign key missing: ${label}`));
      }
    }

    for (const table of REQUIRED_TABLES) {
      if (tableNames.has(table)) {
        results.push(logSeverity("PASS", `Table exists: ${table}`));
      } else {
        results.push(logSeverity("FAIL", `Missing table: ${table}`));
      }
    }

    for (const { table, column } of REQUIRED_COLUMNS) {
      if (!tableNames.has(table)) continue;
      const { rows } = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [table, column]
      );
      if (rows.length > 0) {
        results.push(logSeverity("PASS", `Column exists: ${table}.${column}`));
      } else {
        results.push(logSeverity("FAIL", `Missing column: ${table}.${column}`));
      }
    }

    const { rows: roles } = await client.query(
      `SELECT name, COUNT(*) OVER (PARTITION BY name) AS cnt FROM role ORDER BY name`
    );
    const roleNames = new Set(roles.map((r) => r.name));
    const duplicates = roles.filter((r) => Number(r.cnt) > 1).map((r) => r.name);

    for (const role of REQUIRED_ROLES) {
      if (roleNames.has(role)) {
        results.push(logSeverity("PASS", `Role exists: ${role}`));
      } else {
        results.push(logSeverity("FAIL", `Missing role: ${role}`));
      }
    }

    if (duplicates.length > 0) {
      results.push(logSeverity("FAIL", `Duplicate roles detected: ${[...new Set(duplicates)].join(", ")}`));
    } else {
      results.push(logSeverity("PASS", "No duplicate roles"));
    }

    const { rows: migrations } = await client.query(
      `SELECT migration_name FROM _prisma_migrations ORDER BY finished_at NULLS LAST, started_at`
    ).catch(() => ({ rows: [] }));
    if (migrations.length === 0) {
      results.push(logSeverity("FAIL", "Prisma migration table is empty or missing"));
    } else {
      const migrationList = migrations.map((m) => m.migration_name).join(", ");
      results.push(logSeverity("PASS", `Prisma migrations recorded: ${migrationList}`));
    }

    const { rows: baseline } = await client.query(
      `SELECT 1 FROM _prisma_migrations WHERE migration_name = '20260711110000_initial_baseline' LIMIT 1`
    ).catch(() => ({ rows: [] }));
    if (baseline.length > 0) {
      results.push(logSeverity("PASS", "Baseline migration 20260711110000_initial_baseline is recorded"));
    } else {
      results.push(logSeverity("FAIL", "Baseline migration 20260711110000_initial_baseline is NOT recorded"));
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }

  // Broad schema drift check (read-only). This reports the remaining drift after
  // the focused migration; it is kept separate from the focused checks above.
  const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
  const drift = spawnSync(
    prismaBin,
    ["migrate", "diff", "--from-schema", "prisma/schema.prisma", "--to-config-datasource", "prisma.config.ts", "--exit-code"],
    { stdio: "pipe", encoding: "utf-8" }
  );

  if (drift.status === 0) {
    results.push(logSeverity("PASS", "No schema drift detected between prisma/schema.prisma and the database"));
  } else if (drift.status === 2) {
    const driftText = drift.stdout + drift.stderr;
    // Classify drift: naming-only differences are warnings; material differences are failures.
    const materialPatterns = [/Removed tables?/i, /Removed column/i, /Altered column/i, /Removed foreign key/i, /Removed unique/i, /Removed index(?! renamed)/i];
    const namingOnlyPatterns = [/Renamed index/i];
    const hasMaterial = materialPatterns.some((p) => p.test(driftText));
    const hasNamingOnly = namingOnlyPatterns.some((p) => p.test(driftText));
    if (hasMaterial) {
      results.push(logSeverity("FAIL", "Broad schema drift detected (material differences remain after focused migration)"));
    } else if (hasNamingOnly) {
      results.push(logSeverity("WARNING", "Broad schema drift detected (only index/constraint naming differences remain)"));
    } else {
      results.push(logSeverity("FAIL", "Broad schema drift detected between prisma/schema.prisma and the database"));
    }
    console.error("\n--- Prisma migrate diff output (broad drift) ---\n" + driftText);
  } else {
    results.push(logSeverity("FAIL", `Schema drift check failed: ${drift.stderr || drift.stdout}`));
  }

  // Print results
  console.log("\n2. Existing Database Verification Report");
  console.log("=========================================\n");
  let failures = 0;
  let warnings = 0;
  for (const r of results) {
    console.log(`[${r.severity}] ${r.message}`);
    if (r.severity === "FAIL") failures++;
    if (r.severity === "WARNING") warnings++;
  }

  console.log("\n=====================================");
  if (failures === 0 && warnings === 0) {
    console.log("[PASS] All checks passed.");
    process.exit(0);
  } else if (failures === 0) {
    console.log(`[WARNING] ${warnings} warning(s). Review before running migrate resolve/deploy.`);
    process.exit(0);
  } else {
    console.log(`[FAIL] ${failures} check(s) failed. Resolve the issues before running migrate resolve/deploy.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
