import { test, expect } from "@playwright/test";

test.setTimeout(120_000);

test("role privilege manager loads and allows toggling a role privilege", async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;

  expect(email, "TEST_ADMIN_EMAIL must be set in .env.test.local").toBeTruthy();
  expect(password, "TEST_ADMIN_PASSWORD must be set in .env.test.local").toBeTruthy();

  // Login as the seeded admin user.
  await page.goto("/login", { waitUntil: "load" });
  await page.locator('input[type="email"]').fill(email as string);
  await page.locator('input[type="password"]').fill(password as string);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 30_000 });

  // Navigate to the roles/privileges screen.
  await page.goto("/admin/roles", { waitUntil: "load" });
  await expect(page.locator("text=Select Role")).toBeVisible();

  // HEAD_OF_SCHOOL role should appear in the role list.
  const headOfSchoolButton = page.locator('button:has-text("Head of School")');
  await expect(headOfSchoolButton).toBeVisible();

  // Select the Head of School role.
  await headOfSchoolButton.click();
  await expect(page.locator('h3:has-text("Privileges: Head of School")')).toBeVisible();

  // At least one privilege toggle should be present.
  const firstToggleInput = page.locator('input[type="checkbox"]').first();
  await expect(firstToggleInput).toBeAttached();

  // The visible toggle is the parent <label>; the checkbox is sr-only.
  const firstToggleLabel = firstToggleInput.locator("xpath=..");
  await expect(firstToggleLabel).toBeVisible();

  // Verify toggling a privilege works and persists after reload.
  const initiallyChecked = await firstToggleInput.isChecked();
  await firstToggleLabel.click();
  await expect(firstToggleInput).not.toBeChecked({ timeout: 5_000 });

  await page.reload({ waitUntil: "load" });
  await page.locator('button:has-text("Head of School")').click();
  const reloadedInput = page.locator('input[type="checkbox"]').first();
  await expect(reloadedInput).not.toBeChecked();

  // Restore original state so the test DB remains consistent.
  if (initiallyChecked) {
    await reloadedInput.locator("xpath=..").click();
    await expect(page.locator('input[type="checkbox"]').first()).toBeChecked();
  }
});
