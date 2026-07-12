import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Ensure we do NOT inherit production database credentials from the shell.
delete process.env.DATABASE_URL;
delete process.env.NEXTAUTH_URL;
delete process.env.NEXTAUTH_SECRET;

// Load only the test environment variables.
// NODE_ENV is read-only in Next.js types, so cast to any for runtime assignment.
(process.env as any).NODE_ENV = "test";
loadEnvConfig(process.cwd() + "/tests/e2e", true);

export default defineConfig({
  testDir: "./tests/e2e/workflows",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.js",
  use: {
    baseURL: "http://localhost:3002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
