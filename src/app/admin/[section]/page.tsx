export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader, StatCard, SectionCard } from "@/components/modern-dashboard";
import { BillContestReviewPanel } from "@/components/bill-contest-review-panel";
import { AdminApprovalActions } from "./admin-approval-actions";
import { StudentManager } from "./student-manager";
import { ParentManager } from "./parent-manager";
import { TeacherManager } from "./teacher-manager";
import { ClassManager } from "./class-manager";
import { SubjectManager } from "./subject-manager";
import { AssessmentManager } from "./assessment-manager";
import { AttendanceManager } from "./attendance-manager";
import { LMSManager } from "./lms-manager";
import { AnnouncementManager } from "./announcement-manager";
import { MessageManager } from "./message-manager";
import { ComplaintManager } from "./complaint-manager";
import { EventManager } from "./event-manager";
import { SurveyManager } from "./survey-manager";
import { TransportManager } from "./transport-manager";
import { ReceptionManager } from "./reception-manager";
import { FeeProfileManager } from "./fee-profile-manager";
import { FinanceManager } from "./finance-manager";
import { BillManager } from "./bill-manager";
import { UserManager } from "./user-manager";
import { RoleManager } from "./role-manager";
import { PrivilegeManager } from "./privilege-manager";
import { ProfileManager } from "./profile-manager";
import { PasswordResetRequests } from "./password-reset-requests";
import { ImportWizard } from "./import-wizard";
import { requireRole } from "@/lib/auth-guards";
import { getAdminOverview, getDashboardData, getCurrentSchoolByUser, getUserAcademicContext } from "@/lib/data";
import { adminModuleScopeBySection } from "@/lib/module-blueprint";
import { getActiveSchoolConfig } from "@/lib/school-config";
import { getSetupWizardState } from "@/lib/setup-wizard";
import { naira } from "@/lib/utils";
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
  "assessments",
  "fees",
  "finance",
  "income",
  "expenses",
  "debtors",
  "ledger",
  "revenue",
  "invoices",
  "payments",
  "results",
  "lms",
  "attendance",
  "announcements",
  "messages",
  "complaints",
  "transport",
  "school-calendar",
  "surveys",
  "settings",
  "users",
  "roles",
  "privileges",
  "profile",
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
  assessments: {
    title: "Assessment Management",
    subtitle: "Create assessment frameworks with headings for EYFS and early years classes.",
    metrics: [],
    actionChips: ["Add Assessment", "Define Headings", "Link to Class", "Grading Scale"],
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
  income: {
    title: "Income",
    subtitle: "Track all school income from fees, donations, grants, and other sources.",
    metrics: [],
    actionChips: ["Add Income", "Categories", "Reports"],
  },
  expenses: {
    title: "Expenses",
    subtitle: "Record and categorize all operational and capital expenditures.",
    metrics: [],
    actionChips: ["Add Expense", "Categories", "Reports"],
  },
  debtors: {
    title: "Debtors",
    subtitle: "Monitor outstanding balances and unpaid bills by student.",
    metrics: [],
    actionChips: ["View Bills", "Payment History", "Reminders"],
  },
  ledger: {
    title: "General Ledger",
    subtitle: "Chronological record of all income and expense transactions.",
    metrics: [],
    actionChips: ["Journal Entries", "Reconciliation", "Reports"],
  },
  revenue: {
    title: "Revenue Report",
    subtitle: "Summary of income, expenses, and net revenue by category.",
    metrics: [],
    actionChips: ["Income Summary", "Expense Summary", "Net Position"],
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
  messages: {
    title: "Parent Messages",
    subtitle: "View and manage messages sent by parents to the school.",
    metrics: [],
    actionChips: ["View Messages", "Reply", "Filter by Status"],
  },
  complaints: {
    title: "Parent Complaints",
    subtitle: "Review, track, and resolve complaints submitted by parents.",
    metrics: [],
    actionChips: ["View Complaints", "Resolve", "Filter by Status"],
  },
  transport: {
    title: "Transport & Driver",
    subtitle: "Bus routes, drivers, pickup planning, and transport readiness.",
    metrics: [],
    actionChips: ["Driver List", "Routes", "Pickup Stops", "Fleet Setup"],
  },
  "school-calendar": {
    title: "School Calendar",
    subtitle: "Manage school events, holidays, and key dates visible to parents and staff.",
    metrics: [],
    actionChips: ["Add Event", "Holidays", "Term Dates", "Publish"],
  },
  surveys: {
    title: "Surveys",
    subtitle: "Create and manage feedback surveys for parents and staff.",
    metrics: [],
    actionChips: ["New Survey", "Publish", "View Responses", "Close"],
  },
  settings: {
    title: "System Settings",
    subtitle: "Branding, calendar, configuration engine, and portal visibility.",
    metrics: [],
    actionChips: ["Configuration Engine", "Branding", "Academic Calendar", "Visibility"],
  },
  users: {
    title: "User Management",
    subtitle: "Create, edit, activate, and manage all system users.",
    metrics: [],
    actionChips: ["New User", "Edit User", "Reset Password", "Activate/Deactivate"],
  },
  roles: {
    title: "Roles",
    subtitle: "View and manage system roles.",
    metrics: [],
    actionChips: ["View Roles"],
  },
  privileges: {
    title: "Privileges & Permissions",
    subtitle: "Assign granular feature access to users regardless of role.",
    metrics: [],
    actionChips: ["Seed Defaults", "Assign to User", "Revoke Access"],
  },
  profile: {
    title: "My Profile",
    subtitle: "Update your profile information and change your password.",
    metrics: [],
    actionChips: ["Edit Profile", "Change Password"],
  },
};

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(allowed as readonly string[]).includes(section)) notFound();

  const user = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"]);
  const profile = await getCurrentSchoolByUser(user.id);
  if (!profile?.schoolId || !profile.school) {
    return null;
  }

  const context = await getUserAcademicContext(profile.schoolId, user.id);

  // Only fetch heavy dashboard data for sections that actually use it
  const needsDashboardData = ["dashboard", "students", "teachers", "fees", "finance", "income", "expenses", "debtors", "ledger", "revenue", "invoices", "payments", "results", "lms", "attendance", "announcements"].includes(section);
  const needsPrivilegeData = ["dashboard", "users", "roles", "privileges"].includes(section);
  const needsFeeGroupCount = ["dashboard", "fees", "finance", "income", "expenses", "debtors", "ledger", "revenue", "invoices", "payments"].includes(section);
  const needsComplaintCounts = ["complaints", "dashboard"].includes(section);
  const needsMessageCounts = ["messages", "dashboard"].includes(section);
  const needsTransportCounts = ["transport", "dashboard"].includes(section);

  const [
    overview,
    rawCore,
    activeConfig,
    feeGroupCount,
    setup,
    userCount,
    roleCount,
    privilegeCount,
    rolePrivilegeCount,
    userPrivilegeCount,
    complaintCounts,
    messageCounts,
    transportCounts,
  ] = await Promise.all([
    getAdminOverview(profile.schoolId, { sessionId: context.session?.id, termId: context.term?.id }),
    needsDashboardData ? getDashboardData(profile.schoolId, { sessionId: context.session?.id, termId: context.term?.id }) : Promise.resolve(null),
    getActiveSchoolConfig(profile.schoolId),
    needsFeeGroupCount ? prisma.feeGroup.count({ where: { schoolId: profile.schoolId, isActive: true } }) : Promise.resolve(0),
    getSetupWizardState(profile.schoolId),
    needsPrivilegeData ? prisma.user.count() : Promise.resolve(0),
    needsPrivilegeData ? prisma.role.count() : Promise.resolve(0),
    needsPrivilegeData ? prisma.privilege.count() : Promise.resolve(0),
    needsPrivilegeData ? prisma.rolePrivilege.count() : Promise.resolve(0),
    needsPrivilegeData ? prisma.userPrivilege.count() : Promise.resolve(0),
    needsComplaintCounts ? Promise.all([
      prisma.parentComplaint.count({ where: { schoolId: profile.schoolId } }),
      prisma.parentComplaint.count({ where: { schoolId: profile.schoolId, status: "OPEN" } }),
      prisma.parentComplaint.count({ where: { schoolId: profile.schoolId, status: "RESOLVED" } }),
    ]) : Promise.resolve([0, 0, 0] as [number, number, number]),
    needsMessageCounts ? Promise.all([
      prisma.parentMessage.count({ where: { schoolId: profile.schoolId } }),
      prisma.parentMessage.count({ where: { schoolId: profile.schoolId, status: "SENT" } }),
    ]) : Promise.resolve([0, 0] as [number, number]),
    needsTransportCounts ? Promise.all([
      prisma.route.count({ where: { schoolId: profile.schoolId } }),
      prisma.driver.count({ where: { schoolId: profile.schoolId } }),
      prisma.vehicle.count({ where: { schoolId: profile.schoolId } }),
    ]) : Promise.resolve([0, 0, 0] as [number, number, number]),
  ]);

  // Cast to any for legacy metric property access (subjects, lessons, assignments, etc.)
  const core = (rawCore ?? {}) as any;

  const blueprint = blueprints[section as AllowedSection];
  const setupLocked = !setup.status.setupCompleted && ["fees", "finance", "income", "expenses", "debtors", "ledger", "revenue", "invoices", "results"].includes(section);
  const academic = activeConfig.config.academic as {
    sessions: Array<{ name: string; status?: string }>;
    terms: Array<{ name: string; status?: string }>;
    classes: Array<{ name: string; arms?: Array<{ name: string; subjects?: string[] }> }>;
    subjects: Array<{ name: string; className?: string; armName?: string }>;
    assessmentTypes: Array<{ name: string; weight: number }>;
    gradingSystem: Array<{ min: number; grade: string; gpa: number }>;
  };

  let categoryCount = 0;
  if (needsPrivilegeData) {
    const privilegeList = await prisma.privilege.findMany();
    categoryCount = new Set(privilegeList.map((p: { category: string }) => p.category)).size;
  }

  const metricsBySection: Record<AllowedSection, Array<{ label: string; value: string; helper?: string }>> = {
    dashboard: [
      { label: "Students", value: String(overview.students), helper: "Active school records" },
      { label: "Staff", value: String(overview.teachers), helper: "Teaching workforce" },
      { label: "Outstanding Fees", value: naira(overview.outstanding), helper: "Collections pending" },
      { label: "Loans Outstanding", value: naira(overview.totalLoanOutstanding ?? 0), helper: "Active loan balances" },
      { label: "Asset Value", value: naira(overview.totalAssetValue ?? 0), helper: "Current asset worth" },
      { label: "Attendance", value: String(overview.attendance), helper: "Logged attendance entries" },
    ],
    students: [
      { label: "Students", value: String(overview.students), helper: "Active learners" },
      { label: "Parents", value: String(overview.parents), helper: "Linked guardians" },
      { label: "Classes", value: String(overview.classes), helper: "Available placements" },
      { label: "Subjects", value: String(core.subjectCount ?? 0), helper: "Available subjects" },
    ],
    reception: [
      { label: "Students", value: String(overview.students), helper: "Student records on file" },
      { label: "Parents", value: String(overview.parents), helper: "Guardians on file" },
      { label: "Teachers", value: String(overview.teachers), helper: "Staff accounts" },
      { label: "Classes", value: String(overview.classes), helper: "Class groups" },
    ],
    parents: [
      { label: "Parents", value: String(overview.parents), helper: "Parent accounts" },
      { label: "Children", value: String(overview.students), helper: "Linked children" },
      { label: "Messages", value: String(overview.announcements), helper: "Announcements and alerts" },
      { label: "Bills", value: naira(overview.outstanding), helper: "Outstanding balances" },
    ],
    teachers: [
      { label: "Teachers", value: String(overview.teachers), helper: "Staff accounts" },
      { label: "Classes", value: String(overview.classes), helper: "Assigned class groups" },
      { label: "Subjects", value: String(core.subjectCount ?? 0), helper: "Assigned subjects" },
      { label: "Pending Tasks", value: String(core.assignments?.length ?? 0), helper: "Content and grading tasks" },
    ],
    academics: [
      { label: "Sessions", value: String(academic.sessions?.length ?? 0), helper: "Academic sessions" },
      { label: "Terms", value: String(academic.terms?.length ?? 0), helper: "Term definitions" },
      { label: "Classes", value: String(academic.classes?.length ?? 0), helper: "Class groups and arms" },
      { label: "Subjects", value: String(academic.subjects?.length ?? 0), helper: "Curriculum subjects" },
    ],
    classes: [
      { label: "Classes", value: String(academic.classes?.length ?? 0), helper: "Configured class groups" },
      { label: "Arms", value: String((academic.classes ?? []).reduce((sum, item) => sum + (item.arms?.length ?? 0), 0)), helper: "Streams per class" },
      { label: "Subjects", value: String(academic.subjects?.length ?? 0), helper: "Subject assignments" },
      { label: "Current Session", value: context.session?.name ?? "-", helper: context.term?.name ?? "Active term" },
    ],
    subjects: [
      { label: "Subjects", value: String(academic.subjects?.length ?? 0), helper: "Defined subject list" },
      { label: "Class Links", value: String((academic.subjects ?? []).filter((item) => item.className).length), helper: "Class-specific allocations" },
      { label: "Arm Links", value: String((academic.subjects ?? []).filter((item) => item.armName).length), helper: "Arm-specific allocations" },
      { label: "Teachers", value: String(overview.teachers), helper: "Subject teachers available" },
    ],
    assessments: [
      { label: "Assessments", value: String((core.assessments ?? []).length), helper: "Configured frameworks" },
      { label: "Headings", value: String((core.assessments ?? []).reduce((sum: number, a: any) => sum + (a.headings?.length ?? 0), 0)), helper: "Total assessment areas" },
      { label: "Class Links", value: String((core.classAssessments ?? []).length), helper: "Class-level attachments" },
      { label: "Group Links", value: String((core.classGroupAssessments ?? []).length), helper: "Group-level attachments" },
    ],
    fees: [
      { label: "Fee Groups", value: String(feeGroupCount), helper: "Active groups" },
      { label: "Bills", value: String(core.bills?.length ?? 0), helper: "Generated billing records" },
      { label: "Outstanding", value: naira(overview.outstanding), helper: "Unpaid balances" },
      { label: "Payments", value: String(core.payments?.length ?? 0), helper: "Recorded collections" },
    ],
    finance: [
      { label: "Bills", value: String(core.bills?.length ?? 0), helper: "Billing records" },
      { label: "Payments", value: String(core.payments?.length ?? 0), helper: "Payment entries" },
      { label: "Income", value: String(core.incomeCount ?? 0), helper: "Income records" },
      { label: "Expenses", value: String(core.expenseCount ?? 0), helper: "Expense records" },
    ],
    income: [
      { label: "Income Records", value: String(core.incomeCount ?? 0), helper: "Total income entries" },
      { label: "Categories", value: String(core.incomeCategories ?? 0), helper: "Income categories" },
      { label: "Payments", value: String(core.payments?.length ?? 0), helper: "Auto from payments" },
      { label: "Outstanding", value: naira(overview.outstanding), helper: "Still to collect" },
    ],
    expenses: [
      { label: "Expense Records", value: String(core.expenseCount ?? 0), helper: "Total expense entries" },
      { label: "Categories", value: String(core.expenseCategories ?? 0), helper: "Expense categories" },
      { label: "Bills", value: String(core.bills?.length ?? 0), helper: "Generated bills" },
      { label: "Outstanding", value: naira(overview.outstanding), helper: "Still to collect" },
    ],
    debtors: [
      { label: "Outstanding", value: naira(overview.outstanding), helper: "Unpaid balances" },
      { label: "Bills", value: String(core.bills?.length ?? 0), helper: "Total bills" },
      { label: "Paid", value: naira(overview.totalPaid), helper: "Collected so far" },
      { label: "Payments", value: String(core.payments?.length ?? 0), helper: "Payment entries" },
    ],
    ledger: [
      { label: "Income", value: String(core.incomeCount ?? 0), helper: "Income entries" },
      { label: "Expenses", value: String(core.expenseCount ?? 0), helper: "Expense entries" },
      { label: "Net Position", value: naira((overview.totalPaid ?? 0) - (core.totalExpenses ?? 0)), helper: "Revenue minus costs" },
      { label: "Transactions", value: String((core.incomeCount ?? 0) + (core.expenseCount ?? 0)), helper: "Total entries" },
    ],
    revenue: [
      { label: "Total Income", value: naira(overview.totalPaid ?? 0), helper: "All collections" },
      { label: "Total Expenses", value: naira(core.totalExpenses ?? 0), helper: "All spending" },
      { label: "Net Revenue", value: naira((overview.totalPaid ?? 0) - (core.totalExpenses ?? 0)), helper: "Profit / Loss" },
      { label: "Bills", value: String(core.bills?.length ?? 0), helper: "Billing records" },
    ],
    invoices: [
      { label: "Bills", value: String(core.bills?.length ?? 0), helper: "Generated bills" },
      { label: "Paid", value: naira(overview.totalPaid), helper: "Collected value" },
      { label: "Outstanding", value: naira(overview.outstanding), helper: "Open balances" },
      { label: "Receipts", value: String((core.bills ?? []).filter((item: any) => item.receipt).length), helper: "Issued proof of payment" },
    ],
    payments: [
      { label: "Payments", value: String(core.payments?.length ?? 0), helper: "Recorded collections" },
      { label: "Collected", value: naira(overview.totalPaid), helper: "Actual receipts" },
      { label: "Bills", value: String(core.bills?.length ?? 0), helper: "Billing queue" },
      { label: "Receipts", value: String((core.bills ?? []).filter((item: any) => item.receipt).length), helper: "Validated payments" },
    ],
    results: [
      { label: "Assessment Types", value: String(academic.assessmentTypes?.length ?? 0), helper: "Weightable scoring blocks" },
      { label: "Grading Bands", value: String(academic.gradingSystem?.length ?? 0), helper: "Configured thresholds" },
      { label: "Scores", value: String(core.scores?.length ?? 0), helper: "Captured marks" },
      { label: "Reports", value: core.result ? "Draft" : "Pending", helper: "Current publication state" },
    ],
    lms: [
      { label: "Lessons", value: String(core.lessons?.length ?? 0), helper: "Lesson notes" },
      { label: "Assignments", value: String(core.assignments?.length ?? 0), helper: "Classwork items" },
      { label: "Quizzes", value: String(core.quizzes?.length ?? 0), helper: "CBT activities" },
      { label: "Online Classes", value: String(core.onlineClasses?.length ?? 0), helper: "Live sessions" },
    ],
    attendance: [
      { label: "Attendance", value: String(overview.attendance), helper: "Logged entries" },
      { label: "Classes", value: String(overview.classes), helper: "Tracked groups" },
      { label: "Present", value: String((core.attendance ?? []).filter((item: any) => item.status === "PRESENT").length), helper: "Marked present" },
      { label: "Excused", value: String((core.attendance ?? []).filter((item: any) => item.status === "EXCUSED").length), helper: "Approved absences" },
    ],
    announcements: [
      { label: "Announcements", value: String(overview.announcements), helper: "Broadcast posts" },
      { label: "Parents", value: String(overview.parents), helper: "Targeted recipients" },
      { label: "Teachers", value: String(overview.teachers), helper: "Staff recipients" },
      { label: "Students", value: String(overview.students), helper: "Learner recipients" },
    ],
    messages: [
      { label: "Messages", value: String(messageCounts[0]), helper: "Parent messages" },
      { label: "Sent", value: String(messageCounts[1]), helper: "Messages received" },
      { label: "Parents", value: String(overview.parents), helper: "Active parent accounts" },
      { label: "Announcements", value: String(overview.announcements), helper: "Broadcast posts" },
    ],
    complaints: [
      { label: "Complaints", value: String(complaintCounts[0]), helper: "Parent complaints" },
      { label: "Open", value: String(complaintCounts[1]), helper: "Awaiting resolution" },
      { label: "Parents", value: String(overview.parents), helper: "Active parent accounts" },
      { label: "Resolved", value: String(complaintCounts[2]), helper: "Closed complaints" },
    ],
    transport: [
      { label: "Routes", value: String(transportCounts[0]), helper: "Bus routes" },
      { label: "Drivers", value: String(transportCounts[1]), helper: "Assigned drivers" },
      { label: "Vehicles", value: String(transportCounts[2]), helper: "School vehicles" },
      { label: "Students", value: String(overview.students), helper: "Transport eligible" },
    ],
    "school-calendar": [
      { label: "Sessions", value: String(academic.sessions.length), helper: "Academic sessions" },
      { label: "Terms", value: String(academic.terms.length), helper: "Active terms" },
      { label: "Events", value: "-", helper: "School events" },
      { label: "Holidays", value: "-", helper: "Scheduled holidays" },
    ],
    surveys: [
      { label: "Surveys", value: "-", helper: "Total surveys" },
      { label: "Published", value: "-", helper: "Active surveys" },
      { label: "Responses", value: "-", helper: "Total responses" },
      { label: "Draft", value: "-", helper: "Unpublished" },
    ],
    settings: [
      { label: "Config Versions", value: String(activeConfig.version), helper: activeConfig.source },
      { label: "Branding", value: profile.school.branding ? "Configured" : "None", helper: "Logo and colors" },
      { label: "Setup", value: setup.status.setupCompleted ? "Complete" : "Incomplete", helper: "Setup wizard" },
      { label: "Calendar", value: String(academic.sessions.length), helper: "Sessions configured" },
    ],
    users: [
      { label: "Users", value: String(userCount), helper: "Total system users" },
      { label: "Active", value: String(overview.students), helper: "Active learners" },
      { label: "Staff", value: String(overview.teachers), helper: "Teaching workforce" },
      { label: "Parents", value: String(overview.parents), helper: "Linked guardians" },
    ],
    roles: [
      { label: "Roles", value: String(roleCount), helper: "System roles" },
      { label: "Privileges", value: String(privilegeCount), helper: "Available permissions" },
      { label: "Assignments", value: String(rolePrivilegeCount), helper: "Role-privilege links" },
      { label: "Overrides", value: String(userPrivilegeCount), helper: "User-specific grants" },
    ],
    privileges: [
      { label: "Privileges", value: String(privilegeCount), helper: "Total in system" },
      { label: "Categories", value: String(categoryCount), helper: "Feature groups" },
      { label: "Role Links", value: String(rolePrivilegeCount), helper: "Default assignments" },
      { label: "User Overrides", value: String(userPrivilegeCount), helper: "Custom grants/denials" },
    ],
    profile: [],
  };

  const metrics = metricsBySection[section as AllowedSection];
  const moduleScope = adminModuleScopeBySection[section] ?? {
    module: "Admin",
    submodules: [{ name: "General", screens: ["Overview"] }],
  };

  return (
    <div className="space-y-4 sm:space-y-6">
        {!setup.status.setupCompleted ? (
          <Card className="border-amber-200 bg-amber-50" data-testid="setup-incomplete-banner">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base text-amber-900">
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
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
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
          <AdminApprovalActions mode="payments" sessionId={context.session?.id == null ? undefined : String(context.session.id)} termId={context.term?.id == null ? undefined : String(context.term.id)} />
        ) : null}

        {section === "results" && !setupLocked ? (
          <AdminApprovalActions mode="results" sessionId={context.session?.id == null ? undefined : String(context.session.id)} termId={context.term?.id == null ? undefined : String(context.term.id)} />
        ) : null}

        {section === "invoices" && !setupLocked ? <BillContestReviewPanel currentRole={user.role} /> : null}

        {(section === "fees") && !setupLocked ? <FeeProfileManager /> : null}

        {section === "finance" && !setupLocked ? <FinanceManager /> : null}

        {section === "income" && !setupLocked ? <FinanceManager defaultTab="income" /> : null}

        {section === "expenses" && !setupLocked ? <FinanceManager defaultTab="expense" /> : null}

        {section === "debtors" && !setupLocked ? <FinanceManager defaultTab="debtors" /> : null}

        {section === "ledger" && !setupLocked ? <FinanceManager defaultTab="ledger" /> : null}

        {section === "revenue" && !setupLocked ? <FinanceManager defaultTab="revenue" /> : null}

        {section === "students" ? (
          <div className="space-y-4">
            <ImportWizard section="students" />
            <StudentManager sessionId={context.session?.id == null ? null : String(context.session.id)} termId={context.term?.id == null ? null : String(context.term.id)} />
          </div>
        ) : null}

        {section === "parents" ? (
          <div className="space-y-4">
            <ImportWizard section="parents" />
            <ParentManager />
          </div>
        ) : null}

        {section === "teachers" ? (
          <div className="space-y-4">
            <ImportWizard section="staff" />
            <TeacherManager />
          </div>
        ) : null}

        {section === "academics" ? (
          <div className="space-y-6">
            <EventManager />
          </div>
        ) : null}

        {section === "school-calendar" ? (
          <div className="space-y-6">
            <EventManager />
          </div>
        ) : null}

        {section === "surveys" ? <SurveyManager /> : null}

        {section === "classes" ? <ClassManager /> : null}

        {section === "subjects" ? <SubjectManager /> : null}

        {section === "assessments" ? <AssessmentManager /> : null}

        {section === "attendance" ? <AttendanceManager /> : null}

        {section === "lms" ? <LMSManager /> : null}

        {section === "announcements" ? <AnnouncementManager /> : null}

        {section === "messages" ? <MessageManager /> : null}

        {section === "complaints" ? <ComplaintManager /> : null}

        {section === "transport" ? <TransportManager /> : null}

        {section === "reception" ? <ReceptionManager /> : null}

        {section === "bills" ? <BillManager /> : null}

        {section === "users" ? (
          <div className="space-y-6">
            <PasswordResetRequests />
            <UserManager />
          </div>
        ) : null}

        {section === "roles" ? <RoleManager /> : null}

        {section === "privileges" ? <PrivilegeManager /> : null}

        {section === "profile" ? <ProfileManager /> : null}

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


        {/* Module Scope - Hidden for all sections with functional managers */}
        {!["dashboard", "students", "reception", "classes", "parents", "teachers", "academics", "subjects", "assessments", "attendance", "lms", "announcements", "messages", "complaints", "transport", "fees", "finance", "income", "expenses", "debtors", "ledger", "revenue", "invoices", "payments", "bills", "results", "settings", "users", "roles", "privileges", "profile"].includes(section) && (
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
  );
}
