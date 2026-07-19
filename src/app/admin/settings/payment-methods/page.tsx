export const dynamic = "force-dynamic";

import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentMethodsManager } from "./payment-methods-manager";

export default async function PaymentMethodsPage() {
  const user = await requirePrivilege("settings.view");
  const profile = await getCurrentSchoolByUser(user.id);

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile?.school?.name}
      schoolLogoUrl={profile?.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={profile?.avatarUrl ?? undefined}
      pathname="/admin/settings/payment-methods"
    >
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentMethodsManager />
        </CardContent>
      </Card>
    </ModernPortalShell>
  );
}
