import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { DashboardHeader } from "@/components/modern-dashboard";
import { TransferClient } from "./transfer-client";

export default async function TransfersPage() {
  const user = await requirePrivilege("students.manage");
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  const profile = await getCurrentSchoolByUser(user.id);

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile?.school?.name ?? "School"}
      schoolLogoUrl={profile?.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={dbUser?.avatarUrl ?? undefined}
      pathname="/admin/students/transfers"
    >
      <div className="space-y-6">
        <DashboardHeader
          title="Student Transfers"
          subtitle="Search and transfer students between classes and arms"
        />
        <TransferClient schoolId={profile?.schoolId ?? "default"} />
      </div>
    </ModernPortalShell>
  );
}
