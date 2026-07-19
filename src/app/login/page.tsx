import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";
import { roleDefaultRoute } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { bootstrapDatabase } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await bootstrapDatabase().catch(() => {});

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
    if (session.user.mustChangePassword) {
      redirect("/change-password");
    }
    redirect(roleDefaultRoute[session.user.role] ?? "/");
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
      style={{
        backgroundColor: "#f0f4f8",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.12) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(135deg, rgba(199,210,254,0.15) 0%, rgba(241,245,249,0.05) 50%, rgba(209,250,229,0.12) 100%)",
        }}
      />
      <div className="relative w-full max-w-md space-y-8">
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

        <div className="rounded-2xl bg-white/90 p-8 shadow-lg ring-1 ring-slate-900/5 backdrop-blur-sm">
          <LoginForm />
        </div>

        <div className="space-y-1 text-center">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Sckool Suite. All rights reserved.
          </p>
          <p className="text-xs text-slate-500">
            Product of{" "}
            <a
              href="https://avariodigitals.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Avario Digitals
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
