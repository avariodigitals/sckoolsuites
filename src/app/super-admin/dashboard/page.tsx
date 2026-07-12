import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ModernPortalShell } from "@/components/modern-portal-shell";

export default async function SuperAdminDashboardPage() {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const school = await prisma.school.findUnique({
    where: { id: "default" },
  });
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });

  return (
    <ModernPortalShell
      role="SUPER_ADMIN"
      schoolName={school?.name}
      schoolLogoUrl={undefined}
      userName={session.user.name ?? "System Administrator"}
      avatarUrl={dbUser?.avatarUrl ?? undefined}
      pathname="/super-admin/dashboard"
    >
      <div className="max-w-4xl mx-auto py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="rounded-full bg-indigo-100 p-4">
              <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">System Setup</h1>
              <p className="text-slate-500">Initial configuration for Sckool Suite</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-900">Welcome, Super Admin</h3>
              <p className="mt-1 text-sm text-amber-700">
                This portal is for initial system setup only. After setup, please use the 
                <Link href="/admin/dashboard" className="font-medium underline"> Admin Dashboard</Link> for day-to-day operations.
              </p>
            </div>

            {!school ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-semibold text-slate-900 mb-2">Step 1: Initialize School</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Create your school profile to begin using the system.
                </p>
                <Link
                  href="/setup"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Start Setup Wizard
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <h3 className="font-semibold text-emerald-900">School Initialized</h3>
                </div>
                <p className="text-sm text-emerald-700">
                  School &quot;{school.name}&quot; is configured. Use the Admin Dashboard for operations.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">System Tools</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/setup"
                  className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <h4 className="font-medium text-slate-900">Setup Wizard</h4>
                  <p className="text-xs text-slate-500 mt-1">Configure school, sessions, terms</p>
                </Link>
                <Link
                  href="/admin/settings/school"
                  className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <h4 className="font-medium text-slate-900">School Settings</h4>
                  <p className="text-xs text-slate-500 mt-1">Update school profile & branding</p>
                </Link>
                <Link
                  href="/admin/setup"
                  className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <h4 className="font-medium text-slate-900">Data Setup</h4>
                  <p className="text-xs text-slate-500 mt-1">Classes, subjects, fee groups</p>
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <h4 className="font-medium text-slate-900">Sign Out</h4>
                  <p className="text-xs text-slate-500 mt-1">Return to login page</p>
                </Link>
              </div>
            </div>

            <div className="text-center text-xs text-slate-400">
              <p>Sckool Suite Single-School Edition</p>
              <p>Super Admin is for initial setup and troubleshooting only</p>
            </div>
          </div>
        </div>
      </div>
    </ModernPortalShell>
  );
}

