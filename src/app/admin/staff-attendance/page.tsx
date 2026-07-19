import { requirePrivilege } from "@/lib/auth-guards";
import { getCurrentSchoolByUser } from "@/lib/data";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { DashboardHeader } from "@/components/modern-dashboard";
import { StaffAttendanceManager } from "./staff-attendance-manager";

export default async function StaffAttendancePage() {
  const user = await requirePrivilege("attendance.view");
  const profile = await getCurrentSchoolByUser(user.id);

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile?.school?.name ?? "School"}
      schoolLogoUrl={profile?.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? ""}
      avatarUrl={user.avatarUrl || undefined}
      primaryColor={profile?.school?.branding?.primaryColor ?? undefined}
      secondaryColor={profile?.school?.branding?.secondaryColor ?? undefined}
      pathname="/admin/staff-attendance"
    >
      <div className="space-y-4">
        <DashboardHeader
          title="Staff Attendance"
          subtitle="View all employee clock-in and clock-out records with face capture and geolocation"
        />
        <StaffAttendanceManager />
      </div>
    </ModernPortalShell>
  );
}
