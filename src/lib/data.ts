import { cache } from "react";
import { PaymentStatus } from "@/lib/db-types";
import { prisma } from "@/lib/db";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";

function isContestAnnouncementEntry(input: { title?: string | null; body?: string | null }) {
  const combined = `${input.title ?? ""} ${input.body ?? ""}`.toLowerCase();
  return combined.includes("bill contest") || (combined.includes("contest") && combined.includes("bill"));
}

export const getCurrentSchoolByUser = cache(async function getCurrentSchoolByUser(userId: string | number) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    include: { role: true },
  });
  if (!user) return null;

  const schoolId = (user as any).schoolId || "default";
  const school = await prisma.school.findUnique({ where: { id: schoolId }, include: { branding: true } });

  return {
    ...user,
    schoolId,
    school: school ?? null,
  };
});

export const getAdminOverview = cache(async function getAdminOverview(schoolId: string, context?: { sessionId?: number; termId?: number }) {
  try {
    const hasSession = !!context?.sessionId;
    const hasTerm = !!context?.termId;
    const enrollmentWhere = {
      ...(hasSession ? { sessionId: context!.sessionId } : {}),
      ...(hasTerm ? { termId: context!.termId } : {}),
    };
    const attendanceWhere = {
      schoolId,
      ...(hasSession ? { sessionId: context!.sessionId } : {}),
      ...(hasTerm ? { termId: context!.termId } : {}),
    };
    const announcementWhere = {
      schoolId,
      ...(hasSession ? { sessionId: context!.sessionId } : {}),
      ...(hasTerm ? { termId: context!.termId } : {}),
    };
    const invoiceWhere = {
      schoolId,
      ...(hasSession ? { sessionId: context!.sessionId } : {}),
      ...(hasTerm ? { termId: context!.termId } : {}),
    };
    const paymentWhere = {
      schoolId,
    };

    const [students, teachers, parents, classes, bills, paid, attendance, announcements] = await Promise.all([
      hasSession
        ? prisma.studentEnrollment.count({ where: enrollmentWhere })
        : prisma.student.count({ where: { schoolId } }),
      prisma.teacher.count({ where: { schoolId } }),
      prisma.parent.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.invoice.aggregate({ where: invoiceWhere, _sum: { totalAmount: true, balance: true } }),
      prisma.payment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
      prisma.attendance.count({ where: attendanceWhere }),
      prisma.announcement.findMany({ where: announcementWhere, select: { title: true, body: true }, take: 1000 }),
    ]);

    return {
      students,
      teachers,
      parents,
      classes,
      attendance,
      announcements: announcements.filter((item: any) => !isContestAnnouncementEntry(item)).length,
      totalInvoiced: bills._sum.totalAmount ?? 0,
      outstanding: bills._sum.balance ?? 0,
      totalPaid: paid._sum.amount ?? 0,
    };
  } catch (err: any) {
    console.error("[getAdminOverview] DB error:", err.message);
    return {
      students: 0,
      teachers: 0,
      parents: 0,
      classes: 0,
      attendance: 0,
      announcements: 0,
      totalInvoiced: 0,
      outstanding: 0,
      totalPaid: 0,
    };
  }
});

export async function getCoreSchoolData(schoolId: string) {
  return getCoreSchoolDataByContext(schoolId);
}

export const getCoreSchoolDataByContext = cache(async function getCoreSchoolDataByContext(schoolId: string, context?: { sessionId?: number; termId?: number }) {
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
    studentCount, parentCount, teacherCount, classCount, subjectCount,
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
    prisma.student.count({ where: { schoolId } }),
    prisma.parent.count({ where: { schoolId } }),
    prisma.teacher.count({ where: { schoolId } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.subject.count({ where: { schoolId } }),
    // Session-scoped students via enrollment
    (async () => {
      const hasSession = !!context?.sessionId;
      if (!hasSession) {
        return prisma.student.findMany({ where: { schoolId }, take: 20, orderBy: { createdAt: "desc" }, include: { user: true, class: true, parent: { include: { user: true } } } });
      }
      const enrollmentWhere: any = { sessionId: context!.sessionId };
      if (context?.termId) enrollmentWhere.termId = context.termId;
      const enrollments = await prisma.studentEnrollment.findMany({
        where: enrollmentWhere,
        select: { studentId: true },
        take: 100,
        orderBy: { createdAt: "desc" },
      });
      const ids = enrollments.map((e: any) => e.studentId);
      if (ids.length === 0) return [];
      return prisma.student.findMany({
        where: { id: { in: ids }, schoolId },
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { user: true, class: true, parent: { include: { user: true } } },
      });
    })(),
    prisma.parent.findMany({ where: { schoolId }, take: 20, orderBy: { createdAt: "desc" }, include: { user: true, students: { include: { user: true } } } }),
    prisma.teacher.findMany({ where: { schoolId }, take: 20, orderBy: { createdAt: "desc" }, include: { user: true, reportsTo: { include: { user: true } }, classGroup: true } }),
    prisma.class.findMany({ where: { schoolId }, take: 20, orderBy: { createdAt: "desc" }, include: { teacher: { include: { user: true } }, students: true } }),
    prisma.subject.findMany({ where: { schoolId }, take: 20, orderBy: { createdAt: "desc" }, include: { teacher: { include: { user: true } }, class: true } }),
    prisma.feeItem.findMany({ where: { schoolId }, take: 20, orderBy: { createdAt: "desc" }, include: { class: true } }),
    prisma.invoice.findMany({
      where: invoiceWhere,
      take: 50,
      orderBy: { createdAt: "desc" },
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
    prisma.payment.findMany({ where: { schoolId }, take: 50, orderBy: { createdAt: "desc" }, include: { invoice: true, student: { include: { user: true } } } }),
    prisma.score.findMany({
      where: scoreWhere,
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        student: { include: { user: true } },
        subject: true,
        term: true,
        session: true,
      },
    }),
    prisma.lesson.findMany({ where: { schoolId }, take: 20, orderBy: { createdAt: "desc" }, include: { subject: true, teacher: { include: { user: true } } } }),
    prisma.assignment.findMany({ where: { schoolId }, take: 20, orderBy: { createdAt: "desc" }, include: { subject: true, student: { include: { user: true } } } }),
    prisma.quiz.findMany({ where: { schoolId }, take: 20, orderBy: { createdAt: "desc" }, include: { subject: true, class: true, teacher: { include: { user: true } } } }),
    prisma.onlineClass.findMany({ where: { schoolId }, take: 20, orderBy: { startTime: "desc" }, include: { subject: true, class: true, teacher: { include: { user: true } } } }),
    prisma.attendance.findMany({ where: attendanceWhere, take: 50, orderBy: { date: "desc" }, include: { student: { include: { user: true } }, class: true } }),
    prisma.announcement.findMany({
      where: {
        schoolId,
        ...(context?.sessionId ? { sessionId: context.sessionId } : {}),
        ...(context?.termId ? { termId: context.termId } : {}),
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.school.findUnique({ where: { id: schoolId }, include: { branding: true } }),
    prisma.result.findFirst({
      where: {
        schoolId,
        ...(context?.sessionId ? { sessionId: context.sessionId } : {}),
        ...(context?.termId ? { termId: context.termId } : {}),
      },
      select: {
        id: true,
        schoolId: true,
        studentId: true,
        termId: true,
        sessionId: true,
        cumulativeTotal: true,
        average: true,
        termPercentage: true,
        termGrade: true,
        termGpa: true,
        classTeacherComment: true,
        principalComment: true,
        attendancePresent: true,
        attendanceTotal: true,
        cognitiveAssessment: true,
        affectiveAssessment: true,
        psychomotorAssessment: true,
        nextTermResumption: true,
        status: true,
        reviewNote: true,
        fileUrl: true,
        fileName: true,
        uploadedById: true,
        approvedById: true,
        approvedAt: true,
        publishedById: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        student: { include: { user: true, class: true } },
        term: true,
        session: true,
      },
    }),
    prisma.session.findMany({ where: { schoolId }, orderBy: [{ createdAt: "desc" }] }),
    prisma.term.findMany({ where: { schoolId }, include: { session: true }, orderBy: [{ createdAt: "desc" }] }),
  ]);

  return {
    school,
    students,
    studentCount,
    parents,
    parentCount,
    teachers,
    teacherCount,
    classes,
    classCount,
    subjects,
    subjectCount,
    feeItems,
    bills,
    payments,
    scores,
    lessons,
    assignments,
    quizzes,
    onlineClasses,
    attendance,
    announcements: announcements.filter((item: any) => !isContestAnnouncementEntry(item)),
    result,
    sessions,
    terms,
  };
});

export const getDashboardData = cache(async function getDashboardData(schoolId: string, context?: { sessionId?: number; termId?: number }) {
  const invoiceWhere = {
    schoolId,
    ...(context?.sessionId ? { sessionId: context.sessionId } : {}),
    ...(context?.termId ? { termId: context.termId } : {}),
  };

  const scoreWhere = {
    schoolId,
    ...(context?.sessionId ? { sessionId: context.sessionId } : {}),
    ...(context?.termId ? { termId: context.termId } : {}),
  };

  const [
    studentCount, parentCount, teacherCount, classCount, subjectCount,
    sessions, terms,
    bills, payments,
    scores, attendance,
    announcements,
    school,
    incomeCount,
    expenseCount,
    incomeCategories,
    expenseCategories,
    totalExpensesAgg,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.parent.count({ where: { schoolId } }),
    prisma.teacher.count({ where: { schoolId } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.subject.count({ where: { schoolId } }),
    prisma.session.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } }),
    prisma.term.findMany({ where: { schoolId }, include: { session: true }, orderBy: { createdAt: "desc" } }),
    prisma.invoice.findMany({
      where: invoiceWhere,
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { receipt: true },
    }),
    prisma.payment.findMany({
      where: { schoolId },
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { invoice: true, student: { include: { user: true } } },
    }),
    prisma.score.findMany({
      where: scoreWhere,
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { student: { include: { user: true } }, subject: true, term: true, session: true },
    }),
    prisma.attendance.findMany({
      where: { schoolId, ...(context?.sessionId ? { sessionId: context.sessionId } : {}), ...(context?.termId ? { termId: context.termId } : {}) },
      take: 50,
      orderBy: { date: "desc" },
      include: { student: { include: { user: true } }, class: true },
    }),
    prisma.announcement.findMany({ where: { schoolId }, take: 20, orderBy: { createdAt: "desc" } }),
    prisma.school.findUnique({ where: { id: schoolId }, include: { branding: true } }),
    prisma.income.count({ where: { schoolId } }),
    prisma.expense.count({ where: { schoolId } }),
    prisma.incomeCategory.count({ where: { schoolId } }),
    prisma.expenseCategory.count({ where: { schoolId } }),
    prisma.expense.aggregate({ where: { schoolId }, _sum: { amount: true } }),
  ]);

  const selectedSession = sessions.find((s: any) => s.id === context?.sessionId) ?? null;
  const selectedTerm = terms.find((t: any) => t.id === context?.termId) ?? null;

  return {
    school,
    studentCount,
    parentCount,
    teacherCount,
    classCount,
    subjectCount,
    sessions,
    terms,
    selectedSession,
    selectedTerm,
    bills,
    payments,
    scores,
    attendance,
    announcements: announcements.filter((item: any) => !isContestAnnouncementEntry(item)),
    incomeCount,
    expenseCount,
    incomeCategories,
    expenseCategories,
    totalExpenses: totalExpensesAgg._sum.amount ?? 0,
  };
});

export const getUserAcademicContext = cache(async function getUserAcademicContext(schoolId: string, userId: string | number) {
  const service = new AcademicCalendarService();
  return service.getUserContext(schoolId, userId);
});

export function statusLabel(status: PaymentStatus | string) {
  switch (status) {
    case "PART_PAYMENT":
      return "Part Payment";
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}
