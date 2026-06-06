import { statusLabel } from "@/lib/data";
import { formatDate, naira } from "@/lib/utils";
import type { FeedItem, QuickActionItem, SeriesItem, StatCardItem } from "@/components/dashboard-widgets";

type CoreData = Awaited<ReturnType<typeof import("@/lib/data").getCoreSchoolDataByContext>>;

export type RoleScope = "superadmin" | "admin" | "teacher" | "accountant" | "parent" | "student" | "registrar";

export type RoleDashboardModel = {
  title: string;
  subtitle: string;
  modules: string[];
  stats: StatCardItem[];
  quickActions: QuickActionItem[];
  series: { title: string; subtitle: string; data: SeriesItem[] };
  activities: FeedItem[];
  tasks: FeedItem[];
  announcements: FeedItem[];
  tableTitle: string;
  tableRows: Array<{ id: string; primary: string; secondary?: string; status?: string; amount?: string; date?: string }>;
};

function mapAnnouncements(items: CoreData["announcements"]): FeedItem[] {
  return items.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    detail: item.body.slice(0, 90),
    time: formatDate(item.createdAt),
  }));
}

export function buildSuperAdminModel(params: {
  schools: Array<{ id: string; name: string; isActive: boolean; users: Array<unknown>; students: Array<unknown>; createdAt: Date }>;
  totalRevenue: number;
  totalTeachers: number;
  totalStudents: number;
}) {
  const activeSchools = params.schools.filter((item) => item.isActive).length;
  const expired = Math.max(0, params.schools.length - activeSchools);

  return {
    title: "Platform Command Center",
    subtitle: "Unified visibility across schools, subscriptions, and revenue.",
    modules: ["Schools", "Subscription Plans", "Billing", "Platform Users", "Support Tickets", "Platform Reports", "Announcements", "Global Settings"],
    stats: [
      { label: "Total Schools", value: String(params.schools.length), hint: "Institutions onboarded" },
      { label: "Active Subscriptions", value: String(activeSchools), hint: "Currently billing" },
      { label: "Expired Subscriptions", value: String(expired), hint: "Need renewal" },
      { label: "Platform Revenue", value: naira(params.totalRevenue), hint: "Collected across platform" },
      { label: "Total Students", value: String(params.totalStudents), hint: "Across all schools" },
      { label: "Total Teachers", value: String(params.totalTeachers), hint: "Across all schools" },
      { label: "Pending Renewals", value: String(expired), hint: "Action required" },
      { label: "Avg Students/School", value: String(params.schools.length ? Math.round(params.totalStudents / params.schools.length) : 0), hint: "Enrollment density" },
    ],
    quickActions: [
      { label: "Add New School", href: "/super-admin/dashboard" },
      { label: "Create Plan", href: "/super-admin/dashboard" },
      { label: "Open Billing", href: "/super-admin/dashboard" },
      { label: "Publish Announcement", href: "/super-admin/dashboard" },
    ],
    series: {
      title: "School Growth Graph",
      subtitle: "Recent school signups",
      data: params.schools.slice(0, 6).map((item, index) => ({ label: `S${index + 1}`, value: item.students.length || 1 })),
    },
    activities: params.schools.slice(0, 6).map((school) => ({
      id: school.id,
      title: school.name,
      detail: `${school.users.length} users, ${school.students.length} students`,
      time: formatDate(school.createdAt),
    })),
    tasks: [
      { id: "renewals", title: "Schools needing activation", detail: `${expired} schools inactive`, time: "Now" },
      { id: "growth", title: "Onboarding opportunities", detail: `${params.schools.length} schools currently tracked`, time: "Today" },
    ],
    announcements: params.schools.slice(0, 2).map((school) => ({
      id: `school-${school.id}`,
      title: school.name,
      detail: `${school.students.length} students • ${school.users.length} users`,
      time: formatDate(school.createdAt),
    })),
    tableTitle: "Recent Platform Signups",
    tableRows: params.schools.map((school) => ({
      id: school.id,
      primary: school.name,
      secondary: `${school.users.length} users`,
      status: school.isActive ? "ACTIVE" : "INACTIVE",
      amount: `${school.students.length} students`,
      date: formatDate(school.createdAt),
    })),
  } satisfies RoleDashboardModel;
}

export function buildSchoolRoleModel(roleScope: Exclude<RoleScope, "superadmin">, core: CoreData): RoleDashboardModel {
  // Safety checks for undefined arrays
  const invoices = (core as any).bills || [];
  const payments = core.payments || [];
  const sessions = core.sessions || [];
  const terms = core.terms || [];
  const students = core.students || [];
  const teachers = core.teachers || [];
  const parents = core.parents || [];
  const classes = core.classes || [];
  const subjects = core.subjects || [];
  const scores = core.scores || [];
  const attendance = core.attendance || [];
  const assignments = core.assignments || [];
  const announcements = core.announcements || [];
  
  const totalInvoiceAmount = invoices.reduce((sum: number, invoice: any) => sum + (invoice.totalAmount || 0), 0);
  const totalPaidAmount = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
  const collectionRate = totalInvoiceAmount ? (totalPaidAmount / totalInvoiceAmount) * 100 : 0;

  const models: Record<Exclude<RoleScope, "superadmin">, RoleDashboardModel> = {
    admin: {
      title: "School Operations Center",
      subtitle: "Enrollment, academics, and finance operations in one command view.",
      modules: ["Students", "Teachers", "Parents", "Classes", "Subjects", "Attendance", "Fees", "Invoices", "Payments", "Results", "Report Cards", "Timetable", "Academic Calendar", "Messages", "Announcements", "Settings"],
      stats: [
        { label: "Active Session", value: sessions.find((item: any) => item.isCurrent)?.name ?? "N/A", hint: "Academic session" },
        { label: "Active Term", value: terms.find((item: any) => item.isCurrent)?.name ?? "N/A", hint: "Academic term" },
        { label: "Total Students", value: String(students.length), hint: "Enrolled learners" },
        { label: "Total Teachers", value: String(teachers.length), hint: "Instruction workforce" },
        { label: "Total Parents", value: String(parents.length), hint: "Linked guardians" },
        { label: "Total Classes", value: String(classes.length), hint: "Active class groups" },
        { label: "Fee Collection", value: `${collectionRate.toFixed(1)}%`, hint: "Invoice recovery" },
        { label: "Unpaid Invoices", value: String(invoices.filter((item: any) => (item.balance || 0) > 0).length), hint: "Outstanding balances" },
      ],
      quickActions: [
        { label: "Add Student", href: "/admin/students" },
        { label: "Add Teacher", href: "/admin/teachers" },
        { label: "Create Invoice", href: "/admin/invoices" },
        { label: "Publish Result", href: "/admin/results" },
        { label: "Send Announcement", href: "/admin/announcements" },
      ],
      series: {
        title: "Fee Collection Graph",
        subtitle: "Invoices vs payments",
        data: [
          { label: "Invoiced", value: Math.round(totalInvoiceAmount || 0) },
          { label: "Collected", value: Math.round(totalPaidAmount || 0) },
          { label: "Unpaid", value: Math.round((totalInvoiceAmount - totalPaidAmount) || 0) },
        ],
      },
      activities: students.slice(0, 6).map((student) => ({ id: student.id, title: student.user.name, detail: "New registration", time: formatDate(student.createdAt) })),
      tasks: [
        { id: "res", title: "Pending results", detail: `${Math.max(0, students.length - scores.length)} students pending score rows`, time: "Today" },
        { id: "fees", title: "Follow up unpaid invoices", detail: `${invoices.filter((item: any) => (item.balance || 0) > 0).length} invoices open`, time: "This week" },
      ],
      announcements: mapAnnouncements(announcements),
      tableTitle: "Recent Payments",
      tableRows: payments.slice(0, 20).map((payment) => ({ id: payment.id, primary: payment.student?.user.name ?? payment.invoice.invoiceNumber, secondary: payment.invoice.invoiceNumber, status: payment.status, amount: naira(payment.amount), date: formatDate(payment.confirmedAt ?? payment.createdAt) })),
    },
    teacher: {
      title: "Teacher Productivity Workspace",
      subtitle: "Track classes, grading workload, and lesson execution.",
      modules: ["My Classes", "My Subjects", "Attendance", "Score Entry", "Assignments", "Lesson Notes", "Timetable", "Student Reports", "Announcements"],
      stats: [
        { label: "Assigned Classes", value: String(classes.length), hint: "Class responsibilities" },
        { label: "Assigned Subjects", value: String(subjects.length), hint: "Teaching load" },
        { label: "Pending Scores", value: String(Math.max(0, students.length - scores.length)), hint: "Entries remaining" },
        { label: "Attendance Logs", value: String(attendance.length), hint: "Recorded marks" },
      ],
      quickActions: [
        { label: "Mark Attendance", href: "/teacher/attendance" },
        { label: "Enter Scores", href: "/teacher/scores" },
        { label: "Upload Assignment", href: "/teacher/lms" },
        { label: "Add Lesson Note", href: "/teacher/lms" },
      ],
      series: {
        title: "Class Performance Graph",
        subtitle: "Average performance by subject",
        data: subjects.slice(0, 6).map((subject) => ({
          label: subject.name,
          value: Math.round(scores.filter((score) => score.subjectId === subject.id).reduce((sum, score) => sum + score.total, 0) / Math.max(1, scores.filter((score) => score.subjectId === subject.id).length)),
        })),
      },
      activities: core.lessons?.slice(0, 6).map((lesson) => ({ id: lesson.id, title: lesson.title, detail: lesson.subject?.name ?? "Subject", time: formatDate(lesson.createdAt) })) ?? [],
      tasks: [
        { id: "grade", title: "Grade pending scripts", detail: `${Math.max(0, students.length - scores.length)} pending score records`, time: "Today" },
        { id: "lesson", title: "Prepare upcoming lesson", detail: "Tomorrow's class plan due", time: "Tomorrow" },
      ],
      announcements: mapAnnouncements(announcements),
      tableTitle: "Upcoming Lessons",
      tableRows: core.lessons?.slice(0, 20).map((lesson) => ({ id: lesson.id, primary: lesson.title, secondary: lesson.subject?.name ?? "Subject", status: "SCHEDULED", date: formatDate(lesson.createdAt) })) ?? [],
    },
    parent: {
      title: "Parent Monitoring Dashboard",
      subtitle: "Track child performance, fee balances, and school communication.",
      modules: ["My Children", "Fees & Invoices", "Payments", "Attendance", "Results", "Report Cards", "School Calendar", "Messages", "Announcements"],
      stats: [
        { label: "Children", value: String(students.length), hint: "Linked to parent profile" },
        { label: "Attendance Logs", value: String(attendance.length), hint: "Visible records" },
        { label: "Fee Balance", value: naira(invoices.reduce((sum: number, item: any) => sum + (item.balance || 0), 0)), hint: "Outstanding due" },
        { label: "Latest Results", value: String(scores.length), hint: "Published score rows" },
      ],
      quickActions: [
        { label: "Pay Fees", href: "/parent/fees" },
        { label: "Download Receipt", href: "/parent/fees" },
        { label: "View Report Card", href: "/parent/results" },
        { label: "Message School", href: "/parent/children" },
      ],
      series: {
        title: "Attendance Trend",
        subtitle: "Recent attendance statuses",
        data: [
          { label: "Present", value: attendance.filter((item: any) => item.status === "PRESENT").length },
          { label: "Absent", value: attendance.filter((item: any) => item.status === "ABSENT").length },
          { label: "Late", value: attendance.filter((item: any) => item.status === "LATE").length },
        ],
      },
      activities: payments.slice(0, 6).map((item) => ({ id: item.id, title: `Payment ${item.invoice.invoiceNumber}`, detail: statusLabel(item.status), time: formatDate(item.confirmedAt ?? item.createdAt) })),
      tasks: [
        { id: "fee", title: "Pending fee payments", detail: `${invoices.filter((item: any) => (item.balance || 0) > 0).length} invoices require payment`, time: "Now" },
        { id: "result", title: "Review latest results", detail: "Academic records published", time: "This week" },
      ],
      announcements: mapAnnouncements(announcements),
      tableTitle: "Payment History",
      tableRows: payments.slice(0, 20).map((payment) => ({ id: payment.id, primary: payment.invoice.invoiceNumber, secondary: payment.student?.user.name ?? "Student", status: payment.status, amount: naira(payment.amount), date: formatDate(payment.confirmedAt ?? payment.createdAt) })),
    },
    student: {
      title: "Student Academic Dashboard",
      subtitle: "Assignments, attendance, and performance in one simple workspace.",
      modules: ["My Profile", "Subjects", "Timetable", "Assignments", "Attendance", "Results", "Report Card", "Announcements"],
      stats: [
        { label: "Current Class", value: students[0]?.class?.name ?? "N/A", hint: "Assigned class" },
        { label: "Subjects", value: String(subjects.length), hint: "Current term load" },
        { label: "Assignments", value: String(assignments.length), hint: "Total assignments" },
        { label: "Attendance", value: String(attendance.length), hint: "Attendance records" },
      ],
      quickActions: [
        { label: "View Result", href: "/student/results" },
        { label: "Download Report", href: "/student/results" },
        { label: "Submit Assignment", href: "/student/lms" },
      ],
      series: {
        title: "Subject Performance",
        subtitle: "Average score by subject",
        data: subjects.slice(0, 6).map((subject) => ({
          label: subject.name,
          value: Math.round(scores.filter((score) => score.subjectId === subject.id).reduce((sum, score) => sum + score.total, 0) / Math.max(1, scores.filter((score) => score.subjectId === subject.id).length)),
        })),
      },
      activities: assignments.slice(0, 6).map((item) => ({ id: item.id, title: item.title, detail: item.subject?.name ?? "Subject", time: formatDate(item.dueDate) })),
      tasks: [
        { id: "submit", title: "Submit pending assignments", detail: `${assignments.filter((item) => !item.submittedAt).length} due soon`, time: "Soon" },
        { id: "review", title: "Review latest results", detail: "Check term progress report", time: "Today" },
      ],
      announcements: mapAnnouncements(announcements),
      tableTitle: "Assignment Tracker",
      tableRows: assignments.slice(0, 20).map((item) => ({ id: item.id, primary: item.title, secondary: item.subject?.name ?? "Subject", status: item.submittedAt ? "SUBMITTED" : "PENDING", date: formatDate(item.dueDate) })),
    },
    accountant: {
      title: "Finance Management Dashboard",
      subtitle: "Collections, debtors, and payment performance across terms.",
      modules: ["Fee Setup", "Invoices", "Payments", "Receipts", "Debtors", "Discounts", "Finance Reports"],
      stats: [
        { label: "Expected Revenue", value: naira(totalInvoiceAmount), hint: "Invoice total" },
        { label: "Collected Revenue", value: naira(totalPaidAmount), hint: "Payments confirmed" },
        { label: "Outstanding", value: naira(invoices.reduce((sum: number, item: any) => sum + (item.balance || 0), 0)), hint: "Unpaid balances" },
        { label: "Overdue Invoices", value: String(invoices.filter((item: any) => (item.balance || 0) > 0).length), hint: "Debtors list" },
      ],
      quickActions: [
        { label: "Generate Invoice", href: "/accountant/invoices" },
        { label: "Record Payment", href: "/accountant/payments" },
        { label: "Print Receipt", href: "/accountant/payments" },
        { label: "Export Finance Report", href: "/accountant/debtors" },
      ],
      series: {
        title: "Revenue Graph",
        subtitle: "Collection analytics",
        data: [
          { label: "Expected", value: Math.round(totalInvoiceAmount) },
          { label: "Collected", value: Math.round(totalPaidAmount) },
          { label: "Outstanding", value: Math.round(invoices.reduce((sum: number, item: any) => sum + (item.balance || 0), 0)) },
        ],
      },
      activities: payments.slice(0, 6).map((item) => ({ id: item.id, title: item.invoice.invoiceNumber, detail: `Payment via ${item.method}`, time: formatDate(item.confirmedAt ?? item.createdAt) })),
      tasks: [
        { id: "debts", title: "Follow overdue debtors", detail: `${invoices.filter((item: any) => (item.balance || 0) > 0).length} active balances`, time: "Today" },
        { id: "recon", title: "Reconcile payment channels", detail: "Audit transfer/card entries", time: "This week" },
      ],
      announcements: mapAnnouncements(announcements),
      tableTitle: "Finance Transactions",
      tableRows: payments.slice(0, 20).map((payment) => ({ id: payment.id, primary: payment.invoice.invoiceNumber, secondary: payment.method, status: payment.status, amount: naira(payment.amount), date: formatDate(payment.confirmedAt ?? payment.createdAt) })),
    },
    registrar: {
      title: "Registrar & Admissions Desk",
      subtitle: "Admissions throughput and enrollment completion performance.",
      modules: ["Applications", "Admissions", "Student Records", "Class Placement", "Parent Records", "Documents", "ID Cards"],
      stats: [
        { label: "New Applications", value: String(students.length), hint: "Incoming records" },
        { label: "Pending Approvals", value: String(Math.max(0, students.length - classes.length)), hint: "Awaiting admission" },
        { label: "Admitted Students", value: String(students.length), hint: "Total enrolled" },
        { label: "Incomplete Registrations", value: String(students.filter((student: any) => !student.classId).length), hint: "Need class placement" },
      ],
      quickActions: [
        { label: "Admit Student", href: "/admin/students" },
        { label: "Assign Class", href: "/admin/classes" },
        { label: "Generate Student ID", href: "/admin/students" },
      ],
      series: {
        title: "Admissions Trend",
        subtitle: "Registration completion",
        data: [
          { label: "Applications", value: students.length },
          { label: "Placed", value: students.filter((student: any) => student.classId).length },
          { label: "Incomplete", value: students.filter((student: any) => !student.classId).length },
        ],
      },
      activities: students.slice(0, 6).map((student) => ({ id: student.id, title: student.user.name, detail: student.class?.name ?? "Awaiting class", time: formatDate(student.createdAt) })),
      tasks: [
        { id: "place", title: "Complete class placements", detail: `${students.filter((student: any) => !student.classId).length} students pending`, time: "Urgent" },
        { id: "docs", title: "Verify submitted documents", detail: "Review admission uploads", time: "Today" },
      ],
      announcements: mapAnnouncements(announcements),
      tableTitle: "Recent Admissions",
      tableRows: students.slice(0, 20).map((student) => ({ id: student.id, primary: student.user.name, secondary: student.class?.name ?? "No class yet", status: student.classId ? "ADMITTED" : "PENDING", date: formatDate(student.createdAt) })),
    },
  };

  return models[roleScope];
}
