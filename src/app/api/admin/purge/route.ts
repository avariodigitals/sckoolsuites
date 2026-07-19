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

  try {
    const deleted = await db.$transaction(async (tx: any) => {
      let total = 0;

      switch (cat) {
        case "admissions": {
          const r = await tx.admissionApplication.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "students": {
          const studentUsers = await tx.student.findMany({ where: { schoolId }, select: { userId: true } });
          const userIds = studentUsers.map((s: any) => s.userId);
          if (userIds.length > 0) {
            await tx.studentEmailAccount.deleteMany({ where: { studentId: { in: userIds } } }).catch(() => {});
          }
          const r = await tx.student.deleteMany({ where: { schoolId } });
          total = r.count;
          if (userIds.length > 0) {
            await tx.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
          }
          break;
        }

        case "parents": {
          const parentUsers = await tx.parent.findMany({ where: { schoolId }, select: { userId: true } });
          const userIds = parentUsers.map((p: any) => p.userId);
          const r = await tx.parent.deleteMany({ where: { schoolId } });
          total = r.count;
          if (userIds.length > 0) {
            await tx.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
          }
          break;
        }

        case "teachers": {
          await tx.subjectAssignment.deleteMany({ where: { schoolId } });
          const teacherUsers = await tx.teacher.findMany({ where: { schoolId }, select: { userId: true } });
          const userIds = teacherUsers.map((t: any) => t.userId);
          const r = await tx.teacher.deleteMany({ where: { schoolId } });
          total = r.count;
          if (userIds.length > 0) {
            await tx.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
          }
          break;
        }

        case "finance": {
          await tx.invoiceContestAudit.deleteMany({ where: { schoolId } });
          await tx.paymentProof.deleteMany({ where: { schoolId } });
          await tx.receipt.deleteMany({ where: { schoolId } });
          await tx.payment.deleteMany({ where: { schoolId } });
          const r = await tx.invoice.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "fees": {
          await tx.feeProfileItem.deleteMany({});
          await tx.feeProfileClass.deleteMany({});
          await tx.feeProfileArm.deleteMany({});
          await tx.feeProfile.deleteMany({ where: { schoolId } });
          await tx.feeItem.deleteMany({ where: { schoolId } });
          await tx.feeConcession.deleteMany({ where: { schoolId } });
          const r = await tx.feeGroup.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "income_expenses": {
          await tx.income.deleteMany({ where: { schoolId } });
          await tx.expense.deleteMany({ where: { schoolId } });
          const ic = await tx.incomeCategory.deleteMany({ where: { schoolId } });
          const ec = await tx.expenseCategory.deleteMany({ where: { schoolId } });
          total = ic.count + ec.count;
          break;
        }

        case "academic": {
          await tx.classAssessment.deleteMany({});
          await tx.classGroupAssessment.deleteMany({});
          await tx.assessment.deleteMany({ where: { schoolId } });
          await tx.subjectAssignment.deleteMany({ where: { schoolId } });
          await tx.subject.deleteMany({ where: { schoolId } });
          await tx.classArm.deleteMany({ where: { schoolId } });
          await tx.class.deleteMany({ where: { schoolId } });
          await tx.classGroup.deleteMany({ where: { schoolId } });
          await tx.term.deleteMany({ where: { schoolId } });
          const r = await tx.session.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "results": {
          await tx.score.deleteMany({ where: { schoolId } });
          const r = await tx.result.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "attendance": {
          await tx.attendance.deleteMany({ where: { schoolId } });
          const r = await tx.staffAttendance.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "lms": {
          await tx.assignment.deleteMany({ where: { schoolId } });
          await tx.quiz.deleteMany({ where: { schoolId } });
          await tx.onlineClass.deleteMany({ where: { schoolId } });
          const r = await tx.lesson.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "communication": {
          await tx.announcementReaction.deleteMany({});
          await tx.announcement.deleteMany({ where: { schoolId } });
          await tx.surveyAnswer.deleteMany({});
          await tx.surveyResponse.deleteMany({});
          await tx.surveyQuestion.deleteMany({});
          await tx.survey.deleteMany({ where: { schoolId } });
          const r = await tx.schoolEvent.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "transport": {
          await tx.routeStop.deleteMany({});
          await tx.route.deleteMany({ where: { schoolId } });
          await tx.vehicle.deleteMany({ where: { schoolId } });
          const r = await tx.driver.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "reception": {
          await tx.visitor.deleteMany({ where: { schoolId } });
          await tx.enquiry.deleteMany({ where: { schoolId } });
          await tx.gatePass.deleteMany({ where: { schoolId } });
          await tx.receptionComplaint.deleteMany({ where: { schoolId } });
          await tx.callLog.deleteMany({ where: { schoolId } });
          await tx.correspondence.deleteMany({ where: { schoolId } });
          const r = await tx.query.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "loans_assets": {
          await tx.loan.deleteMany({ where: { schoolId } });
          const r = await tx.asset.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "audit_logs": {
          const r = await tx.auditLog.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }

        case "notifications": {
          const r = await tx.notificationRecord.deleteMany({ where: { schoolId } });
          total = r.count;
          break;
        }
      }

      return total;
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "DATA_PURGE",
      targetType: "Purge",
      targetId: cat,
      metadata: { category: cat, recordsDeleted: deleted },
    });

    return NextResponse.json({ ok: true, category: cat, deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
