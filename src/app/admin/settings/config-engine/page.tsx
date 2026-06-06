import { ModernPortalShell } from "@/components/modern-portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { requireRole } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { getActiveSchoolConfig, getSchoolConfigVersions } from "@/lib/school-config";
import { ConfigEngineClient } from "@/app/admin/settings/config-engine/config-engine-client";

export default async function ConfigEnginePage() {
  const user = await requireRole(["SCHOOL_ADMIN", "PRINCIPAL"]);
  const profile = await getCurrentSchoolByUser(user.id);

  if (!profile?.schoolId || !profile?.school) {
    return (
      <SetupRequiredScreen
        title="School Profile Missing"
        message="Your admin account is not linked to a school yet. Complete school setup to configure dynamic academic and billing logic."
        actionHref="/create-account"
        actionLabel="Open School Setup"
      />
    );
  }

  const [active, versions] = await Promise.all([
    getActiveSchoolConfig(profile.schoolId),
    getSchoolConfigVersions(profile.schoolId),
  ]);

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile.school.name}
      schoolLogoUrl={profile.school.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      pathname="/admin/settings/config-engine"
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Configuration Engine</h2>
            <p className="text-sm text-slate-500">Configure dynamic academic and billing logic</p>
          </div>
          <div className="p-6">
            <ConfigEngineClient
              initialActive={{
                id: active.id,
                version: active.version,
                source: active.source,
                notes: active.notes,
                config: active.config,
              }}
              initialVersions={versions.map((item: { id: string; version: string; isActive: boolean; source: string; notes: string | null; createdAt: Date }) => ({
                id: item.id,
                version: item.version,
                isActive: item.isActive,
                source: item.source,
                notes: item.notes,
                createdAt: item.createdAt.toISOString(),
              }))}
            />
          </div>
        </div>
      </div>
    </ModernPortalShell>
  );
}
