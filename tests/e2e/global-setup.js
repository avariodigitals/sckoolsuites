const { execSync, spawn } = require("child_process");
const fs = require("fs");
const http = require("http");

const PG_DATA_DIR = "/tmp/sckoolsuite-pg-test";
const PG_PORT = 5433;
const DB_NAME = "sckoolsuite_test";
const TEST_PORT = 3002;

function log(msg) {
  console.log(`[globalSetup] ${msg}`);
}

function exec(cmd, opts = {}) {
  log(cmd);
  return execSync(cmd, { stdio: "inherit", env: process.env, ...opts });
}

function execSilent(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf-8", env: process.env, ...opts });
}

function isDbReady() {
  try {
    execSync(`pg_isready -p ${PG_PORT} -h localhost -q`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function httpGet(url, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, body }));
    });
    req.on("error", reject);
    req.on("timeout", () => reject(new Error("timeout")));
  });
}

async function waitForServer(url, maxMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await httpGet(url, 2000);
      if (res.status === 200) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Test server did not become ready at ${url}`);
}

async function stopPostgres() {
  try {
    log("Stopping test PostgreSQL server...");
    execSync(`pg_ctl -D ${PG_DATA_DIR} stop -m fast`, { stdio: "ignore" });
  } catch {
    log("Test PostgreSQL server was not running or could not be stopped.");
  }
}

function killPort3002() {
  try {
    const pids = execSync(`lsof -ti :${TEST_PORT}`, { encoding: "utf-8" }).trim().split("\n").filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // ignore
      }
    }
    log(`Killed previous process(es) on port ${TEST_PORT}: ${pids.join(", ") || "none"}`);
  } catch {
    log(`No previous process found on port ${TEST_PORT}.`);
  }
}

module.exports = async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Ensure tests/e2e/.env.test.local is loaded.");
  }
  if (!databaseUrl.includes("localhost:5433")) {
    throw new Error(`Refusing to run tests against a non-test database: ${databaseUrl}`);
  }

  // 1. Start isolated PostgreSQL cluster on port 5433.
  if (!fs.existsSync(PG_DATA_DIR)) {
    log("Initialising test PostgreSQL cluster...");
    exec(`initdb -D ${PG_DATA_DIR} -U sckool_test -A trust --encoding=UTF8 --locale=C --no-instructions`);
  }

  if (!isDbReady()) {
    log("Starting test PostgreSQL server...");
    exec(`pg_ctl -D ${PG_DATA_DIR} -l ${PG_DATA_DIR}/server.log start -o "-p ${PG_PORT}"`);

    let attempts = 0;
    while (!isDbReady() && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }
    if (!isDbReady()) {
      throw new Error("Test PostgreSQL server failed to start.");
    }
  } else {
    log("Test PostgreSQL server already running.");
  }

  // 2. Create test database.
  try {
    execSilent(`psql -p ${PG_PORT} -h localhost -U sckool_test -d postgres -c "CREATE DATABASE ${DB_NAME};"`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      log(`Database ${DB_NAME} already exists.`);
    } else {
      throw err;
    }
  }

  // 3. Apply Prisma schema and reset any data.
  log("Running prisma db push --force-reset...");
  exec(`npx prisma db push --force-reset --accept-data-loss`);

  // 4. Seed the minimum required data.
  log("Seeding test database...");
  exec(`node prisma/seed.js`);

  // 5. Start the Next.js test server on port 3002.
  killPort3002();
  log(`Starting Next.js test server on port ${TEST_PORT}...`);
  const serverOut = fs.openSync(`/tmp/sckoolsuite-next-test-${TEST_PORT}.log`, "a");
  const serverErr = fs.openSync(`/tmp/sckoolsuite-next-test-${TEST_PORT}.log`, "a");
  const server = spawn("node", ["node_modules/next/dist/bin/next", "dev"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NEXT_DIST_DIR: ".next-test",
      NODE_ENV: "development",
    },
    detached: true,
    stdio: ["ignore", serverOut, serverErr],
  });

  await waitForServer(`http://localhost:${TEST_PORT}/login`);
  log("Next.js test server is ready.");

  // Return teardown function (called by Playwright after all tests).
  return async function () {
    log("Stopping Next.js test server...");
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // ignore
    }
    await new Promise((resolve) => {
      server.on("exit", resolve);
      setTimeout(() => {
        try {
          process.kill(-server.pid, "SIGKILL");
        } catch {
          // ignore
        }
        resolve(undefined);
      }, 10000);
    });
    killPort3002();
    fs.closeSync(serverOut);
    fs.closeSync(serverErr);
    await stopPostgres();
  };
};

