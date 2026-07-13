import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

type DbGlobal = {
  __sckoolsuite_db_pool__?: Pool;
  __sckoolsuite_db_prisma__?: PrismaClient;
};

const globalForDb = globalThis as unknown as DbGlobal;
const isDev = process.env.NODE_ENV === "development";

const rawUrl = process.env.DATABASE_URL ?? "";
const sslDisabled =
  process.env.PG_SSL_DISABLED === "true" || rawUrl.includes("sslmode=disable");

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
    console.warn(
      `[db] Invalid numeric env value "${value}", using fallback ${fallback}`
    );
    return fallback;
  }
  return parsed;
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: rawUrl || undefined,
    ssl: sslDisabled ? false : true,
    max: parsePositiveInt(
      process.env.PG_POOL_MAX ?? process.env.DB_POOL_MAX,
      5
    ),
    idleTimeoutMillis: parsePositiveInt(
      process.env.DB_IDLE_TIMEOUT_MS,
      30000
    ),
    connectionTimeoutMillis: parsePositiveInt(
      process.env.DB_CONNECTION_TIMEOUT_MS,
      30000
    ),
  });

  pool.on("error", (err) => {
    console.error("[db] Unexpected pool error:", err.message);
  });

  return pool;
}

function createPrisma(pool: Pool): PrismaClient {
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: isDev ? ["error", "warn"] : ["error"],
  });
}

const isNewPool = !globalForDb.__sckoolsuite_db_pool__;

export const pool: Pool = globalForDb.__sckoolsuite_db_pool__ ?? createPool();
export const prisma: PrismaClient =
  globalForDb.__sckoolsuite_db_prisma__ ?? createPrisma(pool);

if (!globalForDb.__sckoolsuite_db_pool__) {
  globalForDb.__sckoolsuite_db_pool__ = pool;
}
if (!globalForDb.__sckoolsuite_db_prisma__) {
  globalForDb.__sckoolsuite_db_prisma__ = prisma;
}

if (isDev && isNewPool) {
  console.log("[db] Prisma + pg singleton initialized", {
    pid: process.pid,
    totalCount: (pool as unknown as { totalCount?: number }).totalCount ?? 0,
    idleCount: (pool as unknown as { idleCount?: number }).idleCount ?? 0,
  });
}

export async function withTransaction(
  callback: ((tx: any) => Promise<any>) | any[]
): Promise<any> {
  if (Array.isArray(callback)) {
    return prisma.$transaction(callback);
  }
  return prisma.$transaction(callback);
}

// Helper function for direct SQL queries
export async function query<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(sql, params);
  } catch (err: any) {
    console.error("[db] Query error:", err.message, "| SQL:", sql.substring(0, 120));
    throw err;
  }
}

// Helper for single row queries
export async function queryOne<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  try {
    const result = await pool.query<T>(sql, params);
    return result.rows[0] || null;
  } catch (err: any) {
    console.error("[db] queryOne error:", err.message, "| SQL:", sql.substring(0, 120));
    throw err;
  }
}

// Helper for many rows
export async function queryMany<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  try {
    const result = await pool.query<T>(sql, params);
    return result.rows;
  } catch (err: any) {
    console.error("[db] queryMany error:", err.message, "| SQL:", sql.substring(0, 120));
    throw err;
  }
}

// For direct client access
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
  await prisma.$disconnect();
}

export default pool;
