import { requirePrivilege } from "@/lib/auth-guards";
import { getUserPrivileges } from "@/lib/privileges";
import { DashboardHeader } from "@/components/modern-dashboard";
import { AdmissionsManager } from "./admissions-manager-new";

export default async function AdmissionsPage() {
  const user = await requirePrivilege("admissions.view");
  const privileges = await getUserPrivileges(user.id);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Student Admissions"
        subtitle="Receive applications, conduct tests, interview and enroll students"
      />
      <AdmissionsManager canManage={privileges["admissions.manage"] === true} />
    </div>
  );
}
