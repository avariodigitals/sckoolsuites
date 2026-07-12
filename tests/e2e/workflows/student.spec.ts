import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Workflow 8: Create Student
 */

test.setTimeout(120_000);

test("create student", async ({ page }) => {
  await loginAsAdmin(page);

  // 1. Create a class as prerequisite.
  const groupName = `Test Group - ${Date.now()}`;
  const className = `JSS 1 - ${Date.now()}`;

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
  const classPayload = await classResponse.json();
  const classId = String(classPayload.class.id);

  // 2. Open the student manager.
  await page.goto("/admin/students");
  await page.waitForURL("/admin/students", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "Student Management" })).toBeVisible({ timeout: 20_000 });

  await expect(page.locator("text=Loading students...")).toHaveCount(0, { timeout: 20_000 });

  // 3. Open the create form.
  await page.getByRole("button", { name: "+ Add Student" }).click();

  const timestamp = Date.now();
  const studentName = `Student ${timestamp}`;
  const studentEmail = `student+${timestamp}@testschool.com`;

  await page.locator('input[placeholder="Full name *"]').fill(studentName);
  await page.locator('input[placeholder="Email address *"]').fill(studentEmail);
  await page.locator('input[placeholder="Age *"]').fill("10");

  const classSelect = page.locator("select").filter({ has: page.locator('option:has-text("Select class")') });
  await expect(classSelect.locator(`option[value="${classId}"]`)).toBeAttached({ timeout: 10_000 });
  await classSelect.selectOption(classId);

  await page.getByRole("button", { name: "Create Student" }).click();

  // 4. Verify the student appears in the table.
  const studentsTable = page.getByRole("table").filter({ has: page.locator('th:has-text("Name")') });
  await expect(studentsTable).toContainText(studentName, { timeout: 20_000 });
  await expect(studentsTable).toContainText(studentEmail, { timeout: 20_000 });
});
