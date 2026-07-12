import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { ResultStatus } from "@/lib/db-types";
import { z } from "zod";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { getClassGroupGradingProfiles, resolveClassGroupProfile } from "@/lib/class-group-grading";
import { calculateGradeFromBands } from "@/lib/grades";
import { prisma } from "@/lib/db";
import { sendTemplatedEmail } from "@/lib/email";
import { getActiveSchoolConfig } from "@/lib/school-config";
import { getSetupWizardState } from "@/lib/setup-wizard";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";

const schema = z.object({
  studentId: z.coerce.number().int().min(1),
  action: z.enum(["APPROVE", "PUBLISH", "REJECT"]),
  reviewNote: z.string().max(1000).optional(),
  classTeacherComment: z.string().max(1000).optional(),
  principalComment: z.string().max(1000).optional(),
  sessionId: z.coerce.number().int().min(1).optional(),
  termId: z.coerce.number().int().min(1).optional(),
});

const querySchema = z.object({
  status: z.enum(["DRAFT", "APPROVED", "PUBLISHED", "REJECTED"]).optional(),
  sessionId: z.coerce.number().int().min(1).optional(),
  termId: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

const calendarService = new AcademicCalendarService();

function readableAction(action: "APPROVE" | "PUBLISH" | "REJECT") {
  if (action === "APPROVE") return "RESULT_APPROVED";
  if (action === "PUBLISH") return "RESULT_PUBLISHED";
  return "RESULT_REJECTED";
}

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "results");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    sessionId: url.searchParams.get("sessionId") ?? undefined,
    termId: url.searchParams.get("termId") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.flatten() }, { status: 400 });
  }

  const status = parsedQuery.data.status;

  const schoolId = session.user.schoolId || "default";

  const results = await prisma.result.findMany({
    where: {
      schoolId,
      ...(status ? { status } : { status: { in: [ResultStatus.DRAFT, ResultStatus.APPROVED, ResultStatus.REJECTED] } }),
      ...(parsedQuery.data.sessionId ? { sessionId: parsedQuery.data.sessionId } : {}),
      ...(parsedQuery.data.termId ? { termId: parsedQuery.data.termId } : {}),
    },
    include: {
      student: { include: { user: true, class: true } },
      term: true,
      session: true,
      approvedBy: { select: { id: true, name: true, email: true } },
      publishedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: parsedQuery.data.take ?? 100,
  });

  return NextResponse.json(
    results.map((result) => ({
      id: result.id,
      status: result.status,
      reviewNote: result.reviewNote,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      student: {
        id: result.student.id,
        name: result.student.user.name,
        className: result.student.class?.name ?? "-",
      },
      term: {
        id: result.term.id,
        name: result.term.name,
      },
      session: {
        id: result.session.id,
        name: result.session.name,
      },
      summary: {
        percentage: result.termPercentage,
        grade: result.termGrade,
        gpa: result.termGpa,
      },
      approvedAt: result.approvedAt?.toISOString() ?? null,
      approvedBy: result.approvedBy ? { id: result.approvedBy.id, name: result.approvedBy.name, email: result.approvedBy.email } : null,
      publishedAt: result.publishedAt?.toISOString() ?? null,
      publishedBy: result.publishedBy ? { id: result.publishedBy.id, name: result.publishedBy.name, email: result.publishedBy.email } : null,
      createdAt: result.createdAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "results");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const setup = await getSetupWizardState(schoolId);
  if (!setup.status.setupCompleted) {
    return NextResponse.json({ error: "Setup wizard must be completed before result approval/publishing.", setup }, { status: 409 });
  }

  const reviewNote = parsed.data.reviewNote?.trim() || null;
  if (parsed.data.action === "REJECT" && !reviewNote) {
    return NextResponse.json({ error: "Review note is required when rejecting a result." }, { status: 400 });
  }

  const context = await calendarService.getUserContext(schoolId, session.user.id);
  const sessionId = parsed.data.sessionId ?? context.sessionId ?? NaN;
  const termId = parsed.data.termId ?? context.termId ?? NaN;
  const studentId = parsed.data.studentId;

  if (Number.isNaN(studentId) || Number.isNaN(sessionId) || Number.isNaN(termId)) {
    return NextResponse.json({ error: "Invalid academic context or student ID" }, { status: 400 });
  }

  if (!sessionId || !termId) {
    return NextResponse.json({ error: "Academic context is not selected" }, { status: 400 });
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      class: {
        include: {
          classGroup: true,
        },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const now = new Date();

  if (parsed.data.action === "APPROVE") {
    const existingForApprove = await prisma.result.findFirst({
      where: {
        schoolId,
        studentId,
        sessionId,
        termId,
      },
    });

    const hasUploadedFile = Boolean(existingForApprove?.fileUrl);

    const [scores, attendance, activeConfig, classGroupProfiles] = await Promise.all([
      prisma.score.findMany({
        where: {
          schoolId,
          studentId: studentId,
          sessionId,
          termId,
        },
      }),
      prisma.attendance.findMany({
        where: {
          schoolId,
          studentId: studentId,
          sessionId,
          termId,
        },
      }),
      getActiveSchoolConfig(schoolId),
      getClassGroupGradingProfiles(schoolId),
    ]);

    if (!scores.length && !hasUploadedFile) {
      return NextResponse.json({ error: "No score rows or uploaded report found for this student in selected term/session" }, { status: 400 });
    }

    let computed: { total: number; average: number; termPercentage: number; termGrade: string; termGpa: number } | null = null;

    if (scores.length) {
      const total = scores.reduce((sum, item) => sum + (item.total ?? 0), 0);
      const average = total / scores.length;
      const classGroupProfile = resolveClassGroupProfile(classGroupProfiles, student.class?.classGroup?.name);
      const gradingSource = classGroupProfile?.gradeBands?.length
        ? classGroupProfile.gradeBands
        : activeConfig.config.academic.gradingSystem;
      const bands = gradingSource.map((band) => ({
        min: Number(band.min),
        grade: band.grade,
        gpa: Number(band.gpa),
      }));
      const gradeMeta = calculateGradeFromBands(average, bands);
      computed = {
        total,
        average,
        termPercentage: average,
        termGrade: gradeMeta.grade,
        termGpa: gradeMeta.gpa,
      };
    }

    const result = await prisma.result.upsert({
      where: {
        studentId_termId_sessionId: {
          studentId: studentId,
          termId,
          sessionId,
        },
      },
      update: {
        ...(computed
          ? {
              cumulativeTotal: computed.total,
              average: computed.average,
              termPercentage: computed.termPercentage,
              termGrade: computed.termGrade,
              termGpa: computed.termGpa,
            }
          : {}),
        attendancePresent: attendance.filter((item) => item.status === "PRESENT").length,
        attendanceTotal: attendance.length,
        classTeacherComment: parsed.data.classTeacherComment?.trim() || undefined,
        principalComment: parsed.data.principalComment?.trim() || undefined,
        status: ResultStatus.APPROVED,
        reviewNote,
        approvedById: session.user.id,
        approvedAt: now,
      },
      create: {
        schoolId,
        studentId: studentId,
        termId,
        sessionId,
        ...(computed
          ? {
              cumulativeTotal: computed.total,
              average: computed.average,
              termPercentage: computed.termPercentage,
              termGrade: computed.termGrade,
              termGpa: computed.termGpa,
            }
          : {}),
        attendancePresent: attendance.filter((item) => item.status === "PRESENT").length,
        attendanceTotal: attendance.length,
        classTeacherComment: parsed.data.classTeacherComment?.trim() || null,
        principalComment: parsed.data.principalComment?.trim() || null,
        status: ResultStatus.APPROVED,
        reviewNote,
        approvedById: session.user.id,
        approvedAt: now,
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: readableAction(parsed.data.action),
      targetType: "Result",
      targetId: String(result.id),
      metadata: {
        studentId: studentId,
        sessionId,
        termId,
        status: result.status,
        termPercentage: result.termPercentage,
        termGrade: result.termGrade,
        termGpa: result.termGpa,
      },
    });

    return NextResponse.json({
      ok: true,
      result: {
        id: result.id,
        status: result.status,
        termPercentage: result.termPercentage,
        termGrade: result.termGrade,
        termGpa: result.termGpa,
      },
    });
  }

  const existing = await prisma.result.findFirst({
    where: {
      schoolId,
      studentId: studentId,
      sessionId,
      termId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Result does not exist for selected term/session" }, { status: 404 });
  }

  if (parsed.data.action === "PUBLISH") {
    if (existing.status !== ResultStatus.APPROVED && existing.status !== ResultStatus.PUBLISHED) {
      return NextResponse.json({ error: "Result must be approved before publishing" }, { status: 400 });
    }

    const published = await prisma.result.update({
      where: { id: existing.id },
      data: {
        status: ResultStatus.PUBLISHED,
        reviewNote: reviewNote || existing.reviewNote,
        publishedById: session.user.id,
        publishedAt: now,
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: readableAction(parsed.data.action),
      targetType: "Result",
      targetId: String(published.id),
      metadata: {
        studentId: studentId,
        sessionId,
        termId,
        status: published.status,
      },
    });

    // Notify parent when results are published
    try {
      const [studentForNotify, termForNotify, sessionForNotify, school] = await Promise.all([
        prisma.student.findFirst({
          where: { id: studentId, schoolId },
          include: {
            user: true,
            parent: { include: { user: true } },
            class: true,
          },
        }),
        prisma.term.findUnique({ where: { id: termId } }),
        prisma.session.findUnique({ where: { id: sessionId } }),
        prisma.school.findUnique({ where: { id: schoolId } }),
      ]);
      let emailStatus = { sent: false, error: "" };
      if (studentForNotify?.parent?.user?.email) {
        try {
          const emailResult = await sendTemplatedEmail({
            schoolId,
            to: studentForNotify.parent.user.email,
            templateKey: "results_published",
            vars: {
              schoolName: school?.name ?? "Sckool Suite",
              parentName: studentForNotify.parent.user.name ?? "Parent",
              studentName: studentForNotify.user.name,
              sessionName: sessionForNotify?.name ?? "",
              termName: termForNotify?.name ?? "",
              className: studentForNotify.class?.name ?? "",
              overallGrade: published.termGrade ?? "",
              portalUrl: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "",
            },
          });
          emailStatus = { sent: emailResult.ok, error: emailResult.ok ? "" : "Email delivery failed" };
        } catch (error) {
          emailStatus = { sent: false, error: error instanceof Error ? error.message : "Email delivery failed" };
        }
      }

      if (!emailStatus.sent && studentForNotify?.parent?.user?.email) {
        return NextResponse.json({
          ok: true,
          result: { id: published.id, status: published.status },
          warning: "Result published, but publication email could not be delivered to the parent.",
          emailStatus,
        });
      }
    } catch {
      // suppress non-critical notification errors; result is already published
    }

    return NextResponse.json({ ok: true, result: { id: published.id, status: published.status } });
  }

  const rejected = await prisma.result.update({
    where: { id: existing.id },
    data: {
      status: ResultStatus.REJECTED,
      reviewNote,
      approvedById: null,
      approvedAt: null,
      publishedById: null,
      publishedAt: null,
    },
  });

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: readableAction(parsed.data.action),
    targetType: "Result",
    targetId: String(rejected.id),
    metadata: {
      studentId: studentId,
      sessionId,
      termId,
      status: rejected.status,
      reviewNote: rejected.reviewNote,
    },
  });

  return NextResponse.json({ ok: true, result: { id: rejected.id, status: rejected.status } });
}
