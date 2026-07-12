import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Workflow 4: Create Class
 *
 * Creates a class group via the API (prerequisite because no UI currently exists
 * in the Class Manager), then creates a class through the class manager UI.
 */

test.setTimeout(120_000);

test("create class group and class", async ({ page }) => {
  await loginAsAdmin(page);

  // 1. Create a class group prerequisite.
  const groupName = `Test Group - ${Date.now()}`;
  const className = `JSS 1 - ${Date.now()}`;

  const groupResponse = await page.request.post("/api/admin/class-groups", {
    data: { name: groupName },
  });
  expect(groupResponse.status()).toBe(201);
  const groupPayload = await groupResponse.json();
  const classGroupId = String(groupPayload.classGroup.id);

  // 2. Open the class manager.
  await page.goto("/admin/classes");
  await page.waitForURL("/admin/classes", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "Class Builder" })).toBeVisible();

  // 3. Wait for class manager to load.
  await expect(page.locator("text=Loading classes...")).toHaveCount(0, { timeout: 20_000 });

  // 4. Fill the class form.
  await page.locator('input[placeholder="Class name * (e.g., JSS 1, SS 2)"]').fill(className);
  await page.locator("select").filter({ has: page.locator('option:has-text("Select class group *")') }).selectOption(classGroupId);

  await page.getByRole("button", { name: "Create Class" }).click();

  // 5. Verify the class appears in the list.
  const classesCard = page.getByRole("heading", { name: "Classes" }).locator("xpath=../..");
  await expect(classesCard).toContainText(className, { timeout: 20_000 });
});
