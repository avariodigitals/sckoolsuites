import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Workflow 5: Create Subject
 *
 * Creates a class group and class as prerequisites, then creates a subject
 * linked to that class through the subject manager UI.
 */

test.setTimeout(120_000);

test("create subject linked to a class", async ({ page }) => {
  await loginAsAdmin(page);

  // 1. Create prerequisites: class group and class.
  const groupName = `Test Group - ${Date.now()}`;
  const className = `JSS 1 - ${Date.now()}`;
  const subjectName = `Mathematics - ${Date.now()}`;

  const groupResponse = await page.request.post("/api/admin/class-groups", {
    data: { name: groupName },
  });
  expect(groupResponse.status()).toBe(201);
  const groupPayload = await groupResponse.json();
  const classGroupId = groupPayload.classGroup.id;

  const classResponse = await page.request.post("/api/admin/classes", {
    data: { name: className, classGroupId },
  });
  expect(classResponse.status()).toBe(201);

  // 2. Open the subject manager.
  await page.goto("/admin/subjects");
  await page.waitForURL("/admin/subjects", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "Subject Management" })).toBeVisible({ timeout: 20_000 });

  // 3. Wait for data to load.
  await expect(page.locator("text=Loading subjects...")).toHaveCount(0, { timeout: 20_000 });

  // 4. Fill the subject form.
  await page.locator('input[placeholder="Subject name * (e.g., Mathematics)"]').fill(subjectName);
  await page.locator("select").filter({ has: page.locator('option:has-text("Select class (optional)")') }).selectOption(className);

  await page.getByRole("button", { name: "Create Subject" }).click();

  // 5. Verify the subject appears in the table.
  const subjectsTable = page.getByRole("table").filter({ has: page.locator('th:has-text("Name")') });
  await expect(subjectsTable).toContainText(subjectName, { timeout: 20_000 });
  await expect(subjectsTable).toContainText(className, { timeout: 20_000 });
});
