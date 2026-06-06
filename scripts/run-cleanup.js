const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/DATABASE_URL=(.+)/);

if (!match) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const databaseUrl = match[1].trim().replace(/^["']|["']$/g, "");
const cleanupPath = path.join(__dirname, "cleanup.sql");

console.log("Running cleanup.sql...");
try {
  const result = execSync(`psql "${databaseUrl}" -f "${cleanupPath}"`, {
    encoding: "utf8",
    stdio: "inherit",
  });
  console.log("Cleanup completed successfully.");
} catch (error) {
  console.error("Cleanup failed:", error.message);
  process.exit(1);
}
