import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { roleDefaultRoute } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { bootstrapDatabase } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export default async function Home() {
  await bootstrapDatabase();

  let school;
  let admin;
  try {
    school = await prisma.school.findUnique({
      where: { id: "default" },
    });
    admin = await prisma.user.findFirst({
      where: { role: { name: { in: ["SCHOOL_ADMIN", "SUPER_ADMIN"] } } },
    });
  } catch {
    redirect("/setup");
  }

  // If setup not complete, redirect to setup
  if (!school?.isSetup || !admin) {
    redirect("/setup");
  }

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(roleDefaultRoute[session.user.role] ?? "/login");
}
