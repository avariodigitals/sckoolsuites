import { requireRole } from "@/lib/auth-guards";
import { DashboardHeader } from "@/components/modern-dashboard";
import { AdmissionsManager } from "./admissions-manager-new";

export default async function AdmissionsPage() {
  const user = await requireRole(["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Student Admissions"
        subtitle="Receive applications, conduct tests, interview and enroll students"
      />
      <AdmissionsManager userRole={user.role} />
    </div>
  );
}
