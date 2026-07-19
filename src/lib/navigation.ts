import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Database,
  DollarSign,
  FileBarChart,
  FileCheck,
  FileCode,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Mail,
  Map,
  Megaphone,
  MessageSquareWarning,
  Palette,
  PhoneCall,
  Receipt,
  School,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Trash2,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  children?: NavItem[];
  isSubmenu?: boolean;
  privilege?: string;
};

/**
 * Filter a nav item list by the user's privileges.
 * Items without a `privilege` field are always visible.
 * Parent items with children are shown if any child passes the filter.
 */
export function filterNavByPrivileges(
  items: NavItem[],
  privileges: Record<string, boolean> | Set<string> | null | undefined,
): NavItem[] {
  if (!privileges) return items;
  const has = (code?: string) => {
    if (!code) return true;
    if (privileges instanceof Set) return privileges.has(code);
    return privileges[code] === true;
  };

  return items
    .map((item) => {
      if (item.children?.length) {
        const visibleChildren = item.children.filter((child) => has(child.privilege));
        if (visibleChildren.length === 0) return null;
        return { ...item, children: visibleChildren };
      }
      return has(item.privilege) ? item : null;
    })
    .filter((item): item is NavItem => item !== null);
}

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, group: "1. Admin" },
  {
    label: "Reception",
    href: "/admin/reception",
    icon: Users,
    group: "1. Admin",
    privilege: "reception.view",
    children: [
      { label: "Reception Dashboard", href: "/admin/reception/dashboard", icon: LayoutDashboard, isSubmenu: true, privilege: "reception.view" },
      { label: "Enquiries", href: "/admin/reception/enquiry", icon: HelpCircle, isSubmenu: true, privilege: "reception.view" },
      { label: "Visitors", href: "/admin/reception", icon: Users, isSubmenu: true, privilege: "reception.view" },
      { label: "Call Log", href: "/admin/reception/call-log", icon: PhoneCall, isSubmenu: true, privilege: "reception.view" },
      { label: "Complaints", href: "/admin/reception/complaint", icon: MessageSquareWarning, isSubmenu: true, privilege: "reception.view" },
      { label: "Surveys", href: "/admin/surveys", icon: ClipboardList, isSubmenu: true, privilege: "announcements.view" },
      { label: "Correspondence", href: "/admin/reception/correspondence", icon: Mail, isSubmenu: true, privilege: "reception.view" },
      { label: "Gate Pass", href: "/admin/reception/gate-pass", icon: FileText, isSubmenu: true, privilege: "reception.view" },
      { label: "Queries", href: "/admin/reception/query", icon: HelpCircle, isSubmenu: true, privilege: "reception.view" },
    ],
  },
  {
    label: "Students",
    href: "/admin/students",
    icon: GraduationCap,
    group: "1. Admin",
    privilege: "students.view",
    children: [
      { label: "All Students", href: "/admin/students", icon: Users, isSubmenu: true, privilege: "students.view" },
      { label: "Admissions", href: "/admin/students/admissions", icon: GraduationCap, isSubmenu: true, privilege: "admissions.view" },
      { label: "Transfers", href: "/admin/students/transfers", icon: GraduationCap, isSubmenu: true, privilege: "students.manage" },
      { label: "Student Settings", href: "/admin/settings/students", icon: Settings, isSubmenu: true, privilege: "settings.view" },
    ],
  },
  {
    label: "Parents",
    href: "/admin/parents",
    icon: Users,
    group: "1. Admin",
    privilege: "parents.view",
    children: [
      { label: "Parent Records", href: "/admin/parents", icon: Users, isSubmenu: true, privilege: "parents.view" },
      { label: "Messages", href: "/admin/messages", icon: Mail, isSubmenu: true, privilege: "announcements.view" },
      { label: "Complaints", href: "/admin/complaints", icon: MessageSquareWarning, isSubmenu: true, privilege: "announcements.view" },
      { label: "Payment Follow-up", href: "/admin/debtors", icon: FileBarChart, isSubmenu: true, privilege: "debtors.view" },
    ],
  },
  {
    label: "Teachers",
    href: "/admin/teachers",
    icon: GraduationCap,
    group: "1. Admin",
    privilege: "teachers.view",
    children: [
      { label: "Staff Directory", href: "/admin/teachers", icon: Users, isSubmenu: true, privilege: "teachers.view" },
      { label: "Lesson Plans", href: "/admin/lms", icon: BookOpen, isSubmenu: true, privilege: "lms.view" },
      { label: "Subject Assignments", href: "/admin/subjects", icon: BookOpen, isSubmenu: true, privilege: "subjects.view" },
      { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck, isSubmenu: true, privilege: "attendance.view" },
      { label: "Staff Clock-In", href: "/admin/staff-attendance", icon: CalendarCheck, isSubmenu: true, privilege: "attendance.view" },
    ],
  },
  { label: "Driver & Transport", href: "/admin/transport", icon: Building2, group: "1. Admin", privilege: "transport.view" },
  {
    label: "Finance",
    href: "/admin/finance",
    icon: DollarSign,
    group: "2. Finance",
    privilege: "fees.view",
    children: [
      { label: "Finance Overview", href: "/admin/finance", icon: DollarSign, isSubmenu: true, privilege: "fees.view" },
      { label: "Fee Group & Structure", href: "/admin/fees", icon: CreditCard, isSubmenu: true, privilege: "fees.view" },
      { label: "Bills", href: "/admin/invoices", icon: Receipt, isSubmenu: true, privilege: "bills.view" },
      { label: "Payments", href: "/admin/payments", icon: CreditCard, isSubmenu: true, privilege: "payments.view" },
      { label: "Income", href: "/admin/income", icon: TrendingUp, isSubmenu: true, privilege: "income.view" },
      { label: "Expenses", href: "/admin/expenses", icon: TrendingDown, isSubmenu: true, privilege: "expenses.view" },
      { label: "Debtors", href: "/admin/debtors", icon: FileBarChart, isSubmenu: true, privilege: "debtors.view" },
      { label: "Ledger", href: "/admin/ledger", icon: FileBarChart, isSubmenu: true, privilege: "ledger.view" },
      { label: "Revenue", href: "/admin/revenue", icon: TrendingUp, isSubmenu: true, privilege: "revenue.view" },
    ],
  },
  {
    label: "Academics",
    href: "/admin/academics",
    icon: BookOpen,
    group: "3. Academics",
    privilege: "classes.view",
    children: [
      { label: "Academic Overview", href: "/admin/academics", icon: BookOpen, isSubmenu: true, privilege: "classes.view" },
      { label: "Classes & Arms", href: "/admin/classes", icon: Building2, isSubmenu: true, privilege: "classes.view" },
      { label: "Class Mapping", href: "/admin/classes/mapping", icon: Map, isSubmenu: true, privilege: "classes.view" },
      { label: "Subjects", href: "/admin/subjects", icon: BookOpen, isSubmenu: true, privilege: "subjects.view" },
      { label: "Assessments", href: "/admin/assessments", icon: ClipboardList, isSubmenu: true, privilege: "assessments.view" },
      { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck, isSubmenu: true, privilege: "attendance.view" },
      { label: "Results", href: "/admin/results", icon: FileBarChart, isSubmenu: true, privilege: "results.view" },
      { label: "LMS", href: "/admin/lms", icon: BookOpen, isSubmenu: true, privilege: "lms.view" },
      { label: "School Calendar", href: "/admin/school-calendar", icon: CalendarDays, isSubmenu: true, privilege: "sessions.view" },
    ],
  },
  {
    label: "Communication",
    href: "/admin/announcements",
    icon: Megaphone,
    group: "4. Communication",
    privilege: "announcements.view",
    children: [
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone, isSubmenu: true, privilege: "announcements.view" },
      { label: "Messages", href: "/admin/messages", icon: Mail, isSubmenu: true, privilege: "announcements.view" },
      { label: "Complaints", href: "/admin/reception/complaint", icon: MessageSquareWarning, isSubmenu: true, privilege: "announcements.view" },
      { label: "Surveys", href: "/admin/surveys", icon: ClipboardList, isSubmenu: true, privilege: "announcements.view" },
    ],
  },
  {
    label: "Access Control",
    href: "/admin/users",
    icon: Shield,
    group: "5. Access",
    privilege: "users.view",
    children: [
      { label: "Users", href: "/admin/users", icon: UserCog, isSubmenu: true, privilege: "users.view" },
      { label: "Roles", href: "/admin/roles", icon: Shield, isSubmenu: true, privilege: "roles.view" },
      { label: "Privileges", href: "/admin/privileges", icon: ShieldCheck, isSubmenu: true, privilege: "privileges.view" },
    ],
  },
  {
    label: "System",
    href: "/admin/settings",
    icon: Settings,
    group: "6. System",
    privilege: "settings.view",
    children: [
      { label: "Setup Wizard", href: "/admin/setup", icon: Settings, isSubmenu: true, privilege: "settings.manage" },
      { label: "General Settings", href: "/admin/settings", icon: Settings, isSubmenu: true, privilege: "settings.view" },
      { label: "School Profile", href: "/admin/settings/school", icon: School, isSubmenu: true, privilege: "settings.view" },
      { label: "Configuration Engine", href: "/admin/settings/config-engine", icon: SlidersHorizontal, isSubmenu: true, privilege: "settings.manage" },
      { label: "Academic Calendar", href: "/admin/settings/academic-calendar", icon: CalendarDays, isSubmenu: true, privilege: "sessions.manage" },
      { label: "Grading Setup", href: "/admin/settings/grading", icon: GraduationCap, isSubmenu: true, privilege: "settings.view" },
      { label: "Master Data", href: "/admin/settings/master-data", icon: Database, isSubmenu: true, privilege: "settings.manage" },
      { label: "Payment Methods", href: "/admin/settings/payment-methods", icon: Wallet, isSubmenu: true, privilege: "settings.view" },
      { label: "Reception Settings", href: "/admin/settings/reception", icon: PhoneCall, isSubmenu: true, privilege: "settings.view" },
      { label: "Report Templates", href: "/admin/settings/templates", icon: FileCode, isSubmenu: true, privilege: "templates.view" },
      { label: "Bulk Import", href: "/admin/settings#bulk-import", icon: FileCheck, isSubmenu: true, privilege: "settings.manage" },
      { label: "Branding", href: "/admin/settings/branding", icon: Palette, isSubmenu: true, privilege: "branding.view" },
      { label: "Data Purge", href: "/admin/settings#data-purge", icon: Trash2, isSubmenu: true, privilege: "settings.manage" },
      { label: "My Profile", href: "/admin/profile", icon: UserCog, isSubmenu: true, privilege: "profile.view" },
    ],
  },
];

export const navByRole: Record<string, NavItem[]> = {
  SUPER_ADMIN: ADMIN_NAV,
  SCHOOL_ADMIN: ADMIN_NAV,
  HEAD_OF_SCHOOL: ADMIN_NAV,
  PRINCIPAL: ADMIN_NAV,

  ACCOUNTANT: [
    { label: "Dashboard", href: "/accountant/dashboard", icon: LayoutDashboard, group: "1. Overview" },
    { label: "Fee Setup", href: "/accountant/fee-setup", icon: CreditCard, group: "2. Billing" },
    { label: "Bills", href: "/accountant/invoices", icon: Receipt, group: "2. Billing" },
    { label: "Payments", href: "/accountant/payments", icon: CreditCard, group: "2. Billing" },
    { label: "Receipts", href: "/accountant/receipts", icon: Receipt, group: "2. Billing" },
    { label: "Debtors", href: "/accountant/debtors", icon: FileBarChart, group: "3. Financials" },
    { label: "Discounts", href: "/accountant/discounts", icon: CreditCard, group: "3. Financials" },
    { label: "Income", href: "/accountant/income", icon: TrendingUp, group: "3. Financials" },
    { label: "Expenses", href: "/accountant/expenses", icon: TrendingDown, group: "3. Financials" },
    { label: "Finance Reports", href: "/accountant/finance-reports", icon: FileBarChart, group: "3. Financials" },
  ],
  TEACHER: [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard, group: "1. Overview" },
    { label: "My Profile", href: "/teacher/profile", icon: Users, group: "1. Overview" },
    { label: "My Classes", href: "/teacher/my-classes", icon: Building2, group: "2. Academics" },
    { label: "My Subjects", href: "/teacher/my-subjects", icon: BookOpen, group: "2. Academics" },
    { label: "Attendance", href: "/teacher/attendance", icon: CalendarCheck, group: "2. Academics" },
    { label: "Score Entry", href: "/teacher/score-entry", icon: FileBarChart, group: "2. Academics" },
    { label: "Assignments", href: "/teacher/assignments", icon: BookOpen, group: "3. Teaching" },
    { label: "Lesson Notes", href: "/teacher/lesson-notes", icon: BookOpen, group: "3. Teaching" },
    { label: "Timetable", href: "/teacher/timetable", icon: CalendarCheck, group: "3. Teaching" },
    { label: "Student Reports", href: "/teacher/student-reports", icon: FileBarChart, group: "3. Teaching" },
    { label: "LMS", href: "/teacher/lms", icon: BookOpen, group: "3. Teaching" },
    { label: "Announcements", href: "/teacher/announcements", icon: Megaphone, group: "4. Communication" },
  ],
  CLASS_ASSISTANT: [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard, group: "1. Overview" },
    { label: "My Profile", href: "/teacher/profile", icon: Users, group: "1. Overview" },
    { label: "My Classes", href: "/teacher/my-classes", icon: Building2, group: "2. Academics" },
    { label: "My Subjects", href: "/teacher/my-subjects", icon: BookOpen, group: "2. Academics" },
    { label: "Attendance", href: "/teacher/attendance", icon: CalendarCheck, group: "2. Academics" },
    { label: "Assignments", href: "/teacher/assignments", icon: BookOpen, group: "3. Teaching" },
    { label: "Lesson Notes", href: "/teacher/lesson-notes", icon: BookOpen, group: "3. Teaching" },
    { label: "Timetable", href: "/teacher/timetable", icon: CalendarCheck, group: "3. Teaching" },
    { label: "LMS", href: "/teacher/lms", icon: BookOpen, group: "3. Teaching" },
    { label: "Announcements", href: "/teacher/announcements", icon: Megaphone, group: "4. Communication" },
  ],
  PARENT: [
    { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard, group: "1. Overview" },
    { label: "My Children", href: "/parent/children", icon: Users, group: "1. Overview" },
    { label: "Fees & Bills", href: "/parent/fees", icon: CreditCard, group: "2. Finance" },
    { label: "Payments", href: "/parent/payments", icon: CreditCard, group: "2. Finance" },
    { label: "Attendance", href: "/parent/attendance", icon: CalendarCheck, group: "3. Academics" },
    { label: "Results", href: "/parent/results", icon: FileBarChart, group: "3. Academics" },
    { label: "Report Cards", href: "/parent/report-cards", icon: FileBarChart, group: "3. Academics" },
    { label: "Documents", href: "/parent/documents", icon: FileCheck, group: "3. Academics" },
    { label: "School Calendar", href: "/parent/school-calendar", icon: CalendarCheck, group: "3. Academics" },
    { label: "Messages", href: "/parent/messages", icon: Megaphone, group: "4. Communication" },
    { label: "Complaints", href: "/parent/complaints", icon: MessageSquareWarning, group: "4. Communication" },
    { label: "Announcements", href: "/parent/announcements", icon: Megaphone, group: "4. Communication" },
    { label: "Surveys", href: "/parent/surveys", icon: ClipboardList, group: "4. Communication" },
    { label: "LMS", href: "/parent/lms", icon: BookOpen, group: "5. Learning" },
    { label: "My Profile", href: "/parent/profile", icon: Users, group: "6. Settings" },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard, group: "1. Overview" },
    { label: "My Profile", href: "/student/profile", icon: Users, group: "1. Overview" },
    { label: "Subjects", href: "/student/subjects", icon: BookOpen, group: "2. Academics" },
    { label: "Timetable", href: "/student/timetable", icon: CalendarCheck, group: "2. Academics" },
    { label: "Assignments", href: "/student/assignments", icon: BookOpen, group: "2. Academics" },
    { label: "Attendance", href: "/student/attendance", icon: CalendarCheck, group: "2. Academics" },
    { label: "LMS", href: "/student/lms", icon: BookOpen, group: "3. Learning" },
    { label: "Results", href: "/student/results", icon: FileBarChart, group: "4. Performance" },
    { label: "Report Card", href: "/student/report-card", icon: FileBarChart, group: "4. Performance" },
    { label: "Announcements", href: "/student/announcements", icon: Megaphone, group: "5. Communication" },
  ],
  REGISTRAR: [
    { label: "Dashboard", href: "/registrar/dashboard", icon: LayoutDashboard, group: "1. Overview" },
    { label: "Applications", href: "/registrar/applications", icon: Users, group: "2. Admissions" },
    { label: "Admissions", href: "/registrar/admissions", icon: Users, group: "2. Admissions" },
    { label: "Student Records", href: "/registrar/student-records", icon: Users, group: "3. Records" },
    { label: "Class Placement", href: "/registrar/class-placement", icon: Building2, group: "3. Records" },
    { label: "Parent Records", href: "/registrar/parent-records", icon: Users, group: "3. Records" },
    { label: "Documents", href: "/registrar/documents", icon: FileBarChart, group: "4. Documents" },
    { label: "ID Cards", href: "/registrar/id-cards", icon: FileBarChart, group: "4. Documents" },
  ],
};
