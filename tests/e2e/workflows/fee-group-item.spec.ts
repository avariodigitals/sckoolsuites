import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Workflow 10: Create Fee Group and Fee Item
 *
 * Creates a session, term, and fee group as prerequisites, then creates a
 * fee item linked to the group and active academic period.
 */

test.setTimeout(120_000);

test("create fee group and fee item", async ({ page }) => {
  await loginAsAdmin(page);

  // 1. Create an active session and term.
  const timestamp = Date.now();
  const sessionName = `2026/2027 - ${timestamp}`;
  const termName = `First Term - ${timestamp}`;

  const sessionResponse = await page.request.post("/api/admin/academic/sessions", {
    data: { name: sessionName, startDate: "2026-09-01", endDate: "2027-07-31", status: "ACTIVE" },
  });
  expect(sessionResponse.status()).toBe(200);
  const sessionPayload = await sessionResponse.json();
  const sessionId = sessionPayload.id;

  const termResponse = await page.request.post("/api/admin/academic/terms", {
    data: { sessionId: String(sessionId), name: termName, startDate: "2026-09-05", endDate: "2026-12-18", resumptionDate: "2026-09-05", status: "ACTIVE" },
  });
  expect(termResponse.status()).toBe(200);
  const termPayload = await termResponse.json();
  const termId = termPayload.id;

  // 2. Create a fee group.
  const groupName = `Tuition Group - ${timestamp}`;
  const groupResponse = await page.request.post("/api/admin/finance/fee-groups", {
    data: { name: groupName, description: "Test fee group" },
  });
  expect(groupResponse.status()).toBe(200);
  const groupPayload = await groupResponse.json();
  const feeGroupId = groupPayload.group.id;

  // 3. Create a fee item linked to the group and period.
  const itemName = `Tuition Fee - ${timestamp}`;
  const itemResponse = await page.request.post("/api/admin/finance/fee-items", {
    data: {
      feeGroupId,
      name: itemName,
      category: "Tuition",
      amount: 50000,
      sessionId,
      termId,
    },
  });
  expect(itemResponse.status()).toBe(201);

  // 4. Verify the fee item appears in the list.
  const itemsResponse = await page.request.get("/api/admin/finance/fee-items");
  expect(itemsResponse.status()).toBe(200);
  const itemsPayload = await itemsResponse.json();
  const createdItem = itemsPayload.items.find((item: any) => item.name === itemName);
  expect(createdItem).toBeTruthy();
  expect(createdItem.feeGroupName).toBe(groupName);
  expect(createdItem.amount).toBe(50000);
});
