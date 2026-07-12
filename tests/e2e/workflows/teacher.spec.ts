import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Workflow 6: Create Teacher
 */

test.setTimeout(120_000);

test("create teacher", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin/teachers");
  await page.waitForURL("/admin/teachers", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "Staff & Teacher Management" })).toBeVisible({ timeout: 20_000 });

  await expect(page.locator("text=Loading teachers...")).toHaveCount(0, { timeout: 20_000 });

  const timestamp = Date.now();
  const teacherName = `Teacher ${timestamp}`;
  const teacherEmail = `teacher+${timestamp}@testschool.com`;

  await page.locator('input[placeholder="Full name *"]').fill(teacherName);
  await page.locator('input[type="email"]').fill(teacherEmail);
  await page.locator('input[type="password"]').fill("Password123");

  await page.getByRole("button", { name: "Create Teacher" }).click();

  const teachersTable = page.getByRole("table").filter({ has: page.locator('th:has-text("Name")') });
  await expect(teachersTable).toContainText(teacherName, { timeout: 20_000 });
  await expect(teachersTable).toContainText(teacherEmail, { timeout: 20_000 });
});
