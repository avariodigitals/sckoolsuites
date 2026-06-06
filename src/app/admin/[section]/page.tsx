import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { DashboardHeader, StatCard, SectionCard } from "@/components/modern-dashboard";
import { BillContestReviewPanel } from "@/components/bill-contest-review-panel";
import { AdminApprovalActions } from "./admin-approval-actions";
import { StudentManager } from "./student-manager";
import { ParentManager } from "./parent-manager";
import { TeacherManager } from "./teacher-manager";
import { ClassManager } from "./class-manager";
import { SubjectManager } from "./subject-manager";
import { AttendanceManager } from "./attendance-manager";
import { LMSManager } from "./lms-manager";
import { AnnouncementManager } from "./announcement-manager";
import { TransportManager } from "./transport-manager";
import { ReceptionManager } from "./reception-manager";
import { FeeProfileManager } from "./fee-profile-manager";
import { BillManager } from "./bill-manager";
import { requireRole } from "@/lib/auth-guards";
import { getAdminOverview, getCoreSchoolDataByContext, getCurrentSchoolByUser, getUserAcademicContext } from "@/lib/data";
import { adminModuleScopeBySection } from "@/lib/module-blueprint";
import { getActiveSchoolConfig } from "@/lib/school-config";
import { getSetupWizardState } from "@/lib/setup-wizard";
import { formatDate, naira } from "@/lib/utils";
import { prisma } from "@/lib/db";

const allowed = [
  "dashboard",
  "students",
  "reception",
  "parents",
  "teachers",
  "academics",
  "classes",
  "subjects",
  "fees",
  "finance",
  "invoices",
  "payments",
  "results",
  "lms",
  "attendance",
  "announcements",
  "transport",
  "settings",
] as const;

type AllowedSection = (typeof allowed)[number];

type AdminSectionBlueprint = {
  title: string;
  subtitle: string;
  metrics: Array<{ label: string; value: string; helper?: string }>;
  actionChips: string[];
};

const blueprints: Record<AllowedSection, AdminSectionBlueprint> = {
  dashboard: {
    title: "Admin Command Center",
    subtitle: "School operations, academic control, and finance in one workspace.",
    metrics: [],
    actionChips: ["Admissions", "Classes", "Fees", "Results"],
  },
  students: {
    title: "Student Management",
    subtitle: "Admissions pipeline, records, promotions, discipline, and profile tracking.",
    metrics: [],
    actionChips: ["New Admission", "Bulk Promote", "Student Profile", "Export List"],
  },
  reception: {
    title: "Reception & Front Desk",
    subtitle: "New applicants, visitor intake, document checks, and parent follow-up.",
    metrics: [],
    actionChips: ["New Applicant", "Interview Queue", "Document Review", "Enrollment"],
  },
  parents: {
    title: "Parent Management",
    subtitle: "Parent records, communication, linked children, and account status.",
    metrics: [],
    actionChips: ["Parent Profiles", "Messages", "Complaints", "Payment Follow-up"],
  },
  teachers: {
    title: "Staff & Teacher Management",
    subtitle: "Teacher directory, permissions, class assignments, and workload control.",
    metrics: [],
    actionChips: ["Staff Directory", "Role Permissions", "Assignments", "Leave Review"],
  },
  academics: {
    title: "Academic Control",
    subtitle: "Sessions, terms, classes, arms, subjects, curriculum, and timetable planning.",
    metrics: [],
    actionChips: ["Session Setup", "Classes & Arms", "Subjects", "Timetable"],
  },
  classes: {
    title: "Class Builder",
    subtitle: "Create classes with arms and assign different subjects per arm.",
    metrics: [],
    actionChips: ["Add Class", "Add Arm", "Assign Subjects", "Promote Class"],
  },
  subjects: {
    title: "Subject Management",
    subtitle: "Allocate subjects by class and arm, then keep curriculum aligned.",
    metrics: [],
    actionChips: ["Add Subject", "Assign Teacher", "By Class", "By Arm"],
  },
  fees: {
    title: "Fee Setup",
    subtitle: "Fee groups, fee structures, concessions, and billing rules.",
    metrics: [],
    actionChips: ["Fee Group", "Structure", "Concession", "Bill Rule"],
  },
  finance: {
    title: "Finance Management",
    subtitle: "Bills, payments, receipts, debtors, discounts, and collections.",
    metrics: [],
    actionChips: ["Fee Setup", "Bills", "Payments", "Debtors"],
  },
  invoices: {
    title: "Bill Management",
    subtitle: "Generate bills, review balances, and track bill status.",
    metrics: [],
    actionChips: ["Generate Bill", "View Open", "Print Bill", "Ledger Sync"],
  },
  payments: {
    title: "Payment Records",
    subtitle: "Confirm payments, reconcile channels, and monitor collections.",
    metrics: [],
    actionChips: ["Payment List", "Approve", "Reconcile", "Receipt Review"],
  },
  results: {
    title: "Result Engine",
    subtitle: "Assessment weights, grading bands, approvals, and report cards.",
    metrics: [],
    actionChips: ["Weight Setup", "Draft Results", "Publish", "Report Cards"],
  },
  lms: {
    title: "Learning Hub",
    subtitle: "Lessons, assignments, quizzes, and class content delivery.",
    metrics: [],
    actionChips: ["Lessons", "Assignments", "Quizzes", "Online Classes"],
  },
  attendance: {
    title: "Attendance Tracking",
    subtitle: "Daily attendance, punctuality, late records, and summaries.",
    metrics: [],
    actionChips: ["Take Attendance", "Attendance History", "Late Records", "Reports"],
  },
  announcements: {
    title: "Communication Hub",
    subtitle: "Announcements, broadcasts, events, and parent messages.",
    metrics: [],
    actionChips: ["Broadcast", "Event Notice", "Parent Message", "SMS/Email"],
  },
  transport: {
    title: "Transport & Driver",
    subtitle: "Bus routes, drivers, pickup planning, and transport readiness.",
    metrics: [],
    actionChips: ["Driver List", "Routes", "Pickup Stops", "Fleet Setup"],
  },
  settings: {
    title: "System Settings",
    subtitle: "Branding, calendar, configuration engine, and portal visibility.",
    metrics: [],
    actionChips: ["Configuration Engine", "Branding", "Academic Calendar", "Visibility"],
  },
};

function listToRows(items: Array<{ name: string; detail: string; status: string }>) {
  return items.map((item) => [item.name, item.detail, item.status]);
}

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(allowed as readonly string[]).includes(section)) notFound();

  const user = await requireRole(["SCHOOL_ADMIN", "PRINCIPAL"]);
  const profile = await getCurrentSchoolByUser(user.id);
  if (!profile?.schoolId || !profile.school) {
    return null;
  }

  const context = await getUserAcademicContext(profile.schoolId, user.id);
  const [overview, core, activeConfig, feeGroupCount, setup] = await Promise.all([
    getAdminOverview(profile.schoolId),
    getCoreSchoolDataByContext(profile.schoolId, { sessionId: context.session?.id, termId: context.term?.id }),
    getActiveSchoolConfig(profile.schoolId),
    prisma.feeGroup.count({ where: { schoolId: profile.schoolId, isActive: true } }),
    getSetupWizardState(profile.schoolId),
  ]);

  const blueprint = blueprints[section as AllowedSection];
  const setupLocked = !setup.status.setupCompleted && ["fees", "finance", "invoices", "results"].includes(section);
  const academic = activeConfig.config.academic as {
    sessions: Array<{ name: string; status?: string }>;
    terms: Array<{ name: string; status?: string }>;
    classes: Array<{ name: string; arms?: Array<{ name: string; subjects?: string[] }> }>;
    subjects: Array<{ name: string; className?: string; armName?: string }>;
    assessmentTypes: Array<{ name: string; weight: number }>;
    gradingSystem: Array<{ min: number; grade: string; gpa: number }>;
  };
  const finance = activeConfig.config.finance as {
    feeStructures: Array<{ category: string; name: string; amount: number; className?: string; isActive?: boolean }>;
  };

  const metricsBySection: Record<AllowedSection, Array<{ label: string; value: string; helper?: string }>> = {
    dashboard: [
      { label: "Students", value: String(overview.students), helper: "Active school records" },
      { label: "Staff", value: String(overview.teachers), helper: "Teaching workforce" },
      { label: "Outstanding Fees", value: naira(overview.outstanding), helper: "Collections pending" },
      { label: "Attendance", value: String(overview.attendance), helper: "Logged attendance entries" },
    ],
    students: [
      { label: "Students", value: String(overview.students), helper: "Active learners" },
      { label: "Parents", value: String(overview.parents), helper: "Linked guardians" },
      { label: "Classes", value: String(overview.classes), helper: "Available placements" },
      { label: "Admission Flow", value: "Open", helper: "Applications can be reviewed" },
    ],
    reception: [
      { label: "Applications", value: String(core.students.length), helper: "Student records on file" },
      { label: "Parents", value: String(overview.parents), helper: "Guardians on file" },
      { label: "Pending Reviews", value: "0", helper: "Ready for intake review" },
      { label: "Documents", value: "Ready", helper: "Upload checks and verification" },
    ],
    parents: [
      { label: "Parents", value: String(overview.parents), helper: "Parent accounts" },
      { label: "Children", value: String(core.students.length), helper: "Linked children" },
      { label: "Messages", value: String(core.announcements.length), helper: "Announcements and alerts" },
      { label: "Bills", value: naira(overview.outstanding), helper: "Outstanding balances" },
    ],
    teachers: [
      { label: "Teachers", value: String(overview.teachers), helper: "Staff accounts" },
      { label: "Classes", value: String(overview.classes), helper: "Assigned class groups" },
      { label: "Subjects", value: String(core.subjects.length), helper: "Assigned subjects" },
      { label: "Pending Tasks", value: String(core.assignments.length), helper: "Content and grading tasks" },
    ],
    academics: [
      { label: "Sessions", value: String(academic.sessions.length), helper: "Academic sessions" },
      { label: "Terms", value: String(academic.terms.length), helper: "Term definitions" },
      { label: "Classes", value: String(academic.classes.length), helper: "Class groups and arms" },
      { label: "Subjects", value: String(academic.subjects.length), helper: "Curriculum subjects" },
    ],
    classes: [
      { label: "Classes", value: String(academic.classes.length), helper: "Configured class groups" },
      { label: "Arms", value: String(academic.classes.reduce((sum, item) => sum + (item.arms?.length ?? 0), 0)), helper: "Streams per class" },
      { label: "Subjects", value: String(academic.subjects.length), helper: "Subject assignments" },
      { label: "Current Session", value: context.session?.name ?? "-", helper: context.term?.name ?? "Active term" },
    ],
    subjects: [
      { label: "Subjects", value: String(academic.subjects.length), helper: "Defined subject list" },
      { label: "Class Links", value: String(academic.subjects.filter((item) => item.className).length), helper: "Class-specific allocations" },
      { label: "Arm Links", value: String(academic.subjects.filter((item) => item.armName).length), helper: "Arm-specific allocations" },
      { label: "Teachers", value: String(overview.teachers), helper: "Subject teachers available" },
    ],
    fees: [
      { label: "Fee Groups", value: String(feeGroupCount), helper: "Active groups" },
      { label: "Concessions", value: "Ready", helper: "Discount and waiver support" },
      { label: "Bills", value: String(core.bills.length), helper: "Generated billing records" },
      { label: "Outstanding", value: naira(overview.outstanding), helper: "Unpaid balances" },
    ],
    finance: [
      { label: "Bills", value: String(core.bills.length), helper: "Billing records" },
      { label: "Payments", value: String(core.payments.length), helper: "Payment entries" },
      { label: "Outstanding", value: naira(overview.outstanding), helper: "Balance due" },
      { label: "Fee Structures", value: String(finance.feeStructures.length), helper: "Dynamic fee setup" },
    ],
    invoices: [
      { label: "Bills", value: String(core.bills.length), helper: "Generated bills" },
      { label: "Paid", value: naira(overview.totalPaid), helper: "Collected value" },
      { label: "Outstanding", value: naira(overview.outstanding), helper: "Open balances" },
      { label: "Receipts", value: String(core.bills.filter((item) => item.receipt).length), helper: "Issued proof of payment" },
    ],
    payments: [
      { label: "Payments", value: String(core.payments.length), helper: "Recorded collections" },
      { label: "Collected", value: naira(overview.totalPaid), helper: "Actual receipts" },
      { label: "Bills", value: String(core.bills.length), helper: "Billing queue" },
      { label: "Receipts", value: String(core.bills.filter((item) => item.receipt).length), helper: "Validated payments" },
    ],
    results: [
      { label: "Assessment Types", value: String(academic.assessmentTypes.length), helper: "Weightable scoring blocks" },
      { label: "Grading Bands", value: String(academic.gradingSystem.length), helper: "Configured thresholds" },
      { label: "Scores", value: String(core.scores.length), helper: "Captured marks" },
      { label: "Reports", value: core.result ? "Draft" : "Pending", helper: "Current publication state" },
    ],
    lms: [
      { label: "Lessons", value: String(core.lessons.length), helper: "Lesson notes" },
      { label: "Assignments", value: String(core.assignments.length), helper: "Classwork items" },
      { label: "Quizzes", value: String(core.quizzes.length), helper: "CBT activities" },
      { label: "Online Classes", value: String(core.onlineClasses.length), helper: "Live sessions" },
    ],
    attendance: [
      { label: "Attendance", value: String(core.attendance.length), helper: "Logged entries" },
      { label: "Classes", value: String(overview.classes), helper: "Tracked groups" },
      { label: "Present", value: String(core.attendance.filter((item) => item.status === "PRESENT").length), helper: "Marked present" },
      { label: "Excused", value: String(core.attendance.filter((item) => item.status === "EXCUSED").length), helper: "Approved absences" },
    ],
    announcements: [
      { label: "Announcements", value: String(core.announcements.length), helper: "Broadcast posts" },
      { label: "Parents", value: String(overview.parents), helper: "Targeted recipients" },
      { label: "Teachers", value: String(overview.teachers), helper: "Staff recipients" },
      { label: "Students", value: String(overview.students), helper: "Learner recipients" },
    ],
    transport: [
      { label: "Routes", value: "Ready", helper: "Route planning bucket" },
      { label: "Drivers", value: "Ready", helper: "Driver roster bucket" },
      { label: "Pickup Stops", value: "Ready", helper: "Pickup allocation bucket" },
      { label: "Fleet", value: "Future", helper: "Transport module is scaffolded" },
    ],
    settings: [
      { label: "Config Versions", value: String(activeConfig.version), helper: activeConfig.source },
      { label: "Branding", value: profile.school.branding ? "Ready" : "Pending", helper: "Logo and colors" },
      { label: "Visibility", value: "On", helper: "Portal access rules" },
      { label: "Calendar", value: String(academic.sessions.length), helper: "Sessions configured" },
    ],
  };

  const metrics = metricsBySection[section as AllowedSection];
  const moduleScope = adminModuleScopeBySection[section] ?? {
    module: "Admin",
    submodules: [{ name: "General", screens: ["Overview"] }],
  };

  const classRows = academic.classes.map((item) => ({
    name: item.name,
    detail: `${item.arms?.length ?? 0} arm${(item.arms?.length ?? 0) === 1 ? "" : "s"}`,
    status: (item.arms?.length ?? 0) ? item.arms?.map((arm) => `${arm.name}: ${arm.subjects?.length ?? 0}`).join(" | ") ?? "No arms yet" : "No arms yet",
  }));

  const subjectRows = academic.subjects.map((item) => ({
    name: item.name,
    detail: [item.className, item.armName].filter(Boolean).join(" / ") || "Unassigned",
    status: "Subject allocation",
  }));

  const feeRows = finance.feeStructures.slice(0, 8).map((item) => ({
    name: item.name,
    detail: `${item.category} • ${naira(item.amount)}`,
    status: item.isActive === false ? "Inactive" : item.className ?? "Global",
  }));

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile.school.name}
      schoolLogoUrl={profile.school.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Admin"}
      pathname={`/admin/${section}`}
    >
      <div className="space-y-6">
        {!setup.status.setupCompleted ? (
          <Card className="border-amber-200 bg-amber-50" data-testid="setup-incomplete-banner">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-amber-900">
                  School Setup — {setup.completionPercentage}% complete
                </CardTitle>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  {setup.completionPercentage}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-200">
                <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${setup.completionPercentage}%` }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-900">
              {(() => {
                const stepLabels: Record<string, string> = {
                  "school-profile": "School Profile",
                  "academic-setup": "Academic Setup",
                  "classes-arms": "Classes & Arms",
                  "subjects": "Subjects",
                  "grading-assessment": "Grading & Assessment",
                  "finance-setup": "Finance Setup",
                  "users-roles": "Users & Roles",
                };
                const nextStep = (["school-profile", "academic-setup", "classes-arms", "subjects", "grading-assessment", "finance-setup", "users-roles"] as const).find(
                  (s) => !setup.checklist[s],
                );
                return nextStep ? (
                  <p>Next step: <strong>{stepLabels[nextStep]}</strong></p>
                ) : (
                  <p>All steps complete — ready to activate.</p>
                );
              })()}
              <p className="text-xs font-medium text-amber-800">
                &#9888; Bill generation and result publishing are locked until setup is activated.
              </p>
              <Link
                href="/admin/setup"
                className="inline-flex rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                data-testid="banner-continue-setup"
              >
                Continue Setup Wizard &#8594;
              </Link>
            </CardContent>
          </Card>
        ) : null}
        <DashboardHeader title={blueprint.title} subtitle={blueprint.subtitle} />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.slice(0, 4).map((metric) => (
            <StatCard
              key={metric.label}
              title={metric.label}
              value={metric.value}
              iconName={metric.label.toLowerCase().includes("student") ? "graduationCap" : metric.label.toLowerCase().includes("teacher") || metric.label.toLowerCase().includes("staff") ? "users" : metric.label.toLowerCase().includes("fee") || metric.label.toLowerCase().includes("bill") || metric.label.toLowerCase().includes("payment") || metric.label.toLowerCase().includes("outstanding") || metric.label.toLowerCase().includes("paid") ? "dollarSign" : "bookOpen"}
            />
          ))}
        </div>

        {(section === "payments" || section === "finance") && !setupLocked ? (
          <AdminApprovalActions mode="payments" sessionId={context.session?.id} termId={context.term?.id} />
        ) : null}

        {section === "results" && !setupLocked ? (
          <AdminApprovalActions mode="results" sessionId={context.session?.id} termId={context.term?.id} />
        ) : null}

        {section === "invoices" && !setupLocked ? <BillContestReviewPanel currentRole={user.role} /> : null}

        {(section === "fees" || section === "finance") && !setupLocked ? <FeeProfileManager /> : null}

        {section === "students" ? <StudentManager /> : null}

        {section === "parents" ? <ParentManager /> : null}

        {section === "teachers" ? <TeacherManager /> : null}

        {section === "classes" ? <ClassManager /> : null}

        {section === "subjects" ? <SubjectManager /> : null}

        {section === "attendance" ? <AttendanceManager /> : null}

        {section === "lms" ? <LMSManager /> : null}

        {section === "announcements" ? <AnnouncementManager /> : null}

        {section === "transport" ? <TransportManager /> : null}

        {section === "reception" ? <ReceptionManager /> : null}

        {section === "bills" ? <BillManager /> : null}

        {setupLocked ? (
          <Card className="border-rose-200 bg-rose-50">
            <CardHeader>
              <CardTitle className="text-rose-900">This module is locked until setup is complete.</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-rose-800">
              Activate school setup from the setup wizard before using finance invoicing and result approval workflows.
            </CardContent>
          </Card>
        ) : null}


        {/* Module Scope - Hidden for sections that show it in their manager */}
        {!["students", "reception", "classes"].includes(section) && (
          <SectionCard title={`${moduleScope.module} Module Scope`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 font-medium">Submodule</th>
                    <th className="px-2 py-2 font-medium">Screens</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleScope.submodules.map((item) => (
                    <tr key={`${section}-${item.name}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-3 font-medium text-slate-800">{item.name}</td>
                      <td className="px-2 py-3 text-slate-600">{item.screens.join(" • ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </div>
    </ModernPortalShell>
  );
}
