import { execSync } from "child_process";
import { prisma } from "./db";
import { seedRoles, seedPrivileges, seedRolePrivileges } from "./privileges";

let bootstrapped = false;
let bootstrapError: string | null = null;

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )`,
      tableName
    );
    return Boolean((result as any)?.[0]?.exists);
  } catch {
    return false;
  }
}

async function runMigrations(): Promise<void> {
  try {
    execSync("npx prisma migrate deploy", {
      stdio: "pipe",
      timeout: 60_000,
      env: process.env,
    });
  } catch (err: any) {
    const msg = err?.stderr?.toString() ?? err?.message ?? String(err);
    if (msg.includes("already") || msg.includes("No pending migrations")) {
      return;
    }
    console.warn("[bootstrap] prisma migrate deploy skipped:", msg.substring(0, 200));
  }
}

async function runSeed(): Promise<void> {
  await seedRoles();
  await seedPrivileges();
  await seedRolePrivileges();
}

export async function bootstrapDatabase(): Promise<{ ok: boolean; error?: string }> {
  if (bootstrapped) {
    return { ok: bootstrapError === null, error: bootstrapError ?? undefined };
  }

  try {
    const hasMigrationsTable = await tableExists("_prisma_migrations");

    if (!hasMigrationsTable) {
      console.log("[bootstrap] Database is empty — running migrations...");
      await runMigrations();
    }

    console.log("[bootstrap] Running idempotent seed...");
    await runSeed();

    bootstrapped = true;
    bootstrapError = null;
    console.log("[bootstrap] Database ready.");
    return { ok: true };
  } catch (err: any) {
    bootstrapError = err?.message ?? String(err);
    bootstrapped = true;
    console.error("[bootstrap] Failed:", bootstrapError);
    return { ok: false, error: bootstrapError ?? undefined };
  }
}

export function isBootstrapped(): boolean {
  return bootstrapped;
}

export function getBootstrapError(): string | null {
  return bootstrapError;
}
