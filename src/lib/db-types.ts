// Database Types - replaces @prisma/client imports

export function studentFullName(student: { firstName?: string | null; middleName?: string | null; lastName?: string | null; user?: { name?: string | null } | null }): string {
  const parts = [student.firstName, student.middleName, student.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return student.user?.name ?? "";
}

export enum RoleType {
  SUPER_ADMIN = "SUPER_ADMIN",
  SCHOOL_ADMIN = "SCHOOL_ADMIN",
  HEAD_OF_SCHOOL = "HEAD_OF_SCHOOL",
  PRINCIPAL = "PRINCIPAL",
  HEAD_TEACHER = "HEAD_TEACHER",
  HEAD_OF_DEPARTMENT = "HEAD_OF_DEPARTMENT",
  ACCOUNTANT = "ACCOUNTANT",
  REGISTRAR = "REGISTRAR",
  TEACHER = "TEACHER",
  PARENT = "PARENT",
  STUDENT = "STUDENT",
  RECEPTIONIST = "RECEPTIONIST",
}

export enum PaymentStatus {
  UNPAID = "UNPAID",
  PART_PAYMENT = "PART_PAYMENT",
  PAID = "PAID",
  PENDING = "PENDING",
  REVERSED = "REVERSED",
}

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  LATE = "LATE",
  EXCUSED = "EXCUSED",
}

export enum AcademicStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
  ARCHIVED = "ARCHIVED",
}

export enum MessageStatus {
  SENT = "SENT",
  READ = "READ",
  REPLIED = "REPLIED",
  CLOSED = "CLOSED",
}

export enum ComplaintStatus {
  OPEN = "OPEN",
  IN_REVIEW = "IN_REVIEW",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum PaymentProofStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum ResultStatus {
  DRAFT = "DRAFT",
  APPROVED = "APPROVED",
  PUBLISHED = "PUBLISHED",
  REJECTED = "REJECTED",
}

// ─── Core Models ───

export interface School {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  website?: string | null;
  motto?: string | null;
  isActive: boolean;
  isSetup: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  branding?: SchoolBranding[];
}

export interface SchoolBranding {
  id: number;
  schoolId: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  reportCardTheme: string;
  invoiceTheme: string;
  receiptTheme: string;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankInstructions?: string | null;
  principalSignature?: string | null;
  teacherSignature?: string | null;
  schoolStamp?: string | null;
  reportHeaderText?: string | null;
  receiptFooterText?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Role {
  id: number;
  name: RoleType;
  label?: string | null;
  description?: string | null;
  createdAt: Date | string;
}

export interface User {
  id: number;
  roleId: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  password: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  role?: Role;
}

export interface Parent {
  id: number;
  userId: number;
  schoolId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: User;
  students?: Student[];
}

export interface Teacher {
  id: number;
  userId: number;
  schoolId: string;
  designation?: string | null;
  reportsToId?: number | null;
  classGroupId?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: User;
  reportsTo?: Teacher | null;
}

export interface Student {
  id: number;
  userId: number;
  schoolId: string;
  parentId?: number | null;
  classId?: number | null;
  armId?: number | null;
  admissionNo?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: User;
  class?: Class;
  parent?: Parent;
}

export interface Class {
  id: number;
  schoolId: string;
  name: string;
  groupId?: number | null;
  teacherId?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  teacher?: Teacher;
  students?: Student[];
}

export interface ClassGroup {
  id: number;
  schoolId: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ClassArm {
  id: number;
  schoolId: string;
  classId: number;
  name: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  class?: Class;
}

export interface Subject {
  id: number;
  schoolId: string;
  name: string;
  classId?: number | null;
  teacherId?: number | null;
  classNames?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  teacher?: Teacher;
  class?: Class;
}

export interface Session {
  id: number;
  schoolId: string;
  name: string;
  isCurrent: boolean;
  status: AcademicStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Term {
  id: number;
  schoolId: string;
  sessionId: number;
  name: string;
  isCurrent: boolean;
  status: AcademicStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  resumptionDate?: Date | string | null;
  breakDates?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
  session?: Session;
}

export interface FeeGroup {
  id: number;
  schoolId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FeeItem {
  id: number;
  schoolId: string;
  feeGroupId: number;
  name: string;
  amount: number;
  classId?: number | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  class?: Class;
  feeGroup?: FeeGroup;
}

export interface Invoice {
  id: number;
  schoolId: string;
  sessionId?: number | null;
  termId?: number | null;
  studentId?: number | null;
  parentId?: number | null;
  classId?: number | null;
  invoiceNumber: string;
  totalAmount: number;
  balance: number;
  status: PaymentStatus;
  dueDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  student?: Student;
  parent?: Parent;
  class?: Class;
  term?: Term;
  session?: Session;
  receipt?: Receipt[];
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  feeItemId: number;
  amount: number;
  feeItem?: FeeItem;
}

export interface Payment {
  id: number;
  schoolId: string;
  invoiceId: number;
  studentId?: number | null;
  amount: number;
  method: string;
  status: PaymentStatus;
  confirmedAt?: Date | string | null;
  createdAt: Date | string;
  invoice?: Invoice;
  student?: Student;
}

export interface Receipt {
  id: number;
  schoolId: string;
  invoiceId: number;
  receiptNumber: string;
  amount: number;
  createdAt: Date | string;
}

export interface Score {
  id: number;
  schoolId: string;
  sessionId?: number | null;
  termId?: number | null;
  studentId: number;
  subjectId: number;
  caScore?: number | null;
  examScore?: number | null;
  total?: number | null;
  grade?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  student?: Student;
  subject?: Subject;
  term?: Term;
  session?: Session;
}

export interface Result {
  id: number;
  schoolId: string;
  sessionId?: number | null;
  termId?: number | null;
  studentId: number;
  status: ResultStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  student?: Student;
  term?: Term;
  session?: Session;
}

export interface Attendance {
  id: number;
  schoolId: string;
  sessionId?: number | null;
  termId?: number | null;
  studentId: number;
  classId?: number | null;
  date: Date | string;
  status: AttendanceStatus;
  remark?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  student?: Student;
  class?: Class;
}

export interface Announcement {
  id: number;
  schoolId: string;
  title: string;
  body: string;
  targetRoles?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SchoolSetting {
  id: number;
  schoolId: string;
  key: string;
  value: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SchoolConfigVersion {
  id: number;
  schoolId: string;
  config: any;
  createdAt: Date | string;
}

export interface IncomeCategory {
  id: number;
  schoolId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExpenseCategory {
  id: number;
  schoolId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Income {
  id: number;
  schoolId: string;
  categoryId: number;
  amount: number;
  description?: string | null;
  source?: string | null;
  date: Date | string;
  isFromPayment: boolean;
  paymentId?: number | null;
  createdAt: Date | string;
  category?: IncomeCategory;
}

export interface Expense {
  id: number;
  schoolId: string;
  categoryId: number;
  amount: number;
  description?: string | null;
  date: Date | string;
  createdAt: Date | string;
  category?: ExpenseCategory;
}
