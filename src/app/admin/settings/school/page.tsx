export const dynamic = "force-dynamic";

import { ModernPortalShell } from "@/components/modern-portal-shell";
import { DashboardHeader } from "@/components/modern-dashboard";
import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { checkPrivilege } from "@/lib/privileges";
import { SchoolForm } from "./school-form";

export default async function SchoolPage() {
  const user = await requirePrivilege("settings.view");
  const profile = await getCurrentSchoolByUser(user.id);
  
  // Check if schools already exist (for users with settings.manage)
  const canManageSettings = await checkPrivilege(user.id, "settings.manage");
  const schools = canManageSettings
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
              isSuperAdmin={canManageSettings}
            />
          </div>
        </div>
      </div>
    </ModernPortalShell>
  );
}
