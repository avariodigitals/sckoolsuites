export const dynamic = "force-dynamic";

import { ModernPortalShell } from "@/components/modern-portal-shell";
import { DashboardHeader } from "@/components/modern-dashboard";
import { requireRole } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { SchoolForm } from "./school-form";

export default async function SchoolPage() {
  const user = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"]);
  const profile = await getCurrentSchoolByUser(user.id);
  
  // Check if schools already exist (for Super Admin)
  const schools = user.role === "SUPER_ADMIN" 
    ? await prisma.school.findMany({})
    : [];
  
  const hasSchool = !!profile?.school || schools.length > 0;

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile?.school?.name ?? "Setup"}
      schoolLogoUrl={profile?.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={profile?.avatarUrl ?? undefined}
      pathname="/admin/settings/school"
    >
      <div className="space-y-6">
        <DashboardHeader
          title={hasSchool ? "School Settings" : "Create Your School"}
          subtitle={hasSchool 
            ? "Manage your school details and configuration." 
            : "Set up your school to start using the system."}
        />

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {hasSchool ? "School Information" : "School Details"}
            </h2>
            <p className="text-sm text-slate-500">
              {hasSchool 
                ? "Update your school information and settings."
                : "Enter your school details to create your institution."}
            </p>
          </div>
          <div className="p-6">
            <SchoolForm 
              school={profile?.school ?? null} 
              isSuperAdmin={user.role === "SUPER_ADMIN"}
            />
          </div>
        </div>
      </div>
    </ModernPortalShell>
  );
}
