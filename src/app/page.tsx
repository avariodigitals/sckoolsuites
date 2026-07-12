import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { roleDefaultRoute } from "@/lib/constants";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Check if setup is complete first
  const school = await prisma.school.findUnique({
    where: { id: "default" },
  });

  const admin = await prisma.user.findFirst({
    where: { role: { name: "SCHOOL_ADMIN" } },
  });

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
