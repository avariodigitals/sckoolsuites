import { test, expect } from "@playwright/test";

test.setTimeout(120_000);

test("environment verification: test DB, seed, login, and dashboard", async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;

  expect(email, "TEST_ADMIN_EMAIL must be set in .env.test.local").toBeTruthy();
  expect(password, "TEST_ADMIN_PASSWORD must be set in .env.test.local").toBeTruthy();

  // 1. Database connectivity and isolation
  const response = await page.goto("/api/test-db", { waitUntil: "load" });
  expect(response?.status()).toBe(200);

  const body = await response?.json();
  expect(body.status).toBe("connected");
  expect(body.database).toBe("sckoolsuite_test");

  // 2. Login page loads without 500
  const loginResponse = await page.goto("/login", { waitUntil: "load" });
  expect(loginResponse?.status()).not.toBe(500);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();

  // 3. Sign in as seeded admin
  await page.locator('input[type="email"]').fill(email as string);
  await page.locator('input[type="password"]').fill(password as string);
  await page.getByRole("button", { name: "Sign In" }).click();

  // 4. Wait for navigation away from /login (login action redirects to /).
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 30_000 });

  // 5. Confirm the session works by loading the admin dashboard directly.
  const dashboardResponse = await page.goto("/admin/dashboard", { waitUntil: "load" });
  expect(dashboardResponse?.status()).not.toBe(500);
  expect(page.url()).toContain("/admin/dashboard");

  // 6. Dashboard renders without runtime/500/unauthorized errors
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator('h1:has-text("500")')).toHaveCount(0);
  await expect(page.locator('p:has-text("Something went wrong.")')).toHaveCount(0);
  await expect(page.locator('text=Unauthorized')).toHaveCount(0);
});
