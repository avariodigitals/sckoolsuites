import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { checkPrivilege } from "@/lib/privileges";

const db = prisma as any;

const PURGE_CATEGORIES = [
  "admissions",
  "students",
  "parents",
  "teachers",
  "finance",
  "fees",
  "income_expenses",
  "academic",
  "results",
  "attendance",
  "lms",
  "communication",
  "transport",
  "reception",
  "loans_assets",
  "audit_logs",
  "notifications",
] as const;

type PurgeCategory = (typeof PURGE_CATEGORIES)[number];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await checkPrivilege(session.user.id, "settings.manage");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden — settings.manage privilege required" }, { status: 403 });
  }

  const schoolId = session.user.schoolId || "default";

  const safeCount = (promise: Promise<number>): Promise<number> =>
    promise.catch(() => 0);

  const counts = await Promise.all([
    safeCount(db.admissionApplication.count({ where: { schoolId } })),
    safeCount(db.student.count({ where: { schoolId } })),
    safeCount(db.parent.count({ where: { schoolId } })),
    safeCount(db.teacher.count({ where: { schoolId } })),
    Promise.all([
      safeCount(db.invoice.count({ where: { schoolId } })),
      safeCount(db.payment.count({ where: { schoolId } })),
      safeCount(db.receipt.count({ where: { schoolId } })),
    ]).then(([a, b, c]: number[]) => a + b + c),
    Promise.all([
      safeCount(db.feeGroup.count({ where: { schoolId } })),
      safeCount(db.feeItem.count({ where: { schoolId } })),
      safeCount(db.feeProfile.count({ where: { schoolId } })),
      safeCount(db.feeConcession.count({ where: { schoolId } })),
    ]).then(([a, b, c, d]: number[]) => a + b + c + d),
    Promise.all([
      safeCount(db.income.count({ where: { schoolId } })),
      safeCount(db.expense.count({ where: { schoolId } })),
      safeCount(db.incomeCategory.count({ where: { schoolId } })),
      safeCount(db.expenseCategory.count({ where: { schoolId } })),
    ]).then(([a, b, c, d]: number[]) => a + b + c + d),
    Promise.all([
      safeCount(db.assessment.count({ where: { schoolId } })),
      safeCount(db.subject.count({ where: { schoolId } })),
      safeCount(db.classArm.count({ where: { schoolId } })),
      safeCount(db.class.count({ where: { schoolId } })),
      safeCount(db.classGroup.count({ where: { schoolId } })),
      safeCount(db.term.count({ where: { schoolId } })),
      safeCount(db.session.count({ where: { schoolId } })),
    ]).then((vals: number[]) => vals.reduce((s: number, v: number) => s + v, 0)),
    Promise.all([
      safeCount(db.score.count({ where: { schoolId } })),
      safeCount(db.result.count({ where: { schoolId } })),
    ]).then(([a, b]: number[]) => a + b),
    Promise.all([
      safeCount(db.attendance.count({ where: { schoolId } })),
      safeCount(db.staffAttendance.count({ where: { schoolId } })),
    ]).then(([a, b]: number[]) => a + b),
    Promise.all([
      safeCount(db.lesson.count({ where: { schoolId } })),
      safeCount(db.assignment.count({ where: { schoolId } })),
      safeCount(db.quiz.count({ where: { schoolId } })),
      safeCount(db.onlineClass.count({ where: { schoolId } })),
    ]).then((vals: number[]) => vals.reduce((s: number, v: number) => s + v, 0)),
    Promise.all([
      safeCount(db.announcement.count({ where: { schoolId } })),
      safeCount(db.schoolEvent.count({ where: { schoolId } })),
      safeCount(db.survey.count({ where: { schoolId } })),
    ]).then((vals: number[]) => vals.reduce((s: number, v: number) => s + v, 0)),
    Promise.all([
      safeCount(db.vehicle.count({ where: { schoolId } })),
      safeCount(db.driver.count({ where: { schoolId } })),
      safeCount(db.route.count({ where: { schoolId } })),
    ]).then((vals: number[]) => vals.reduce((s: number, v: number) => s + v, 0)),
    Promise.all([
      safeCount(db.visitor.count({ where: { schoolId } })),
      safeCount(db.enquiry.count({ where: { schoolId } })),
      safeCount(db.gatePass.count({ where: { schoolId } })),
      safeCount(db.receptionComplaint.count({ where: { schoolId } })),
      safeCount(db.callLog.count({ where: { schoolId } })),
      safeCount(db.correspondence.count({ where: { schoolId } })),
      safeCount(db.query.count({ where: { schoolId } })),
    ]).then((vals: number[]) => vals.reduce((s: number, v: number) => s + v, 0)),
    Promise.all([
      safeCount(db.loan.count({ where: { schoolId } })),
      safeCount(db.asset.count({ where: { schoolId } })),
    ]).then(([a, b]: number[]) => a + b),
    safeCount(db.auditLog.count({ where: { schoolId } })),
    safeCount(db.notificationRecord.count({ where: { schoolId } })),
  ]);

  try {
    const result: Record<string, number> = {};
    PURGE_CATEGORIES.forEach((cat, i) => {
      result[cat] = counts[i];
    });

    return NextResponse.json({ counts: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load counts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await checkPrivilege(session.user.id, "settings.manage");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden — settings.manage privilege required" }, { status: 403 });
  }

  const body = await request.json();
  const { category } = body as { category?: string };

  if (!category || !PURGE_CATEGORIES.includes(category as PurgeCategory)) {
    return NextResponse.json({ error: "Invalid purge category" }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const cat = category as PurgeCategory;

  const safeDelete = async (promise: Promise<{ count: number }>): Promise<number> => {
    try {
      const r = await promise;
      return r.count;
    } catch {
      return 0;
    }
  };

  try {
    let total = 0;

    switch (cat) {
      case "admissions": {
        total = await safeDelete(db.admissionApplication.deleteMany({ where: { schoolId } }));
        break;
      }

      case "students": {
        const studentUsers = await db.student.findMany({ where: { schoolId }, select: { userId: true } }).catch(() => []);
        const userIds = studentUsers.map((s: any) => s.userId);
        if (userIds.length > 0) {
          await safeDelete(db.studentEmailAccount.deleteMany({ where: { studentId: { in: userIds } } } as any));
        }
        total = await safeDelete(db.student.deleteMany({ where: { schoolId } }));
        if (userIds.length > 0) {
          await safeDelete(db.user.deleteMany({ where: { id: { in: userIds } } }));
        }
        break;
      }

      case "parents": {
        const parentUsers = await db.parent.findMany({ where: { schoolId }, select: { userId: true } }).catch(() => []);
        const userIds = parentUsers.map((p: any) => p.userId);
        total = await safeDelete(db.parent.deleteMany({ where: { schoolId } }));
        if (userIds.length > 0) {
          await safeDelete(db.user.deleteMany({ where: { id: { in: userIds } } }));
        }
        break;
      }

      case "teachers": {
        await safeDelete(db.subjectAssignment.deleteMany({ where: { schoolId } }));
        const teacherUsers = await db.teacher.findMany({ where: { schoolId }, select: { userId: true } }).catch(() => []);
        const userIds = teacherUsers.map((t: any) => t.userId);
        total = await safeDelete(db.teacher.deleteMany({ where: { schoolId } }));
        if (userIds.length > 0) {
          await safeDelete(db.user.deleteMany({ where: { id: { in: userIds } } }));
        }
        break;
      }

      case "finance": {
        await safeDelete(db.invoiceContestAudit.deleteMany({ where: { schoolId } }));
        await safeDelete(db.paymentProof.deleteMany({ where: { schoolId } }));
        await safeDelete(db.receipt.deleteMany({ where: { schoolId } }));
        await safeDelete(db.payment.deleteMany({ where: { schoolId } }));
        total = await safeDelete(db.invoice.deleteMany({ where: { schoolId } }));
        break;
      }

      case "fees": {
        await safeDelete(db.feeProfileItem.deleteMany({}));
        await safeDelete(db.feeProfileClass.deleteMany({}));
        await safeDelete(db.feeProfileArm.deleteMany({}));
        await safeDelete(db.feeProfile.deleteMany({ where: { schoolId } }));
        await safeDelete(db.feeItem.deleteMany({ where: { schoolId } }));
        await safeDelete(db.feeConcession.deleteMany({ where: { schoolId } }));
        total = await safeDelete(db.feeGroup.deleteMany({ where: { schoolId } }));
        break;
      }

      case "income_expenses": {
        await safeDelete(db.income.deleteMany({ where: { schoolId } }));
        await safeDelete(db.expense.deleteMany({ where: { schoolId } }));
        const ic = await safeDelete(db.incomeCategory.deleteMany({ where: { schoolId } }));
        const ec = await safeDelete(db.expenseCategory.deleteMany({ where: { schoolId } }));
        total = ic + ec;
        break;
      }

      case "academic": {
        await safeDelete(db.classAssessment.deleteMany({}));
        await safeDelete(db.classGroupAssessment.deleteMany({}));
        await safeDelete(db.assessment.deleteMany({ where: { schoolId } }));
        await safeDelete(db.subjectAssignment.deleteMany({ where: { schoolId } }));
        await safeDelete(db.subject.deleteMany({ where: { schoolId } }));
        await safeDelete(db.classArm.deleteMany({ where: { schoolId } }));
        await safeDelete(db.class.deleteMany({ where: { schoolId } }));
        await safeDelete(db.classGroup.deleteMany({ where: { schoolId } }));
        await safeDelete(db.term.deleteMany({ where: { schoolId } }));
        total = await safeDelete(db.session.deleteMany({ where: { schoolId } }));
        break;
      }

      case "results": {
        await safeDelete(db.score.deleteMany({ where: { schoolId } }));
        total = await safeDelete(db.result.deleteMany({ where: { schoolId } }));
        break;
      }

      case "attendance": {
        await safeDelete(db.attendance.deleteMany({ where: { schoolId } }));
        total = await safeDelete(db.staffAttendance.deleteMany({ where: { schoolId } }));
        break;
      }

      case "lms": {
        await safeDelete(db.assignment.deleteMany({ where: { schoolId } }));
        await safeDelete(db.quiz.deleteMany({ where: { schoolId } }));
        await safeDelete(db.onlineClass.deleteMany({ where: { schoolId } }));
        total = await safeDelete(db.lesson.deleteMany({ where: { schoolId } }));
        break;
      }

      case "communication": {
        await safeDelete(db.announcementReaction.deleteMany({}));
        await safeDelete(db.announcement.deleteMany({ where: { schoolId } }));
        await safeDelete(db.surveyAnswer.deleteMany({}));
        await safeDelete(db.surveyResponse.deleteMany({}));
        await safeDelete(db.surveyQuestion.deleteMany({}));
        await safeDelete(db.survey.deleteMany({ where: { schoolId } }));
        total = await safeDelete(db.schoolEvent.deleteMany({ where: { schoolId } }));
        break;
      }

      case "transport": {
        await safeDelete(db.routeStop.deleteMany({}));
        await safeDelete(db.route.deleteMany({ where: { schoolId } }));
        await safeDelete(db.vehicle.deleteMany({ where: { schoolId } }));
        total = await safeDelete(db.driver.deleteMany({ where: { schoolId } }));
        break;
      }

      case "reception": {
        await safeDelete(db.visitor.deleteMany({ where: { schoolId } }));
        await safeDelete(db.enquiry.deleteMany({ where: { schoolId } }));
        await safeDelete(db.gatePass.deleteMany({ where: { schoolId } }));
        await safeDelete(db.receptionComplaint.deleteMany({ where: { schoolId } }));
        await safeDelete(db.callLog.deleteMany({ where: { schoolId } }));
        await safeDelete(db.correspondence.deleteMany({ where: { schoolId } }));
        total = await safeDelete(db.query.deleteMany({ where: { schoolId } }));
        break;
      }

      case "loans_assets": {
        await safeDelete(db.loan.deleteMany({ where: { schoolId } }));
        total = await safeDelete(db.asset.deleteMany({ where: { schoolId } }));
        break;
      }

      case "audit_logs": {
        total = await safeDelete(db.auditLog.deleteMany({ where: { schoolId } }));
        break;
      }

      case "notifications": {
        total = await safeDelete(db.notificationRecord.deleteMany({ where: { schoolId } }));
        break;
      }
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "DATA_PURGE",
      targetType: "Purge",
      targetId: cat,
      metadata: { category: cat, recordsDeleted: total },
    });

    return NextResponse.json({ ok: true, category: cat, deleted: total });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
