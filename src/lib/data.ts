import { PaymentStatus } from "@/lib/db-types";
import { prisma } from "@/lib/db";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";

function isContestAnnouncementEntry(input: { title?: string | null; body?: string | null }) {
  const combined = `${input.title ?? ""} ${input.body ?? ""}`.toLowerCase();
  return combined.includes("bill contest") || (combined.includes("contest") && combined.includes("bill"));
}

export async function getCurrentSchoolByUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) return null;

  const school = await prisma.school.findUnique({
    where: { id: "default" },
    include: { branding: true },
  });

  return {
    ...user,
    schoolId: "default",
    school: school ?? null,
  };
}

export async function getAdminOverview(schoolId: string) {
  const [students, teachers, parents, classes, bills, paid, attendance, announcements] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.teacher.count({ where: { schoolId } }),
    prisma.parent.count({ where: { schoolId } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.invoice.aggregate({ where: { schoolId }, _sum: { totalAmount: true, balance: true } }),
    prisma.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }),
    prisma.attendance.count({ where: { schoolId } }),
    prisma.announcement.findMany({ where: { schoolId }, select: { title: true, body: true } }),
  ]);

  return {
    students,
    teachers,
    parents,
    classes,
    attendance,
    announcements: announcements.filter((item) => !isContestAnnouncementEntry(item)).length,
    totalInvoiced: bills._sum.totalAmount ?? 0,
    outstanding: bills._sum.balance ?? 0,
    totalPaid: paid._sum.amount ?? 0,
  };
}

export async function getCoreSchoolData(schoolId: string) {
  return getCoreSchoolDataByContext(schoolId);
}

export async function getCoreSchoolDataByContext(schoolId: string, context?: { sessionId?: string | null; termId?: string | null }) {
  const scoreWhere = {
    schoolId,
    ...(context?.sessionId ? { sessionId: context.sessionId } : {}),
    ...(context?.termId ? { termId: context.termId } : {}),
  };

  const invoiceWhere = {
    schoolId,
    ...(context?.sessionId ? { sessionId: context.sessionId } : {}),
    ...(context?.termId ? { termId: context.termId } : {}),
  };

  const attendanceWhere = {
    schoolId,
    ...(context?.sessionId ? { sessionId: context.sessionId } : {}),
    ...(context?.termId ? { termId: context.termId } : {}),
  };

  const [
    students,
    parents,
    teachers,
    classes,
    subjects,
    feeItems,
    bills,
    payments,
    scores,
    lessons,
    assignments,
    quizzes,
    onlineClasses,
    attendance,
    announcements,
    school,
    result,
    sessions,
    terms,
  ] = await Promise.all([
    prisma.student.findMany({ where: { schoolId }, include: { user: true, class: true, parent: { include: { user: true } } } }),
    prisma.parent.findMany({ where: { schoolId }, include: { user: true, students: { include: { user: true } } } }),
    prisma.teacher.findMany({ where: { schoolId }, include: { user: true } }),
    prisma.class.findMany({ where: { schoolId }, include: { teacher: { include: { user: true } }, students: true } }),
    prisma.subject.findMany({ where: { schoolId }, include: { teacher: { include: { user: true } }, class: true } }),
    prisma.feeItem.findMany({ where: { schoolId }, include: { class: true } }),
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        student: { include: { user: true } },
        parent: { include: { user: true } },
        class: true,
        term: true,
        session: true,
        receipt: true,
        items: { include: { feeItem: { include: { feeGroup: true } } } },
      },
    }),
    prisma.payment.findMany({ where: { schoolId }, include: { invoice: true, student: { include: { user: true } } } }),
    prisma.score.findMany({
      where: scoreWhere,
      include: {
        student: { include: { user: true } },
        subject: true,
        term: true,
        session: true,
      },
    }),
    prisma.lesson.findMany({ where: { schoolId }, include: { subject: true, teacher: { include: { user: true } } } }),
    prisma.assignment.findMany({ where: { schoolId }, include: { subject: true, student: { include: { user: true } } } }),
    prisma.quiz.findMany({ where: { schoolId }, include: { subject: true, class: true, teacher: { include: { user: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.onlineClass.findMany({ where: { schoolId }, include: { subject: true, class: true, teacher: { include: { user: true } } }, orderBy: { startTime: "desc" } }),
    prisma.attendance.findMany({ where: attendanceWhere, include: { student: { include: { user: true } }, class: true }, orderBy: { date: "desc" } }),
    prisma.announcement.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } }),
    prisma.school.findUnique({ where: { id: schoolId }, include: { branding: true } }),
    prisma.result.findFirst({
      where: {
        schoolId,
        ...(context?.sessionId ? { sessionId: context.sessionId } : {}),
        ...(context?.termId ? { termId: context.termId } : {}),
      },
      include: { student: { include: { user: true, class: true } }, term: true, session: true },
    }),
    prisma.session.findMany({ where: { schoolId }, orderBy: [{ createdAt: "desc" }] }),
    prisma.term.findMany({ where: { schoolId }, include: { session: true }, orderBy: [{ createdAt: "desc" }] }),
  ]);

  return {
    school,
    students,
    parents,
    teachers,
    classes,
    subjects,
    feeItems,
    bills,
    payments,
    scores,
    lessons,
    assignments,
    quizzes,
    onlineClasses,
    attendance,
    announcements: announcements.filter((item) => !isContestAnnouncementEntry(item)),
    result,
    sessions,
    terms,
  };
}

export async function getUserAcademicContext(schoolId: string, userId: string) {
  const service = new AcademicCalendarService();
  return service.getUserContext(schoolId, userId);
}

export function statusLabel(status: PaymentStatus) {
  switch (status) {
    case "PART_PAYMENT":
      return "Part Payment";
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}
