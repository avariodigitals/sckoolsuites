export const dynamic = "force-dynamic";

import { PortalShell } from "@/components/portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { BrandingForm } from "@/app/admin/settings/branding/branding-form";

export default async function BrandingSettingsPage() {
  const user = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  const profile = await getCurrentSchoolByUser(user.id);

  if (!profile?.school) {
    return (
      <SetupRequiredScreen
        title="School Profile Missing"
        message="Your admin account does not have a school profile yet. Please complete school setup first."
        actionHref="/create-account"
        actionLabel="Open School Setup"
      />
    );
  }

  const schoolId = profile.schoolId || "default";
  const branding = await prisma.schoolBranding.findUnique({ where: { schoolId } });

  return (
    <PortalShell
      role={user.role}
      schoolName={profile.school.name}
      schoolLogoUrl={branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={dbUser?.avatarUrl ?? undefined}
      pathname="/admin/settings/branding"
      primaryColor={branding?.primaryColor}
      secondaryColor={branding?.secondaryColor}
    >
      <Card>
        <CardHeader>
          <CardTitle>School Branding & Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandingForm
            defaults={{
              schoolName: profile.school.name,
              address: profile.school.address,
              email: profile.school.email,
              phone: profile.school.phone,
              website: profile.school.website ?? "",
              motto: profile.school.motto ?? "",
              logoUrl: branding?.logoUrl ?? "",
              primaryColor: branding?.primaryColor ?? "#0B1F4D",
              secondaryColor: branding?.secondaryColor ?? "#0E9F6E",
              principalSignature: branding?.principalSignature ?? "",
              teacherSignature: branding?.teacherSignature ?? "",
              schoolStamp: branding?.schoolStamp ?? "",
            }}
          />
        </CardContent>
      </Card>
    </PortalShell>
  );
}
