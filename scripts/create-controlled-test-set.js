/**
 * Controlled Production Test Set — Hardened
 *
 * Creates a single, clearly-labeled test admin, teacher, parent, student,
 * class group, class, arm, subject, session and term for P0 result workflow
 * verification. This script is designed to be run against a real production
 * database, but only after explicit human confirmation.
 *
 * Safety requirements:
 *   1. DATABASE_URL must be set explicitly.
 *   2. CONTROLLED_TEST_SCHOOL_ID must be set explicitly.
 *   3. CONTROLLED_TEST_PASSWORD must be set explicitly.
 *   4. Fails if any required variable is missing.
 *   5. Fails against localhost/loopback when CONTROLLED_TEST_ENV=production.
 *   6. Fails if the target school does not exist.
 *   7. Uses a unique controlled-test prefix per run.
 *   8. Creates only the requested records.
 *   9. Does not delete records.
 *  10. Respects DRY_RUN=true.
 *  11. Never logs passwords or full database credentials.
 *  12. Prints a dry-run summary before any mutation.
 *
 * Usage:
 *   DRY_RUN=true \
 *     CONTROLLED_TEST_ENV=production \
 *     CONTROLLED_TEST_SCHOOL_ID=<school-id> \
 *     CONTROLLED_TEST_PASSWORD=<strong-password> \
 *     node scripts/create-controlled-test-set.js
 */

const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");
const { randomBytes } = require("crypto");

const DATABASE_URL = process.env.DATABASE_URL;
const SCHOOL_ID = process.env.CONTROLLED_TEST_SCHOOL_ID;
const PASSWORD = process.env.CONTROLLED_TEST_PASSWORD;
const ENV = process.env.CONTROLLED_TEST_ENV || "development";
const DRY_RUN = process.env.DRY_RUN === "true";

const RUN_ID = `${new Date().toISOString()}-${randomBytes(3).toString("hex")}`;
const PREFIX = `SCKOOLSUITE TEST ${RUN_ID}`;

const BASE_DOMAIN = process.env.CONTROLLED_TEST_DOMAIN || "sckoolsuite.com";
const EMAIL_PREFIX = `controlled-test-${RUN_ID.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
const EMAILS = {
  admin: `${EMAIL_PREFIX}-admin@${BASE_DOMAIN}`,
  teacher: `${EMAIL_PREFIX}-teacher@${BASE_DOMAIN}`,
  parent: `${EMAIL_PREFIX}-parent@${BASE_DOMAIN}`,
  student: `${EMAIL_PREFIX}-student@${BASE_DOMAIN}`,
};

function fail(message) {
  console.error(`\n❌ CONTROLLED TEST SET BLOCKED: ${message}\n`);
  throw new Error(message);
}

function maskUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "****";
    if (u.username) u.username = "****";
    return u.toString();
  } catch {
    return "[invalid url]";
  }
}

function isLocalhost(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

async function main() {
  console.log("\n🔒 Controlled Production Test Set");
  console.log("================================\n");

  if (!DATABASE_URL) fail("DATABASE_URL is required.");
  if (!SCHOOL_ID) fail("CONTROLLED_TEST_SCHOOL_ID is required.");
  if (!PASSWORD) fail("CONTROLLED_TEST_PASSWORD is required. Generate a strong one-time password.");
  if (ENV === "production" && isLocalhost(DATABASE_URL)) {
    fail("Production mode requested but DATABASE_URL points to localhost/loopback.");
  }

  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

  try {
    const school = await prisma.school.findUnique({ where: { id: SCHOOL_ID } });
    if (!school) fail(`School '${SCHOOL_ID}' not found.`);

  const existingPrefix = await prisma.session.findFirst({
    where: { schoolId: SCHOOL_ID, name: { startsWith: PREFIX } },
  });
  if (existingPrefix) {
    fail(`Records with prefix '${PREFIX}' already exist. Use a fresh prefix or run cleanup first.`);
  }

  const existingBase = await prisma.session.count({
    where: { schoolId: SCHOOL_ID, name: { startsWith: "SCKOOLSUITE TEST" } },
  });
  if (existingBase > 0) {
    console.log(`⚠️  Found ${existingBase} existing 'SCKOOLSUITE TEST' session(s) in school ${SCHOOL_ID}.`);
    console.log("   Cleanup must target the exact CONTROLLED_TEST_PREFIX returned by the create script.\n");
  }

  const hashedPassword = await hash(PASSWORD, 10);

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "SCHOOL_ADMIN" } });
  const teacherRole = await prisma.role.findUniqueOrThrow({ where: { name: "TEACHER" } });
  const parentRole = await prisma.role.findUniqueOrThrow({ where: { name: "PARENT" } });
  const studentRole = await prisma.role.findUniqueOrThrow({ where: { name: "STUDENT" } });

  const plan = [
    { model: "Session", label: `${PREFIX} Session` },
    { model: "Term", label: `${PREFIX} Term` },
    { model: "ClassGroup", label: `${PREFIX} Group` },
    { model: "Class", label: `${PREFIX} Class` },
    { model: "ClassArm", label: `${PREFIX} Arm` },
    { model: "Subject", label: `${PREFIX} Subject` },
    { model: "User (admin)", label: EMAILS.admin },
    { model: "User (teacher)", label: EMAILS.teacher },
    { model: "User (parent)", label: EMAILS.parent },
    { model: "User (student)", label: EMAILS.student },
    { model: "SchoolAdmin", label: `profile for ${EMAILS.admin}` },
    { model: "Teacher", label: `profile for ${EMAILS.teacher}` },
    { model: "Parent", label: `profile for ${EMAILS.parent}` },
    { model: "Student", label: `profile for ${EMAILS.student}` },
    { model: "Teacher class/arm/subject assignment", label: "teacher -> class, arm, subject" },
    { model: "SchoolSetting", label: "setup_wizard_status marked complete" },
  ];

  console.log("DRY-RUN SUMMARY");
  console.log("---------------");
  console.log(`Target database: ${maskUrl(DATABASE_URL)}`);
  console.log(`Target school:   ${SCHOOL_ID} (${school.name})`);
  console.log(`Environment:     ${ENV}`);
  console.log(`Unique prefix:   ${PREFIX}`);
  console.log("Records to create/update:");
  for (const item of plan) {
    console.log(`  - ${item.model}: ${item.label}`);
  }
  console.log(`Password:        ${"*".repeat(Math.min(PASSWORD.length, 8))} (not logged)`);
  console.log(`Dry run:         ${DRY_RUN ? "YES — no mutations will be made" : "NO — mutations will be made"}`);
  console.log("\n");

  if (DRY_RUN) {
    console.log("✅ Dry run complete. No records were created.\n");
    console.log(`Set CONTROLLED_TEST_PREFIX=${PREFIX} when running cleanup.\n`);
    await prisma.$disconnect();
    return;
  }

  const session = await prisma.session.upsert({
    where: { schoolId_name: { schoolId: SCHOOL_ID, name: `${PREFIX} Session` } },
    update: {},
    create: {
      schoolId: SCHOOL_ID,
      name: `${PREFIX} Session`,
      status: "ACTIVE",
      isCurrent: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const term = await prisma.term.upsert({
    where: { schoolId_name: { schoolId: SCHOOL_ID, name: `${PREFIX} Term` } },
    update: {},
    create: {
      schoolId: SCHOOL_ID,
      sessionId: session.id,
      name: `${PREFIX} Term`,
      status: "ACTIVE",
      isCurrent: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  const group = await prisma.classGroup.upsert({
    where: { schoolId_name: { schoolId: SCHOOL_ID, name: `${PREFIX} Group` } },
    update: {},
    create: { schoolId: SCHOOL_ID, name: `${PREFIX} Group` },
  });

  const cls = await prisma.class.upsert({
    where: { schoolId_name: { schoolId: SCHOOL_ID, name: `${PREFIX} Class` } },
    update: {},
    create: {
      schoolId: SCHOOL_ID,
      name: `${PREFIX} Class`,
      classGroupId: group.id,
    },
  });

  const arm = await prisma.classArm.upsert({
    where: { schoolId_name: { schoolId: SCHOOL_ID, name: `${PREFIX} Arm` } },
    update: {},
    create: {
      schoolId: SCHOOL_ID,
      name: `${PREFIX} Arm`,
      classId: cls.id,
      capacity: 40,
      isActive: true,
    },
  });

  const subject = await prisma.subject.upsert({
    where: { schoolId_name: { schoolId: SCHOOL_ID, name: `${PREFIX} Subject` } },
    update: {},
    create: {
      schoolId: SCHOOL_ID,
      name: `${PREFIX} Subject`,
      classId: cls.id,
    },
  });

  async function upsertUser(email, name, roleId) {
    return prisma.user.upsert({
      where: { email },
      update: { name, roleId, schoolId: SCHOOL_ID, password: hashedPassword, isActive: true },
      create: { email, name, roleId, schoolId: SCHOOL_ID, password: hashedPassword, isActive: true },
    });
  }

  const adminUser = await upsertUser(EMAILS.admin, `${PREFIX} Admin`, adminRole.id);
  const teacherUser = await upsertUser(EMAILS.teacher, `${PREFIX} Teacher`, teacherRole.id);
  const parentUser = await upsertUser(EMAILS.parent, `${PREFIX} Parent`, parentRole.id);
  const studentUser = await upsertUser(EMAILS.student, `${PREFIX} Student`, studentRole.id);

  await prisma.schoolAdmin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, schoolId: SCHOOL_ID },
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id, schoolId: SCHOOL_ID },
  });

  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: { userId: parentUser.id, schoolId: SCHOOL_ID },
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {
      classId: cls.id,
      armId: arm.id,
      parentId: parent.id,
      gender: "MALE",
      age: 12,
      admissionNo: `${EMAIL_PREFIX}-001`,
    },
    create: {
      userId: studentUser.id,
      schoolId: SCHOOL_ID,
      classId: cls.id,
      armId: arm.id,
      parentId: parent.id,
      gender: "MALE",
      age: 12,
      admissionNo: `${EMAIL_PREFIX}-001`,
    },
  });

  await prisma.class.update({
    where: { id: cls.id },
    data: { teacherId: teacher.id },
  });
  await prisma.classArm.update({
    where: { id: arm.id },
    data: { teacherId: teacher.id },
  });
  await prisma.subject.update({
    where: { id: subject.id },
    data: { teacherId: teacher.id },
  });

  await prisma.schoolSetting.upsert({
    where: { schoolId_key: { schoolId: SCHOOL_ID, key: "setup_wizard_status" } },
    update: { value: JSON.stringify({ setupCompleted: true, completedSteps: [], lastCompletedStep: 0, updatedAt: new Date().toISOString() }) },
    create: { schoolId: SCHOOL_ID, key: "setup_wizard_status", value: JSON.stringify({ setupCompleted: true, completedSteps: [], lastCompletedStep: 0, updatedAt: new Date().toISOString() }) },
  });

  console.log("\n✅ Controlled production test set created/updated.\n");
  console.log("CONTROLLED_TEST_PREFIX:", PREFIX);
  console.log("CONTROLLED_TEST_SCHOOL_ID:", SCHOOL_ID);
  console.log("Session:", session.name, "(id:", session.id, ")");
  console.log("Term:", term.name, "(id:", term.id, ")");
  console.log("Class:", cls.name, "(id:", cls.id, ")");
  console.log("Arm:", arm.name, "(id:", arm.id, ")");
  console.log("Subject:", subject.name, "(id:", subject.id, ")");
  console.log("Admin user:", adminUser.email, "(id:", adminUser.id, ")");
  console.log("Teacher user:", teacherUser.email, "(id:", teacherUser.id, ")");
  console.log("Parent user:", parentUser.email, "(id:", parentUser.id, ")");
  console.log("Student user:", studentUser.email, "(id:", studentUser.id, ")");
  console.log("\nPassword is available only from the environment that ran this script.");
  console.log("Run cleanup with:");
  console.log(`  CONTROLLED_TEST_PREFIX=${PREFIX} CONTROLLED_TEST_SCHOOL_ID=${SCHOOL_ID} node scripts/cleanup-controlled-test-set.js`);
  console.log("\n");
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((err) => {
    console.error("Failed to create controlled test set:", err);
    process.exit(1);
  });
