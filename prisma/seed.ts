import { prisma } from "../src/lib/db";
import { seedPrivileges, seedRolePrivileges, seedRoles } from "../src/lib/privileges";

/**
 * Prisma seed — idempotent system data only.
 *
 * This seed creates the roles, privileges, and default role-privilege mappings
 * required by the application. It deliberately does NOT create a school,
 * administrator, or any demo data. Those are created by the /setup wizard.
 *
 * Safe to run repeatedly.
 */
export async function seed() {
  // System roles (single source of truth: src/lib/privileges.ts)
  await seedRoles();

  // Privilege catalogue and default role privileges
  await seedPrivileges();
  await seedRolePrivileges();

  console.log("Seeded system roles, privileges, and role privileges.");
}

if (require.main === module) {
  seed()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Seed failed:", err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
