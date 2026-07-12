import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Workflow 9: Parent Assignment
 *
 * Creates a parent and a student, then links the student to the parent
 * through the parent manager UI.
 */

test.setTimeout(120_000);

test("link a student to a parent", async ({ page }) => {
  await loginAsAdmin(page);

  // 1. Create prerequisite parent and student via API.
  const timestamp = Date.now();
  const parentName = `Parent ${timestamp}`;
  const parentEmail = `parent+${timestamp}@testschool.com`;
  const studentName = `Child ${timestamp}`;
  const studentEmail = `student+${timestamp}@testschool.com`;

  const parentResponse = await page.request.post("/api/admin/parents", {
    data: { name: parentName, email: parentEmail, password: "Password123" },
  });
  expect(parentResponse.status()).toBe(201);

  const studentResponse = await page.request.post("/api/admin/students", {
    data: { name: studentName, email: studentEmail, gender: "MALE", age: 10 },
  });
  expect(studentResponse.status()).toBe(201);

  // 2. Open the parent manager.
  await page.goto("/admin/parents");
  await page.waitForURL("/admin/parents", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "Parent Management" })).toBeVisible({ timeout: 20_000 });

  await expect(page.locator("text=Loading parents...")).toHaveCount(0, { timeout: 20_000 });

  // 3. Use the parent row's link-student select to assign the child.
  const parentRow = page.locator("tr").filter({ hasText: parentName });
  await expect(parentRow).toContainText("No children linked");

  const linkSelect = parentRow.locator("select").filter({ has: page.locator('option:has-text("+ Link student...")') });
  await linkSelect.selectOption(studentName);

  // 4. Verify the child is now linked.
  await expect(parentRow).toContainText(studentName, { timeout: 20_000 });
});
