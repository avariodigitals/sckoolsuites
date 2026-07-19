import { ModernPortalShell } from "@/components/modern-portal-shell";
import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { CallLogClient } from "./call-log-client";

export default async function CallLogPage() {
  const user = await requirePrivilege("reception.view");
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
      pathname="/admin/reception/call-log"
    >
      <CallLogClient schoolId={profile.schoolId} />
    </ModernPortalShell>
  );
}
