import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { getClassGroupGradingProfiles, resolveClassGroupProfile } from "@/lib/class-group-grading";
import { calculateGradeFromBands } from "@/lib/grades";
import { prisma } from "@/lib/db";
import { getActiveSchoolConfig } from "@/lib/school-config";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";

const schema = z.object({
  studentId: z.string().min(5),
  subjectId: z.string().min(5),
  caScore: z.coerce.number().min(0).max(100),
  examScore: z.coerce.number().min(0).max(100),
});

const calendarService = new AcademicCalendarService();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id  || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const teacher = await prisma.teacher.findFirst({ where: { schoolId: "default", userId: session.user.id } });
  if (!teacher) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  const subject = await prisma.subject.findFirst({
    where: { id: parsed.data.subjectId, schoolId: "default" },
  });
  if (!subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  if (subject.teacherId && subject.teacherId !== teacher.id) {
    return NextResponse.json({ error: "You can only enter scores for your assigned subjects" }, { status: 403 });
  }

  const student = await prisma.student.findFirst({
    where: { id: parsed.data.studentId, schoolId: "default" },
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

  if (subject.classId && student.classId && subject.classId !== student.classId) {
    return NextResponse.json({ error: "Student class does not match this subject" }, { status: 400 });
  }

  const context = await calendarService.getUserContext("default", session.user.id);
  if (!context.sessionId || !context.termId) {
    return NextResponse.json({ error: "Academic context is not selected" }, { status: 400 });
  }

  const [activeConfig, classGroupProfiles] = await Promise.all([
    getActiveSchoolConfig("default"),
    getClassGroupGradingProfiles("default"),
  ]);

  const classGroupProfile = resolveClassGroupProfile(classGroupProfiles, student.class?.classGroup?.name);
  const caMax = classGroupProfile?.caWeight ?? Number(activeConfig.config.academic.assessmentTypes[0]?.weight ?? 40);
  const examMax = classGroupProfile?.examWeight ?? Number(activeConfig.config.academic.assessmentTypes[1]?.weight ?? 60);

  if (parsed.data.caScore > caMax) {
    return NextResponse.json({ error: `CA score cannot exceed ${caMax} for this stage group.` }, { status: 400 });
  }

  if (parsed.data.examScore > examMax) {
    return NextResponse.json({ error: `Exam score cannot exceed ${examMax} for this stage group.` }, { status: 400 });
  }

  const total = parsed.data.caScore + parsed.data.examScore;
  const gradingSource = classGroupProfile?.gradeBands?.length
    ? classGroupProfile.gradeBands
    : activeConfig.config.academic.gradingSystem;
  const bands = gradingSource.map((band) => ({
    min: Number(band.min),
    grade: band.grade,
    gpa: Number(band.gpa),
  }));
  const grade = calculateGradeFromBands(total, bands);

  const score = await prisma.score.upsert({
    where: {
      studentId_subjectId_termId_sessionId: {
        studentId: student.id,
        subjectId: subject.id,
        termId: context.termId,
        sessionId: context.sessionId,
      },
    },
    update: {
      teacherId: teacher.id,
      caScore: parsed.data.caScore,
      examScore: parsed.data.examScore,
      total,
      grade: grade.grade,
      gpa: grade.gpa,
    },
    create: {
      schoolId: "default",
      studentId: student.id,
      subjectId: subject.id,
      teacherId: teacher.id,
      termId: context.termId,
      sessionId: context.sessionId,
      caScore: parsed.data.caScore,
      examScore: parsed.data.examScore,
      total,
      grade: grade.grade,
      gpa: grade.gpa,
    },
  });

  await createAuditLog({
    schoolId: "default",
    actorUserId: session.user.id,
    action: "SCORE_UPSERTED",
    targetType: "Score",
    targetId: score.id,
    metadata: {
      studentId: student.id,
      subjectId: subject.id,
      termId: context.termId,
      sessionId: context.sessionId,
      caScore: score.caScore,
      examScore: score.examScore,
      total: score.total,
      grade: score.grade,
      gpa: score.gpa,
    },
  });

  return NextResponse.json({ ok: true, scoreId: score.id, total: score.total, grade: score.grade, gpa: score.gpa });
}
