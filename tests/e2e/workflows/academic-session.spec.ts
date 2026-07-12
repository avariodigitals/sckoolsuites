import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Workflow 2: Create Academic Session
 *
 * Logs in as the seeded admin, opens the academic calendar page, creates a new
 * session, and activates it so it becomes the current academic context.
 */

test.setTimeout(120_000);

test("create academic session and set it as active", async ({ page }) => {
  await loginAsAdmin(page);

  // 1. Open the academic calendar page.
  await page.goto("/admin/settings/academic-calendar");
  await page.waitForURL("/admin/settings/academic-calendar", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  await expect(page.getByRole("heading", { name: "Academic Calendar & Setup" })).toBeVisible();

  // 2. Fill the Create Session form.
  const sessionName = `2026/2027 - ${Date.now()}`;
  const startDate = "2026-09-01";
  const endDate = "2027-07-31";

  const sessionForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Create Session" }) });
  await expect(sessionForm).toBeVisible();

  await sessionForm.locator('input[name="name"]').fill(sessionName);
  await sessionForm.locator('input[name="startDate"]').fill(startDate);
  await sessionForm.locator('input[name="endDate"]').fill(endDate);
  await sessionForm.locator('select[name="status"]').selectOption("ACTIVE");

  // 3. Submit the form and wait for the confirmation message.
  await sessionForm.getByRole("button", { name: "Create Session" }).click();

  const message = page.locator("p.text-sm.text-slate-600");
  await expect(message).toContainText("Session created", { timeout: 20_000 });

  // 4. Verify the new session appears in the Sessions list.
  const sessionsCard = page.getByRole("heading", { name: "Sessions" }).locator("xpath=../..");
  await expect(sessionsCard).toContainText(sessionName, { timeout: 20_000 });

  // 5. Set the new session as the active context.
  const sessionRow = sessionsCard.getByText(sessionName).locator("xpath=ancestor::div[contains(@class, 'rounded-md')][1]");
  await sessionRow.getByRole("button", { name: "Set Active" }).click();

  await expect(message).toContainText("Active session updated", { timeout: 20_000 });
  await expect(sessionRow).toContainText("Active Context", { timeout: 20_000 });
});
