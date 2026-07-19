import { requireUser } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { prisma } from "@/lib/db";
import { getUserPrivileges, ADMIN_PORTAL_PRIVILEGES } from "@/lib/privileges";
import { roleDefaultRoute } from "@/lib/constants";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const privileges = await getUserPrivileges(user.id);
  const hasAnyAdminPriv = ADMIN_PORTAL_PRIVILEGES.some((p) => privileges[p] === true);
  if (!hasAnyAdminPriv) {
    const fallback = roleDefaultRoute[user.role] ?? "/login";
    redirect(fallback);
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  const profile = await getCurrentSchoolByUser(user.id);

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile?.school?.name ?? "School"}
      schoolLogoUrl={profile?.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={dbUser?.avatarUrl ?? undefined}
      primaryColor={profile?.school?.branding?.primaryColor ?? undefined}
      secondaryColor={profile?.school?.branding?.secondaryColor ?? undefined}
      privileges={privileges}
    >
      {children}
    </ModernPortalShell>
  );
}
