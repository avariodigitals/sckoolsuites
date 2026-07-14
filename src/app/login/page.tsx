import { redirect } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";
import { roleDefaultRoute } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { bootstrapDatabase } from "@/lib/bootstrap";

export default async function LoginPage() {
  await bootstrapDatabase();

  let school;
  let admin;
  try {
    school = await prisma.school.findUnique({
      where: { id: "default" },
    });
    admin = await prisma.user.findFirst({
      where: { role: { name: { in: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL"] } } },
    });
  } catch {
    redirect("/setup");
  }

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
          <div className="mx-auto flex items-center justify-center">
            <Image
              src="/sckoolsuite-logo.png"
              alt="Sckool Suite"
              width={200}
              height={54}
              priority
              className="h-14 w-auto"
            />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            School Management System
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-900/5">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Sckool Suite. All rights reserved.
        </p>
      </div>
    </div>
  );
}
