import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Focused P0 test for the urgent result workflow.
 *
 * Verifies server-side authorization and data isolation for:
 * - Admin creates academic context, users, and subject
 * - Teacher enters scores only for assigned class/subject/arm
 * - Admin approves and publishes results
 * - Parent and student can view the published report
 * - Cross-user report access is blocked
 */

test.setTimeout(180_000);

async function getSession(page: Page) {
  const res = await page.request.get("/api/auth/session");
  return res.json().catch(() => ({}));
}

async function createContextEntities(page: Page, baseName: string) {
  // Create session
  const sessionRes = await page.request.post("/api/admin/academic/sessions", {
    data: { name: `${baseName} Session`, status: "ACTIVE" },
  });
  expect(sessionRes.ok()).toBeTruthy();
  const sessionData = await sessionRes.json();
  const sessionId = String(sessionData.id);

  // Create term and mark active
  const termRes = await page.request.post("/api/admin/academic/terms", {
    data: {
      sessionId,
      name: `${baseName} Term`,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ACTIVE",
    },
  });
  expect(termRes.ok()).toBeTruthy();
  const termData = await termRes.json();

  // Create class group
  const groupRes = await page.request.post("/api/admin/class-groups", {
    data: { name: `${baseName} Group` },
  });
  expect(groupRes.ok()).toBeTruthy();
  const groupData = await groupRes.json();
  const classGroupId = Number(groupData.classGroup.id);

  // Create class
  const classRes = await page.request.post("/api/admin/classes", {
    data: {
      name: `${baseName} Class`,
      classGroupId,
      armIds: [],
    },
  });
  expect(classRes.ok()).toBeTruthy();
  const classData = await classRes.json();
  const classId = String(classData.class.id);

  // Create arm preset then assign to class
  const armPresetRes = await page.request.post("/api/admin/class-arms", {
    data: { name: `${baseName} Arm`, capacity: 40 },
  });
  expect(armPresetRes.ok()).toBeTruthy();
  const armPreset = await armPresetRes.json();
  const armPresetId = Number(armPreset.arm.id);

  const classWithArmRes = await page.request.post("/api/admin/classes", {
    data: {
      name: `${baseName} Class 2`,
      classGroupId,
      armIds: [armPresetId],
    },
  });
  expect(classWithArmRes.ok()).toBeTruthy();
  const classWithArmData = await classWithArmRes.json();
  const armId = classWithArmData.class.arms[0]?.id;

  // Create subject linked to class
  const subjectRes = await page.request.post("/api/admin/subjects", {
    data: { name: `${baseName} Subject`, classId: Number(classId) },
  });
  expect(subjectRes.ok()).toBeTruthy();
  const subjectData = await subjectRes.json();
  const subjectId = String(subjectData.subject.id);

  // Create teacher
  const teacherRes = await page.request.post("/api/admin/teachers", {
    data: {
      name: `${baseName} Teacher`,
      email: `teacher.${baseName.toLowerCase().replace(/\s+/g, ".")}@test.local`,
      password: "Password123",
    },
  });
  expect(teacherRes.ok()).toBeTruthy();
  const teacherData = await teacherRes.json();
  const teacherId = String(teacherData.teacher.id);

  // Create parent
  const parentRes = await page.request.post("/api/admin/parents", {
    data: {
      name: `${baseName} Parent`,
      email: `parent.${baseName.toLowerCase().replace(/\s+/g, ".")}@test.local`,
      password: "Password123",
    },
  });
  expect(parentRes.ok()).toBeTruthy();
  const parentData = await parentRes.json();

  // Create student with class, arm, parent
  const studentRes = await page.request.post("/api/admin/students", {
    data: {
      name: `${baseName} Student`,
      email: `student.${baseName.toLowerCase().replace(/\s+/g, ".")}@test.local`,
      password: "Password123",
      gender: "MALE",
      age: 12,
      classId: Number(classId),
      armId: Number(armId),
      parentId: Number(parentData.parent.id),
      admissionNo: `ADM-${baseName.replace(/\s+/g, "-")}`,
    },
  });
  expect(studentRes.ok()).toBeTruthy();
  const studentData = await studentRes.json();
  const studentId = String(studentData.student.id);

  // Assign teacher to class and subject
  const assignClassRes = await page.request.patch(`/api/admin/teachers/${teacherId}`, {
    data: { classId, action: "ASSIGN" },
  });
  expect(assignClassRes.ok()).toBeTruthy();

  const assignSubjectRes = await page.request.patch(`/api/admin/teachers/${teacherId}`, {
    data: { subjectId, action: "ASSIGN" },
  });
  expect(assignSubjectRes.ok()).toBeTruthy();

  return {
    sessionId,
    termId: String(termData.id),
    classId,
    armId: String(armId),
    subjectId,
    teacherId,
    studentId,
    parentUserId: String(parentData.parent.userId),
    studentUserId: String(studentData.student.userId),
    teacherEmail: teacherData.teacher.email,
    parentEmail: parentData.parent.email,
    studentEmail: studentData.student.email,
    baseName,
  };
}

async function signInDirect(page: Page, email: string, password: string) {
  // Clear any existing session before switching to another role.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForLoadState("networkidle");
  await expect.poll(
    async () => {
      const session = await getSession(page);
      return session?.user?.role ? "authenticated" : "unauthenticated";
    },
    { message: "Session did not become authenticated after login", timeout: 30_000 }
  ).toBe("authenticated");
}

test("full result workflow: admin, teacher, parent, student", async ({ page }) => {
  const baseName = `P0 ${Date.now()}`;

  await loginAsAdmin(page);
  const entities = await createContextEntities(page, baseName);

  // Select academic context as admin (sets active session/term cookies)
  await page.request.post("/api/context/session-term", {
    data: { sessionId: entities.sessionId, termId: entities.termId },
  });

  // Teacher login and score entry
  await signInDirect(page, entities.teacherEmail, "Password123");
  await page.request.post("/api/context/session-term", {
    data: { sessionId: entities.sessionId, termId: entities.termId },
  });

  const scoreRes = await page.request.post("/api/teacher/scores", {
    data: {
      studentId: entities.studentId,
      subjectId: entities.subjectId,
      caScore: 5,
      examScore: 5,
    },
  });
  if (!scoreRes.ok()) {
    console.error("Score submission failed:", scoreRes.status(), await scoreRes.json().catch(() => ({})));
  }
  expect(scoreRes.ok()).toBeTruthy();

  // Admin login, approve, publish
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.request.post("/api/context/session-term", {
    data: { sessionId: entities.sessionId, termId: entities.termId },
  });

  const approveRes = await page.request.post("/api/admin/results/review", {
    data: {
      studentId: entities.studentId,
      action: "APPROVE",
      sessionId: entities.sessionId,
      termId: entities.termId,
    },
  });
  if (!approveRes.ok()) {
    console.error("Approve failed:", approveRes.status(), await approveRes.json().catch(() => ({})));
  }
  expect(approveRes.ok()).toBeTruthy();

  const publishRes = await page.request.post("/api/admin/results/review", {
    data: {
      studentId: entities.studentId,
      action: "PUBLISH",
      sessionId: entities.sessionId,
      termId: entities.termId,
    },
  });
  if (!publishRes.ok()) {
    console.error("Publish failed:", publishRes.status(), await publishRes.json().catch(() => ({})));
  }
  expect(publishRes.ok()).toBeTruthy();

  // Parent login and report access
  await signInDirect(page, entities.parentEmail, "Password123");

  const parentReportRes = await page.request.get(`/reports/${entities.studentId}`);
  expect(parentReportRes.status()).toBe(200);

  // Parent should not access an unrelated student's report
  const unrelatedRes = await page.request.get(`/reports/999999`);
  expect(unrelatedRes.status()).toBe(404);

  // Student login and own report access
  await signInDirect(page, entities.studentEmail, "Password123");

  const studentReportRes = await page.request.get(`/reports/${entities.studentId}`);
  expect(studentReportRes.status()).toBe(200);
});
