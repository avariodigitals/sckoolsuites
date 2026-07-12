import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Workflow 7: Create Parent
 */

test.setTimeout(120_000);

test("create parent", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin/parents");
  await page.waitForURL("/admin/parents", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "Parent Management" })).toBeVisible({ timeout: 20_000 });

  await expect(page.locator("text=Loading parents...")).toHaveCount(0, { timeout: 20_000 });

  const timestamp = Date.now();
  const parentName = `Parent ${timestamp}`;
  const parentEmail = `parent+${timestamp}@testschool.com`;

  await page.locator('input[placeholder="Full name *"]').fill(parentName);
  await page.locator('input[type="email"]').fill(parentEmail);
  await page.locator('input[type="password"]').fill("Password123");

  await page.getByRole("button", { name: "Create Parent" }).click();

  const parentsTable = page.getByRole("table").filter({ has: page.locator('th:has-text("Name")') });
  await expect(parentsTable).toContainText(parentName, { timeout: 20_000 });
  await expect(parentsTable).toContainText(parentEmail, { timeout: 20_000 });
});
