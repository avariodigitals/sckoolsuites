import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";
import { roleDefaultRoute } from "@/lib/constants";
import { prisma } from "@/lib/db";

export default async function LoginPage() {
  // Check if setup is complete
  const school = await prisma.school.findUnique({
    where: { id: "default" },
  });

  const admin = await prisma.user.findFirst({
    where: { role: { name: { in: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL"] } } },
  });

  // If setup not complete (no school or no admin), redirect to setup
  if (!school || !admin) {
    redirect("/setup");
  }

  const session = await auth();
  if (session?.user?.role) {
    redirect(roleDefaultRoute[session.user.role] ?? "/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            Sckool Suite
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            School Management System
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-900/5">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Sckool Suite. All rights reserved.
        </p>
      </div>
    </div>
  );
}
