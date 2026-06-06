import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MetricGrid, SimpleTable } from "@/components/dashboard-kit";
import { PortalShell } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guards";
import { getAdminOverview, getCoreSchoolData, getCurrentSchoolByUser, statusLabel } from "@/lib/data";
import { formatDate, naira } from "@/lib/utils";

const roleAliases: Record<string, string[]> = {
  admin: ["SCHOOL_ADMIN", "PRINCIPAL"],
  teacher: ["TEACHER"],
  accountant: ["ACCOUNTANT"],
  parent: ["PARENT"],
  student: ["STUDENT"],
  registrar: ["REGISTRAR"],
  superadmin: ["SUPER_ADMIN"],
};

export async function PortalPage({
  roleScope,
  pathname,
  title,
}: {
  roleScope: keyof typeof roleAliases;
  pathname: string;
  title: string;
}) {
  const user = await requireRole(roleAliases[roleScope]);
  const userRecord = await getCurrentSchoolByUser(user.id);

  if (!userRecord) return null;

  if (roleScope === "superadmin") {
    const schools = await (await import("@/lib/db")).prisma.school.findMany({
      include: { students: true, users: true, payments: true },
      orderBy: { createdAt: "desc" },
    });

    const activeSchools = schools.filter((s) => s.isActive).length;
    const totalRevenue = schools.reduce((sum: number, school: any) => sum + (school.payments?.reduce((acc: number, payment: any) => acc + payment.amount, 0) || 0), 0);

    return (
      <PortalShell role={user.role} userName={user.name ?? "Super Admin"} pathname={pathname}>
        <MetricGrid
          items={[
            { label: "Active Schools", value: String(activeSchools) },
            { label: "Total Schools", value: String(schools.length) },
            { label: "Subscription Coverage", value: `${schools.length ? ((activeSchools / schools.length) * 100).toFixed(1) : "0.0"}%`, helper: "Active schools ratio" },
            { label: "Platform Revenue", value: naira(totalRevenue), helper: "From recorded payments" },
          ]}
        />
        <SimpleTable
          title="School Usage"
          headers={["School", "Users", "Students", "Status"]}
          rows={schools.map((school) => [school.name, String(school.users.length), String(school.students.length), school.isActive ? "Active" : "Inactive"])}
        />
      </PortalShell>
    );
  }

  const schoolId = userRecord.schoolId;
  if (!schoolId) return null;

  const [overview, core] = await Promise.all([getAdminOverview(schoolId), getCoreSchoolData(schoolId)]);
  const latestBill = core.bills[0];
  const latestResult = core.result;

  const metricItems = [
    { label: "Students", value: String(overview.students) },
    { label: "Teachers", value: String(overview.teachers) },
    { label: "Billed", value: naira(overview.totalInvoiced) },
    { label: "Outstanding", value: naira(overview.outstanding) },
  ];

  return (
    <PortalShell
      role={user.role}
      schoolName={core.school?.name}
      schoolLogoUrl={core.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "User"}
      pathname={pathname}
      primaryColor={core.school?.branding?.primaryColor}
      secondaryColor={core.school?.branding?.secondaryColor}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <MetricGrid items={metricItems} />
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>Current Session: {latestResult?.session.name ?? "-"}</p>
            <p>Current Term: {latestResult?.term.name ?? "-"}</p>
            <p>Announcements: {core.announcements.length}</p>
            <p className="text-xs text-slate-500">Role-based access enabled.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SimpleTable
          title="Bills"
          headers={["No", "Student", "Total", "Paid", "Balance", "Status"]}
          rows={core.bills.slice(0, 6).map((bill) => [
            bill.invoiceNumber,
            bill.student.user.name,
            naira(bill.totalAmount),
            naira(bill.amountPaid),
            naira(bill.balance),
            statusLabel(bill.status),
          ])}
        />

        <SimpleTable
          title="Recent Scores"
          headers={["Subject", "CA", "Exam", "Total", "Grade", "GPA"]}
          rows={core.scores.slice(0, 8).map((score) => [
            score.subject.name,
            String(score.caScore),
            String(score.examScore),
            String(score.total),
            score.grade,
            String(score.gpa),
          ])}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SimpleTable
          title="LMS Assignments"
          headers={["Title", "Subject", "Due", "Student"]}
          rows={core.assignments.slice(0, 6).map((item) => [
            item.title,
            item.subject?.name ?? "-",
            formatDate(item.dueDate),
            item.student?.user.name ?? "Class",
          ])}
        />

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge>Fees</Badge>
              <Badge>Bills</Badge>
              <Badge>Attendance</Badge>
              <Badge>Results</Badge>
              <Badge>LMS</Badge>
            </div>
            {latestBill ? (
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium">Latest Bill: {latestBill.invoiceNumber}</p>
                <p className="text-slate-600">Status: {statusLabel(latestBill.status)}</p>
                <div className="mt-2 flex gap-2">
                  <Link href={`/bill/${latestBill.id}`} className="text-[var(--brand-primary)] underline">
                    View Bill
                  </Link>
                  {latestBill.receipt ? (
                    <Link href={`/receipt/${latestBill.id}`} className="text-[var(--brand-secondary)] underline">
                      View Receipt
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
            {latestResult ? (
              <Link href={`/reports/${latestResult.studentId}`} className="text-[var(--brand-primary)] underline">
                Open Report Card
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
