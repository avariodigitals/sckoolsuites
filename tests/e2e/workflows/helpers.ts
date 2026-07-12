import { type Page, expect } from "@playwright/test";

/**
 * Shared helper: sign in as the seeded admin user on the workflow test server.
 *
 * This helper does not rely on automatic redirects from the login form.
 * It waits for the credentials callback to succeed, polls the session
 * endpoint until authenticated, and then explicitly navigates to the
 * admin dashboard so fragile redirect timing cannot break the test.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set in tests/e2e/.env.test.local");
  }

  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  await page.getByRole("button", { name: "Sign In" }).click();

  // The login form uses a server action. Wait for any in-flight navigation
  // or network activity to settle, then poll the session endpoint until it
  // shows an authenticated user.
  await page.waitForLoadState("networkidle");

  // Poll the session endpoint until it shows an authenticated user.
  await expect.poll(
    async () => {
      const sessionRes = await page.request.get("/api/auth/session");
      const session = await sessionRes.json().catch(() => ({}));
      return session?.user?.role ? "authenticated" : "unauthenticated";
    },
    {
      message: "Session did not become authenticated after login",
      timeout: 30_000,
    }
  ).toBe("authenticated");

  // Navigate directly to the admin dashboard, regardless of where the
  // automatic redirect left the browser.
  await page.goto("/admin/dashboard");
  await expect(page.locator("body")).toBeVisible();

  // Confirm we did not get redirected back to the login page.
  const url = page.url();
  if (!url.includes("/admin")) {
    throw new Error(`Expected to land on an admin page but got ${url}`);
  }
}
