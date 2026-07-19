export const dynamic = "force-dynamic";

import { ModernPortalShell } from "@/components/modern-portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { ReceptionSettingsClient } from "./reception-settings-client";

export default async function ReceptionSettingsPage() {
  const user = await requirePrivilege("settings.view");
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

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile.school.name}
      schoolLogoUrl={profile.school.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={profile?.avatarUrl ?? undefined}
      pathname="/admin/settings/reception"
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Reception Configuration</h2>
            <p className="text-sm text-slate-500">Configure numbering prefixes, stages, types and purposes for reception modules</p>
          </div>
          <div className="p-6">
            <ReceptionSettingsClient schoolId={profile.schoolId} />
          </div>
        </div>
      </div>
    </ModernPortalShell>
  );
}
