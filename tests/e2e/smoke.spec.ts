import { test, expect } from "@playwright/test";

/**
 * Non-destructive smoke test for the Sckool Suite application.
 *
 * Reads admin credentials from environment variables and verifies that the
 * real login flow and admin dashboard load without runtime errors.
 *
 * Required env vars (set in .env.local):
 * - TEST_ADMIN_EMAIL
 * - TEST_ADMIN_PASSWORD
 */

test("smoke: admin login and dashboard load", async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;

  expect(email, "TEST_ADMIN_EMAIL must be set in .env.local").toBeTruthy();
  expect(password, "TEST_ADMIN_PASSWORD must be set in .env.local").toBeTruthy();

  // 1. Visit /login and verify the page responds without a 500 or redirect.
  const response = await page.goto("/login", { waitUntil: "load" });
  expect(response?.status(), "/login must not return a 500 error").not.toBe(500);

  const loginUrl = page.url();
  expect(
    loginUrl,
    "/login must not redirect to setup or an error page"
  ).toContain("/login");

  // 2. Confirm login form is present and there is no runtime error.
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const signInButton = page.getByRole("button", { name: "Sign In" });

  await expect(emailInput, "Email input must be visible").toBeVisible();
  await expect(passwordInput, "Password input must be visible").toBeVisible();
  await expect(signInButton, "Sign In button must be visible").toBeVisible();

  // Confirm no visible runtime error / 500 page.
  await expect(page.locator('h1:has-text("500")'), "Login page must not show a 500 heading").toHaveCount(0);
  await expect(page.locator('p:has-text("Something went wrong.")'), "Login page must not show a runtime error").toHaveCount(0);

  // 3. Fill in real credentials and submit.
  await emailInput.fill(email!);
  await passwordInput.fill(password!);
  await signInButton.click();

  // 4. Wait for successful redirect to the admin dashboard.
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 20_000 });

  const dashboardUrl = page.url();
  expect(dashboardUrl, "After login, user must land on /admin/dashboard").toContain(
    "/admin/dashboard"
  );

  // 5. Confirm the admin dashboard renders without runtime errors.
  await expect(page.locator("body"), "Dashboard body must be visible").toBeVisible();

  await expect(page.locator('h1:has-text("500")'), "Dashboard must not show a 500 heading").toHaveCount(0);
  await expect(page.locator('p:has-text("Something went wrong.")'), "Dashboard must not show a runtime error").toHaveCount(0);
  await expect(page.locator('text=Unauthorized'), "Dashboard must not show an unauthorized error").toHaveCount(0);

  // 6. Confirm a dashboard heading is rendered.
  // The dashboard is data-driven and may briefly show skeletons,
  // so wait for an actual heading to appear rather than a fixed h1.
  const heading = page.locator("h1, h2").filter({
    hasText: /Dashboard|Operations Center|Command Center/i,
  });
  await expect(heading, "Dashboard heading must be visible").toBeVisible({
    timeout: 30_000,
  });

  const headingText = (await heading.textContent()) ?? "";
  expect(
    headingText,
    "Dashboard heading must contain one of the expected admin titles"
  ).toMatch(/Dashboard|Operations Center|Command Center/i);
});
