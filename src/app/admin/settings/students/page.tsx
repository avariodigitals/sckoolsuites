import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { DashboardHeader } from "@/components/modern-dashboard";
import { StudentSettingsClient } from "./student-settings-client";

export default async function StudentSettingsPage() {
  const user = await requirePrivilege("settings.view");
  const profile = await getCurrentSchoolByUser(user.id);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile?.school?.name ?? "School"}
      schoolLogoUrl={profile?.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={dbUser?.avatarUrl ?? undefined}
      pathname="/admin/settings/students"
    >
      <div className="space-y-6">
        <DashboardHeader
          title="Student Settings"
          subtitle="Configure registration, attendance, transfers, and service request settings for students."
        />
        <StudentSettingsClient />
      </div>
    </ModernPortalShell>
  );
}
