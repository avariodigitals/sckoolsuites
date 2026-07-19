export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { BrandingForm } from "@/app/admin/settings/branding/branding-form";

export default async function BrandingSettingsPage() {
  let user: Awaited<ReturnType<typeof requirePrivilege>> | null = null;
  try {
    user = await requirePrivilege("branding.manage");
  } catch {
    redirect("/login");
  }
  if (!user) redirect("/login");

  let dbUser = null;
  let profile = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
    profile = await getCurrentSchoolByUser(user.id);
  } catch (error) {
    console.error("[branding/page] Database error:", error);
    return (
      <PortalShell
        role={user.role}
        schoolName="School"
        userName={user.name ?? "Admin"}
        pathname="/admin/settings/branding"
      >
        <Card>
          <CardHeader>
            <CardTitle>School Branding & Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Unable to load branding data. This usually means the database needs migrations.
              Please run migrations and try again.
            </p>
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

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
  let branding = null;
  try {
    branding = await prisma.schoolBranding.findUnique({ where: { schoolId } });
  } catch {
    // SchoolBranding table may not exist yet in partially migrated databases
  }

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
              reportCardTheme: branding?.reportCardTheme ?? "classic",
              invoiceTheme: branding?.invoiceTheme ?? "clean",
              receiptTheme: branding?.receiptTheme ?? "simple",
              bankName: branding?.bankName ?? "",
              bankAccountName: branding?.bankAccountName ?? "",
              bankAccountNumber: branding?.bankAccountNumber ?? "",
              bankInstructions: branding?.bankInstructions ?? "",
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
