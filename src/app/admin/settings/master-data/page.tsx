export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { DashboardHeader } from "@/components/modern-dashboard";
import { MasterDataManager } from "./master-data-manager";

export default async function MasterDataPage() {
  const user = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"]);
  const profile = await getCurrentSchoolByUser(user.id);

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile?.school?.name ?? "School"}
      schoolLogoUrl={profile?.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={profile?.avatarUrl ?? undefined}
      pathname="/admin/settings/master-data"
    >
      <div className="space-y-6">
        <DashboardHeader 
          title="Master Data Management" 
          subtitle="Manage all structural school data including class groups, classes, arms, and subjects. Centralized control for data governance." 
        />
        <MasterDataManager />
      </div>
    </ModernPortalShell>
  );
}
