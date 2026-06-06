// Database Types - replaces @prisma/client imports

export enum RoleType {
  SUPER_ADMIN = "SUPER_ADMIN",
  SCHOOL_ADMIN = "SCHOOL_ADMIN",
  PRINCIPAL = "PRINCIPAL",
  ACCOUNTANT = "ACCOUNTANT",
  TEACHER = "TEACHER",
  PARENT = "PARENT",
  STUDENT = "STUDENT",
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
