/**
 * Cleanup Controlled Production Test Set — Hardened
 *
 * Removes ONLY records created by create-controlled-test-set.js using the
 * exact CONTROLLED_TEST_PREFIX returned by that script.
 *
 * Safety requirements:
 *   1. DATABASE_URL must be set explicitly.
 *   2. CONTROLLED_TEST_SCHOOL_ID must be set explicitly.
 *   3. CONTROLLED_TEST_PREFIX must be set explicitly.
 *   4. Fails if any required variable is missing.
 *   5. Fails against localhost/loopback when CONTROLLED_TEST_ENV=production.
 *   6. Fails if the target school does not exist.
 *   7. Deletes only records matching the exact controlled-test prefix.
 *   8. Respects foreign-key order.
 *   9. Respects DRY_RUN=true.
 *  10. Never logs passwords or full database credentials.
 *  11. Prints a dry-run summary before any mutation.
 *  12. Reports counts of removed records.
 *
 * Usage:
 *   DRY_RUN=true \
 *     CONTROLLED_TEST_ENV=production \
 *     CONTROLLED_TEST_SCHOOL_ID=<school-id> \
 *     CONTROLLED_TEST_PREFIX=<prefix-from-create-script> \
 *     node scripts/cleanup-controlled-test-set.js
 */

const { PrismaClient } = require("@prisma/client");

const DATABASE_URL = process.env.DATABASE_URL;
const SCHOOL_ID = process.env.CONTROLLED_TEST_SCHOOL_ID;
const PREFIX = process.env.CONTROLLED_TEST_PREFIX;
const ENV = process.env.CONTROLLED_TEST_ENV || "development";
const DRY_RUN = process.env.DRY_RUN === "true";

function fail(message) {
  console.error(`\n❌ CONTROLLED TEST CLEANUP BLOCKED: ${message}\n`);
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
  console.log("\n🧹 Controlled Production Test Set Cleanup");
  console.log("========================================\n");

  if (!DATABASE_URL) fail("DATABASE_URL is required.");
  if (!SCHOOL_ID) fail("CONTROLLED_TEST_SCHOOL_ID is required.");
  if (!PREFIX) fail("CONTROLLED_TEST_PREFIX is required. Copy it from the create script output.");
  if (ENV === "production" && isLocalhost(DATABASE_URL)) {
    fail("Production mode requested but DATABASE_URL points to localhost/loopback.");
  }

  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

  try {
    const school = await prisma.school.findUnique({ where: { id: SCHOOL_ID } });
    if (!school) fail(`School '${SCHOOL_ID}' not found.`);

    const users = await prisma.user.findMany({
      where: { schoolId: SCHOOL_ID, name: { startsWith: PREFIX } },
    });
    const userIds = users.map((u) => u.id);

    const classes = await prisma.class.findMany({
      where: { schoolId: SCHOOL_ID, name: { startsWith: PREFIX } },
    });
    const classIds = classes.map((c) => c.id);

    const arms = await prisma.classArm.findMany({
      where: { schoolId: SCHOOL_ID, name: { startsWith: PREFIX } },
    });
    const armIds = arms.map((a) => a.id);

    const subjects = await prisma.subject.findMany({
      where: { schoolId: SCHOOL_ID, name: { startsWith: PREFIX } },
    });
    const subjectIds = subjects.map((s) => s.id);

    const groups = await prisma.classGroup.findMany({
      where: { schoolId: SCHOOL_ID, name: { startsWith: PREFIX } },
    });
    const groupIds = groups.map((g) => g.id);

    const sessions = await prisma.session.findMany({
      where: { schoolId: SCHOOL_ID, name: { startsWith: PREFIX } },
    });
    const sessionIds = sessions.map((s) => s.id);

    const terms = await prisma.term.findMany({
      where: { schoolId: SCHOOL_ID, name: { startsWith: PREFIX } },
    });
    const termIds = terms.map((t) => t.id);

    const records = {
      users: userIds.length,
      sessions: sessionIds.length,
      terms: termIds.length,
      groups: groupIds.length,
      classes: classIds.length,
      arms: armIds.length,
      subjects: subjectIds.length,
    };

    console.log("DRY-RUN SUMMARY");
    console.log("---------------");
    console.log(`Target database: ${maskUrl(DATABASE_URL)}`);
    console.log(`Target school:   ${SCHOOL_ID} (${school.name})`);
    console.log(`Environment:     ${ENV}`);
    console.log(`Unique prefix:   ${PREFIX}`);
    console.log("Records to remove:");
    for (const [key, value] of Object.entries(records)) {
      console.log(`  - ${key}: ${value}`);
    }
    console.log(`Dry run:         ${DRY_RUN ? "YES — no deletions will be made" : "NO — deletions will be made"}`);
    console.log("\n");

    if (DRY_RUN) {
      console.log("✅ Dry run complete. No records were deleted.\n");
      return;
    }

    if (Object.values(records).every((c) => c === 0)) {
      console.log("No controlled records found with the given prefix. Nothing to delete.\n");
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.score.deleteMany({
        where: { student: { userId: { in: userIds } } },
      });
      await tx.attendance.deleteMany({
        where: { student: { userId: { in: userIds } } },
      });
      await tx.result.deleteMany({
        where: { student: { userId: { in: userIds } } },
      });
      await tx.studentEnrollment.deleteMany({
        where: {
          OR: [
            { student: { userId: { in: userIds } } },
            { sessionId: { in: sessionIds } },
            { termId: { in: termIds } },
          ],
        },
      });
      await tx.invoice.deleteMany({
        where: { student: { userId: { in: userIds } } },
      });

      await tx.student.deleteMany({ where: { userId: { in: userIds } } });
      await tx.parent.deleteMany({ where: { userId: { in: userIds } } });
      await tx.teacher.deleteMany({ where: { userId: { in: userIds } } });
      await tx.schoolAdmin.deleteMany({ where: { userId: { in: userIds } } });

      await tx.user.deleteMany({ where: { id: { in: userIds } } });

      await tx.subject.deleteMany({ where: { id: { in: subjectIds } } });
      await tx.classArm.deleteMany({ where: { id: { in: armIds } } });
      await tx.class.deleteMany({ where: { id: { in: classIds } } });
      await tx.classGroup.deleteMany({ where: { id: { in: groupIds } } });
      await tx.term.deleteMany({ where: { id: { in: termIds } } });
      await tx.session.deleteMany({ where: { id: { in: sessionIds } } });
    });

    console.log("\n✅ Controlled test set cleanup complete.\n");
    for (const [key, value] of Object.entries(records)) {
      console.log(`${key} removed: ${value}`);
    }
    console.log("\n");
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((err) => {
    console.error("Failed to cleanup controlled test set:", err);
    process.exit(1);
  });
