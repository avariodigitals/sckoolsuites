import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Workflow 3: Create Term
 *
 * Creates a session first (prerequisite), then creates a term linked to that
 * session and activates it.
 */

test.setTimeout(120_000);

test("create term linked to a session and activate it", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin/settings/academic-calendar");
  await page.waitForURL("/admin/settings/academic-calendar", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  await expect(page.getByRole("heading", { name: "Academic Calendar & Setup" })).toBeVisible();

  const sessionName = `2026/2027 - ${Date.now()}`;
  const startDate = "2026-09-01";
  const endDate = "2027-07-31";

  // 1. Create a session first so the term form has a session option.
  const sessionForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Create Session" }) });
  await sessionForm.locator('input[name="name"]').fill(sessionName);
  await sessionForm.locator('input[name="startDate"]').fill(startDate);
  await sessionForm.locator('input[name="endDate"]').fill(endDate);
  await sessionForm.locator('select[name="status"]').selectOption("ACTIVE");
  await sessionForm.getByRole("button", { name: "Create Session" }).click();

  const message = page.locator("p.text-sm.text-slate-600");
  await expect(message).toContainText("Session created", { timeout: 20_000 });

  // 2. Fill the Create Term form.
  const termName = `First Term - ${Date.now()}`;
  const termStart = "2026-09-05";
  const termEnd = "2026-12-18";
  const termResumption = "2026-09-05";

  const termForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Create Term" }) });
  await expect(termForm).toBeVisible();

  await termForm.locator('select[name="sessionId"]').selectOption({ label: sessionName });
  await termForm.locator('input[name="name"]').fill(termName);
  await termForm.locator('input[name="startDate"]').fill(termStart);
  await termForm.locator('input[name="endDate"]').fill(termEnd);
  await termForm.locator('input[name="resumptionDate"]').fill(termResumption);
  await termForm.locator('select[name="status"]').selectOption("ACTIVE");

  await termForm.getByRole("button", { name: "Create Term" }).click();

  await expect(message).toContainText("Term created", { timeout: 20_000 });

  // 3. Verify the term appears in the Terms list and activate it.
  const termsCard = page.getByRole("heading", { name: "Terms" }).locator("xpath=../..");
  await expect(termsCard).toContainText(termName, { timeout: 20_000 });

  const termRow = termsCard.getByText(termName).locator("xpath=ancestor::div[contains(@class, 'rounded-md')][1]");
  await termRow.getByRole("button", { name: "Set Active" }).click();

  await expect(message).toContainText("Active term updated", { timeout: 20_000 });
  await expect(termRow).toContainText("Active Context", { timeout: 20_000 });
});
