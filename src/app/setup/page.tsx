import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { bootstrapDatabase } from "@/lib/bootstrap";
import { SetupWizard } from "./setup-wizard";
import { DatabaseNotReady } from "./database-not-ready";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

export default async function SetupPage() {
  // Ensure database is migrated and seeded before checking setup state.
  // This handles fresh installs where tables don't exist yet.
  const bootstrap = await bootstrapDatabase();
  if (!bootstrap.ok) {
    return <DatabaseNotReady error={bootstrap.error} />;
  }

  // Check if setup is already complete
  let existingSchool;
  let existingAdmin;

  try {
    existingSchool = await prisma.school.findUnique({
      where: { id: "default" },
    });

    existingAdmin = await prisma.user.findFirst({
      where: {
        role: { name: { in: ["SCHOOL_ADMIN", "SUPER_ADMIN"] } },
      },
    });
  } catch (err: any) {
    return <DatabaseNotReady error={err?.message ?? "Unable to query database."} />;
  }

  // If school exists with an admin, setup is complete - redirect to login
  if (existingSchool && existingAdmin) {
    redirect("/login");
  }

  // If a partial school exists (no admin), it means a previous atomic setup failed.
  // Clean it up so the wizard can start fresh.
  if (existingSchool && !existingAdmin) {
    await prisma.schoolBranding.deleteMany({ where: { schoolId: "default" } });
    await prisma.school.deleteMany({ where: { id: "default" } });
  }

  return <SetupWizard />;
}
