import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { getClassGroupGradingProfiles, resolveClassGroupProfile } from "@/lib/class-group-grading";
import { calculateGradeFromBands } from "@/lib/grades";
import { prisma } from "@/lib/db";
import { getActiveSchoolConfig } from "@/lib/school-config";
import { checkPrivilege } from "@/lib/privileges";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";

const entrySchema = z.object({
  studentId: z.coerce.number().int().min(1),
  caScore: z.coerce.number().min(0).max(100),
  examScore: z.coerce.number().min(0).max(100),
});

const schema = z.object({
  subjectId: z.coerce.number().int().min(1),
  entries: z.array(entrySchema).min(1),
});

const calendarService = new AcademicCalendarService();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await checkPrivilege(session.user.id, "results.manage");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const subjectId = parsed.data.subjectId;
  const isAdmin = await checkPrivilege(session.user.id, "students.manage");

  const teacher = isAdmin
    ? null
    : await prisma.teacher.findFirst({ where: { schoolId, userId: session.user.id } });
  if (!isAdmin && !teacher) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId },
  });
  if (!subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  const context = await calendarService.getUserContext(schoolId, session.user.id);
  if (!context.sessionId || !context.termId) {
    return NextResponse.json({ error: "Academic context is not selected" }, { status: 400 });
  }

  const [activeConfig, classGroupProfiles] = await Promise.all([
    getActiveSchoolConfig(schoolId),
    getClassGroupGradingProfiles(schoolId),
  ]);

  // Fetch all students for this batch
  const studentIds = parsed.data.entries.map((e) => e.studentId);
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, schoolId },
    include: {
      class: { include: { classGroup: true } },
      classArm: true,
    },
  });
  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Check for existing scores (teachers cannot overwrite)
  if (!isAdmin) {
    const existingScores = await prisma.score.findMany({
      where: {
        schoolId,
        subjectId,
        termId: context.termId,
        sessionId: context.sessionId,
        studentId: { in: studentIds },
      },
      select: { studentId: true },
    });
    const existingSet = new Set(existingScores.map((s) => s.studentId));
    const newEntries = parsed.data.entries.filter((e) => !existingSet.has(e.studentId));
    if (newEntries.length === 0) {
      return NextResponse.json(
        { error: "All scores have already been submitted and cannot be edited. Please request corrections from your head teacher or admin." },
        { status: 403 }
      );
    }
    // Filter to only new entries
    parsed.data.entries = newEntries;
  }

  // Verify teacher authorization for each student
  if (!isAdmin) {
    for (const entry of parsed.data.entries) {
      const student = studentMap.get(entry.studentId);
      if (!student) continue;
      const assignedToSubject = subject.teacherId === teacher?.id;
      const assignedToClass = student.class?.teacherId === teacher?.id;
      const assignedToArm = student.classArm?.teacherId === teacher?.id;
      if (!assignedToSubject && !assignedToClass && !assignedToArm) {
        return NextResponse.json(
          { error: `You are not authorized to enter scores for student ID ${entry.studentId}` },
          { status: 403 }
        );
      }
    }
  }

  let saved = 0;
  const errors: Array<{ studentId: number; error: string }> = [];

  for (const entry of parsed.data.entries) {
    try {
      const student = studentMap.get(entry.studentId);
      if (!student) {
        errors.push({ studentId: entry.studentId, error: "Student not found" });
        continue;
      }

      if (subject.classId && student.classId && subject.classId !== student.classId) {
        errors.push({ studentId: entry.studentId, error: "Student class does not match subject" });
        continue;
      }

      const classGroupProfile = resolveClassGroupProfile(classGroupProfiles, student.class?.classGroup?.name);
      const caMax = classGroupProfile?.caWeight ?? Number(activeConfig.config.academic.assessmentTypes[0]?.weight ?? 40);
      const examMax = classGroupProfile?.examWeight ?? Number(activeConfig.config.academic.assessmentTypes[1]?.weight ?? 60);

      if (entry.caScore > caMax) {
        errors.push({ studentId: entry.studentId, error: `CA score cannot exceed ${caMax}` });
        continue;
      }
      if (entry.examScore > examMax) {
        errors.push({ studentId: entry.studentId, error: `Exam score cannot exceed ${examMax}` });
        continue;
      }

      const total = entry.caScore + entry.examScore;
      const gradingSource = classGroupProfile?.gradeBands?.length
        ? classGroupProfile.gradeBands
        : activeConfig.config.academic.gradingSystem;
      const bands = gradingSource.map((band) => ({
        min: Number(band.min),
        grade: band.grade,
        gpa: Number(band.gpa),
      }));
      const grade = calculateGradeFromBands(total, bands);

      await prisma.score.upsert({
        where: {
          studentId_subjectId_termId_sessionId: {
            studentId: entry.studentId,
            subjectId,
            termId: context.termId!,
            sessionId: context.sessionId!,
          },
        },
        update: {
          teacherId: teacher?.id ?? null,
          caScore: entry.caScore,
          examScore: entry.examScore,
          total,
          grade: grade.grade,
          gpa: grade.gpa,
        },
        create: {
          schoolId,
          studentId: entry.studentId,
          subjectId,
          teacherId: teacher?.id ?? null,
          termId: context.termId!,
          sessionId: context.sessionId!,
          caScore: entry.caScore,
          examScore: entry.examScore,
          total,
          grade: grade.grade,
          gpa: grade.gpa,
        },
      });
      saved++;
    } catch (err) {
      errors.push({
        studentId: entry.studentId,
        error: err instanceof Error ? err.message : "Failed to save",
      });
    }
  }

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: "SCORE_BATCH_SAVED",
    targetType: "Score",
    targetId: String(subjectId),
    metadata: {
      subjectId,
      saved,
      errors: errors.length,
    },
  });

  return NextResponse.json({ ok: true, saved, errors });
}
