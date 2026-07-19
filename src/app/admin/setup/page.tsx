import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { DashboardHeader } from "@/components/modern-dashboard";
import { SimpleSetupClient } from "./simple-setup-client";

export default async function AdminSetupWizardPage() {
  const user = await requirePrivilege("settings.manage");
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  const profile = await getCurrentSchoolByUser(user.id);
  if (!profile?.schoolId || !profile.school) {
    return null;
  }

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile.school.name}
      schoolLogoUrl={profile.school.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={dbUser?.avatarUrl ?? undefined}
      pathname="/admin/setup"
    >
      <div className="space-y-6">
        <DashboardHeader 
          title="School Setup" 
          subtitle="Complete your school profile and academic session setup to activate your school. All other configurations can be done in Settings after activation." 
        />
        <SimpleSetupClient />
      </div>
    </ModernPortalShell>
  );
}
