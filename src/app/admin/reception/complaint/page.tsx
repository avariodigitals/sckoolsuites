import { ModernPortalShell } from "@/components/modern-portal-shell";
import { requireRole } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ComplaintClient } from "./complaint-client";

export default async function ComplaintPage() {
  const user = await requireRole(["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "RECEPTIONIST"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  const profile = await getCurrentSchoolByUser(user.id);

  if (!profile?.school) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
          School profile required. Please complete setup first.
        </div>
      </div>
    );
  }

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile.school.name}
      schoolLogoUrl={profile.school.branding?.logoUrl || undefined}
      userName={user.name || "Admin"}
      avatarUrl={dbUser?.avatarUrl ?? undefined}
      pathname="/admin/reception/complaint"
    >
      <ComplaintClient schoolId={profile.schoolId} />
    </ModernPortalShell>
  );
}
