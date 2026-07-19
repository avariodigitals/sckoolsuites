export const dynamic = "force-dynamic";

import { ModernPortalShell } from "@/components/modern-portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { prisma } from "@/lib/db";
import { AcademicCalendarClient } from "@/app/admin/settings/academic-calendar/academic-calendar-client";

export default async function AcademicCalendarPage() {
  const user = await requirePrivilege("sessions.manage");
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

  const [sessions, terms] = await Promise.all([
    prisma.session.findMany({
      where: { schoolId: profile.school.id },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.term.findMany({
      where: { schoolId: profile.school.id },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  const toISO = (d: any) => {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString();
    if (typeof d === "string") return new Date(d).toISOString();
    return null;
  };

  const initialSessions = sessions.map((item: { id: number; name: string; isCurrent: boolean; status: string; startDate: Date | string | null; endDate: Date | string | null }) => ({
    id: String(item.id),
    name: item.name,
    isCurrent: item.isCurrent,
    status: item.status as "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED",
    startDate: toISO(item.startDate),
    endDate: toISO(item.endDate),
  }));

  const initialTerms = terms.map((item: { id: number; name: string; isCurrent: boolean; status: string; sessionId: number; startDate: Date | string | null; endDate: Date | string | null; resumptionDate: Date | string | null }) => ({
    id: String(item.id),
    name: item.name,
    isCurrent: item.isCurrent,
    status: item.status as "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED",
    sessionId: String(item.sessionId),
    startDate: toISO(item.startDate),
    endDate: toISO(item.endDate),
    resumptionDate: toISO(item.resumptionDate),
  }));

  const activeSession = sessions.find((item: { isCurrent: boolean }) => item.isCurrent);
  const activeTerm = terms.find((item: { isCurrent: boolean }) => item.isCurrent);

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile.school.name}
      schoolLogoUrl={profile.school.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      avatarUrl={profile?.avatarUrl ?? undefined}
      pathname="/admin/settings/academic-calendar"
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Academic Calendar & Setup</h2>
            <p className="text-sm text-slate-500">Manage academic sessions, terms, and scheduling</p>
          </div>
          <div className="p-6">
            <AcademicCalendarClient
              initialSessions={initialSessions}
              initialTerms={initialTerms}
              initialSessionId={activeSession?.id == null ? undefined : String(activeSession.id)}
              initialTermId={activeTerm?.id == null ? undefined : String(activeTerm.id)}
            />
          </div>
        </div>
      </div>
    </ModernPortalShell>
  );
}
