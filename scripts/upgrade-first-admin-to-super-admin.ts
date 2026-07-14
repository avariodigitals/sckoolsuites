import { prisma } from "../src/lib/db";

async function main() {
  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (!superAdminRole) {
    console.error("SUPER_ADMIN role not found. Run bootstrap/seed first.");
    process.exit(1);
  }

  // Find the first user created (the setup wizard admin) who is currently SCHOOL_ADMIN
  const firstAdmin = await prisma.user.findFirst({
    where: {
      role: { name: "SCHOOL_ADMIN" },
    },
    include: { role: true },
    orderBy: { createdAt: "asc" },
  });

  if (!firstAdmin) {
    console.log("No SCHOOL_ADMIN user found to upgrade.");
    return;
  }

  console.log(`Upgrading ${firstAdmin.email} from ${firstAdmin.role.name} to SUPER_ADMIN...`);
  await prisma.user.update({
    where: { id: firstAdmin.id },
    data: { roleId: superAdminRole.id },
  });
  console.log("Done. The first admin is now SUPER_ADMIN.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
