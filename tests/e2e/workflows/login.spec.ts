import { test, expect } from "@playwright/test";

/**
 * Workflow 1: Login
 *
 * Verifies the seeded admin can sign in through the real login form and reach
 * the admin dashboard on the isolated test server (http://localhost:3002).
 */

test.setTimeout(60_000);

test("login: seeded admin signs in and reaches dashboard", async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;

  expect(email, "TEST_ADMIN_EMAIL must be set").toBeTruthy();
  expect(password, "TEST_ADMIN_PASSWORD must be set").toBeTruthy();

  // 1. Load login page and confirm form is present.
  const loginResponse = await page.goto("/login", { waitUntil: "load" });
  expect(loginResponse?.status(), "/login must not return 500").not.toBe(500);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

  // 2. Fill in credentials and submit.
  await page.locator('input[type="email"]').fill(email as string);
  await page.locator('input[type="password"]').fill(password as string);
  await page.getByRole("button", { name: "Sign In" }).click();

  // 3. Wait for redirect away from login and into the admin area.
  await page.waitForURL((url) => url.pathname.startsWith("/admin"), {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  expect(page.url()).toContain("/admin");

  // 4. Dashboard should render without runtime errors.
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator('h1:has-text("500")')).toHaveCount(0);
  await expect(page.locator('p:has-text("Something went wrong.")')).toHaveCount(0);
  await expect(page.locator('text=Unauthorized')).toHaveCount(0);

  // 5. Confirm a primary dashboard heading is visible.
  const heading = page.locator("h1");
  await expect(heading).toBeVisible();
  const headingText = (await heading.textContent()) ?? "";
  expect(headingText).toMatch(/Dashboard|Operations Center|Command Center|Admin|Welcome/i);
});
