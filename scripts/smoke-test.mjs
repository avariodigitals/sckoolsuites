const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const adminEmail = process.env.TEST_ADMIN_EMAIL || "admin@sckoolsuite.com";
const adminPassword = process.env.TEST_ADMIN_PASSWORD || "Lift@1240&";

let cookies = "";
let csrfToken = "";

async function fetchJson(path, opts = {}) {
  const hasExplicitContentType = opts.headers && (opts.headers["Content-Type"] || opts.headers["content-type"]);
  const res = await fetch(`${baseUrl}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(cookies ? { Cookie: cookies } : {}),
      ...(opts.body && typeof opts.body === "string" && !hasExplicitContentType ? { "Content-Type": "application/json" } : {}),
    },
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) {
    const main = c.split(";")[0];
    if (main) {
      cookies += (cookies ? "; " : "") + main;
    }
  }
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, text };
}

async function login(email, password, roleDefault = "/") {
  const nextAuthCsrfRes = await fetchJson("/api/auth/csrf");
  csrfToken = (nextAuthCsrfRes.json && nextAuthCsrfRes.json.csrfToken) || "";

  const res = await fetchJson("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    redirect: "manual",
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: "/",
      json: "true",
    }).toString(),
  });
  if (res.status !== 200 && res.status !== 302) {
    throw new Error(`Login failed for ${email}: ${res.status} ${res.text}`);
  }
  const sessionRes = await fetchJson("/api/auth/session");
  if (!sessionRes.json?.user) {
    throw new Error(`No session after login for ${email}: ${JSON.stringify(sessionRes.json)}`);
  }
  return sessionRes.json.user;
}

async function main() {
  console.log("=== Smoke test started ===");

  const adminUser = await login(adminEmail, adminPassword, "/admin/dashboard");
  console.log("Admin login OK:", adminUser.email, adminUser.role);

  const classesRes = await fetchJson("/api/admin/classes");
  console.log("Classes count:", classesRes.json?.classes?.length || 0);
  const classId = classesRes.json?.classes?.[0]?.id;

  const subjectsRes = await fetchJson("/api/admin/subjects");
  console.log("Subjects count:", subjectsRes.json?.subjects?.length || 0);
  const subjectId = subjectsRes.json?.subjects?.[0]?.id;

  const timestamp = Date.now();
  const teacherEmail = `teacher_${timestamp}@test.com`;
  const parentEmail = `parent_${timestamp}@test.com`;
  const studentEmail = `student_${timestamp}@test.com`;

  const teacherRes = await fetchJson("/api/admin/teachers", {
    method: "POST",
    body: JSON.stringify({ name: `Teacher ${timestamp}`, email: teacherEmail, password: "TestPass123" }),
  });
  console.log("Teacher create:", teacherRes.status, teacherRes.json?.teacher?.id);
  if (!teacherRes.json?.teacher) throw new Error("Teacher creation failed");

  const parentRes = await fetchJson("/api/admin/parents", {
    method: "POST",
    body: JSON.stringify({ name: `Parent ${timestamp}`, email: parentEmail, password: "TestPass123" }),
  });
  console.log("Parent create:", parentRes.status, parentRes.json?.parent?.id);
  if (!parentRes.json?.parent) throw new Error("Parent creation failed");

  const studentRes = await fetchJson("/api/admin/students", {
    method: "POST",
    body: JSON.stringify({
      name: `Student ${timestamp}`,
      email: studentEmail,
      password: "TestPass123",
      gender: "MALE",
      age: 10,
      classId,
      parentId: parentRes.json.parent.id,
    }),
  });
  console.log("Student create:", studentRes.status, studentRes.json?.student?.id);
  if (!studentRes.json?.student) throw new Error("Student creation failed");
  const studentId = studentRes.json.student.id;

  // Assign subject to teacher and class
  if (subjectId) {
    const assignRes = await fetchJson(`/api/admin/subjects/${subjectId}`, {
      method: "PATCH",
      body: JSON.stringify({ teacherId: teacherRes.json.teacher.id, classId }),
    });
    console.log("Subject assign to teacher:", assignRes.status, JSON.stringify(assignRes.json));
  }

  // Login as teacher and enter score
  cookies = "";
  csrfToken = "";
  const teacherUser = await login(teacherEmail, "TestPass123", "/teacher/dashboard");
  console.log("Teacher login OK:", teacherUser.email, teacherUser.role);

  if (subjectId) {
    const scoreRes = await fetchJson("/api/teacher/scores", {
      method: "POST",
      body: JSON.stringify({ studentId, subjectId, caScore: 30, examScore: 50 }),
    });
    console.log("Teacher score entry:", scoreRes.status, JSON.stringify(scoreRes.json));
    if (scoreRes.status !== 200) throw new Error("Teacher score entry failed");
  }

  // Admin approve and publish result
  cookies = "";
  csrfToken = "";
  await login(adminEmail, adminPassword, "/admin/dashboard");

  const contextRes = await fetchJson("/api/context/session-term");
  console.log("Context:", JSON.stringify(contextRes.json));

  if (subjectId) {
    const approveRes = await fetchJson("/api/admin/results/review", {
      method: "POST",
      body: JSON.stringify({ studentId, action: "APPROVE" }),
    });
    console.log("Result approve:", approveRes.status, JSON.stringify(approveRes.json));

    const publishRes = await fetchJson("/api/admin/results/review", {
      method: "POST",
      body: JSON.stringify({ studentId, action: "PUBLISH" }),
    });
    console.log("Result publish:", publishRes.status, JSON.stringify(publishRes.json));
    if (publishRes.status !== 200) throw new Error("Result publish failed");
  }

  // Parent login and view pages
  cookies = "";
  csrfToken = "";
  const parentUser = await login(parentEmail, "TestPass123", "/parent/dashboard");
  console.log("Parent login OK:", parentUser.email, parentUser.role);

  const parentDashboardRes = await fetchJson("/parent/dashboard");
  console.log("Parent dashboard page:", parentDashboardRes.status);

  const parentChildrenRes = await fetchJson("/parent/children");
  console.log("Parent children page:", parentChildrenRes.status);
  if (parentChildrenRes.status !== 200) throw new Error("Parent children page failed");

  const parentResultsRes = await fetchJson("/parent/results");
  console.log("Parent results page:", parentResultsRes.status);

  const reportRes = await fetchJson(`/reports/${studentId}`);
  console.log("Report PDF/page view:", reportRes.status);
  if (reportRes.status !== 200) throw new Error("Report page failed");

  // Student login and view results
  cookies = "";
  csrfToken = "";
  const studentUser = await login(studentEmail, "TestPass123", "/student/dashboard");
  console.log("Student login OK:", studentUser.email, studentUser.role);

  const studentDashboardRes = await fetchJson("/student/dashboard");
  console.log("Student dashboard page:", studentDashboardRes.status);

  const studentResultsRes = await fetchJson("/student/results");
  console.log("Student results page:", studentResultsRes.status);
  if (studentResultsRes.status !== 200) throw new Error("Student results page failed");

  const studentReportRes = await fetchJson("/student/report-card");
  console.log("Student report-card page:", studentReportRes.status);

  console.log("=== Smoke test completed ===");
}

main().catch((e) => {
  console.error("SMOKE TEST FAILED:", e.message);
  process.exit(1);
});
