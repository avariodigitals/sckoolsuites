import { requireRole } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { DashboardHeader } from "@/components/modern-dashboard";
import { ArmSubjectMappingManager } from "../../[section]/arm-subject-mapping";

export default async function ArmSubjectMappingPage() {
  const user = await requireRole(["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  const profile = await getCurrentSchoolByUser(user.id);

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile?.school?.name ?? "School"}
      schoolLogoUrl={profile?.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={dbUser?.avatarUrl ?? undefined}
      pathname="/admin/classes/mapping"
    >
      <div className="space-y-6">
        <DashboardHeader 
          title="Arm Subject Mapping" 
          subtitle="Assign subjects to specific class arms and bind teachers to subject-arm combinations." 
        />
        <ArmSubjectMappingManager />
      </div>
    </ModernPortalShell>
  );
}
