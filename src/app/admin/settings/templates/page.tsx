export const dynamic = "force-dynamic";

import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplatesManager } from "./templates-manager";

export default async function TemplatesSettingsPage() {
  const user = await requirePrivilege("templates.view");
  const profile = await getCurrentSchoolByUser(user.id);

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile?.school?.name}
      schoolLogoUrl={profile?.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={profile?.avatarUrl ?? undefined}
      pathname="/admin/settings/templates"
    >
      <Card>
        <CardHeader>
          <CardTitle>Document Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplatesManager />
        </CardContent>
      </Card>
    </ModernPortalShell>
  );
}
