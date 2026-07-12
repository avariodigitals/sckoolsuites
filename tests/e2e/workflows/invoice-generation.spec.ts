import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Workflow 11: Generate Invoice
 *
 * Creates a session, term, class, student, fee group, and fee item as
 * prerequisites, then calls the invoice generation API and verifies the
 * created invoice and its items.
 */

test.setTimeout(120_000);

test("generate invoice for a student", async ({ page }) => {
  await loginAsAdmin(page);

  const timestamp = Date.now();

  // 1. Create an active session and term.
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

  // 2. Create a class group and class.
  const groupName = `Class Group - ${timestamp}`;
  const classGroupResponse = await page.request.post("/api/admin/class-groups", {
    data: { name: groupName },
  });
  expect(classGroupResponse.status()).toBe(201);
  const classGroupPayload = await classGroupResponse.json();
  const classGroupId = classGroupPayload.classGroup.id;

  const className = `JSS 1 - ${timestamp}`;
  const classResponse = await page.request.post("/api/admin/classes", {
    data: { name: className, classGroupId },
  });
  expect(classResponse.status()).toBe(201);
  const classPayload = await classResponse.json();
  const classId = classPayload.class.id;

  // 3. Create a student linked to the class.
  const studentName = `Student ${timestamp}`;
  const studentEmail = `student+${timestamp}@testschool.com`;
  const studentResponse = await page.request.post("/api/admin/students", {
    data: { name: studentName, email: studentEmail, gender: "MALE", age: 10, classId },
  });
  expect(studentResponse.status()).toBe(201);
  const studentPayload = await studentResponse.json();
  const studentId = studentPayload.student.id;

  // 4. Create a fee group and fee item linked to the academic period and class.
  const feeGroupName = `Tuition Group - ${timestamp}`;
  const feeGroupResponse = await page.request.post("/api/admin/finance/fee-groups", {
    data: { name: feeGroupName },
  });
  expect(feeGroupResponse.status()).toBe(200);
  const feeGroupPayload = await feeGroupResponse.json();
  const feeGroupId = feeGroupPayload.group.id;

  const feeItemName = `Tuition Fee - ${timestamp}`;
  const feeItemResponse = await page.request.post("/api/admin/finance/fee-items", {
    data: {
      feeGroupId,
      name: feeItemName,
      category: "Tuition",
      amount: 50000,
      sessionId,
      termId,
      classId,
    },
  });
  expect(feeItemResponse.status()).toBe(201);

  // 5. Generate the invoice.
  const generateResponse = await page.request.post("/api/admin/invoices/generate", {
    data: { studentId, sessionId, termId },
  });
  expect(generateResponse.status()).toBe(200);
  const generatePayload = await generateResponse.json();
  expect(generatePayload.ok).toBe(true);
  expect(generatePayload.invoice.studentName).toBe(studentName);
  expect(generatePayload.invoice.totalAmount).toBe(50000);
  expect(generatePayload.invoice.items.length).toBe(1);
  expect(generatePayload.invoice.items[0].name).toBe(feeItemName);

  // 6. Verify the invoice appears in the bills list.
  const billsResponse = await page.request.get("/api/admin/bills");
  expect(billsResponse.status()).toBe(200);
  const billsPayload = await billsResponse.json();
  const createdBill = billsPayload.bills.find((bill: any) => bill.studentName === studentName);
  expect(createdBill).toBeTruthy();
  expect(createdBill.totalAmount).toBe(50000);
  expect(createdBill.items[0].feeItemName).toBe(feeItemName);
});
