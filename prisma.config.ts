import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

const dbUrl = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "";

const isProductionDb =
  dbUrl.includes("neon.tech") ||
  dbUrl.includes("supabase.com") ||
  dbUrl.includes("railway.app") ||
  dbUrl.includes("render.com") ||
  (dbUrl.includes("sslmode=require") && !dbUrl.includes("localhost"));

if (isProductionDb && process.env["PRISMA_ALLOW_DESTRUCTIVE"] !== "true") {
  const destructiveFlags = ["--force-reset", "--accept-data-loss"];
  const args = process.argv.join(" ");
  if (destructiveFlags.some((f) => args.includes(f))) {
    console.error(
      "\n[SAFETY] Blocked destructive Prisma command on a production database.\n" +
        "The database URL appears to point to a managed/production provider.\n" +
        "To override, set PRISMA_ALLOW_DESTRUCTIVE=true in your environment.\n"
    );
    process.exit(1);
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: dbUrl,
  },
});
