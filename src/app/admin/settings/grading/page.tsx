export const dynamic = "force-dynamic";

import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { DashboardHeader } from "@/components/modern-dashboard";
import { GradingManager } from "./grading-manager";

export default async function GradingSettingsPage() {
  const user = await requirePrivilege("settings.view");
  const profile = await getCurrentSchoolByUser(user.id);

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile?.school?.name ?? "School"}
      schoolLogoUrl={profile?.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={profile?.avatarUrl ?? undefined}
      pathname="/admin/settings/grading"
    >
      <div className="space-y-6">
        <DashboardHeader 
          title="Grading & Assessment" 
          subtitle="Configure your school's grading system, assessment weights, and grade bands." 
        />
        <GradingManager />
      </div>
    </ModernPortalShell>
  );
}
