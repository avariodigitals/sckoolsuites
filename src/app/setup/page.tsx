import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SetupWizard } from "./setup-wizard";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Check if setup is already complete
  const existingSchool = await prisma.school.findUnique({
    where: { id: "default" },
  });

  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: { name: { in: ["SCHOOL_ADMIN", "SUPER_ADMIN"] } },
    },
  });

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
