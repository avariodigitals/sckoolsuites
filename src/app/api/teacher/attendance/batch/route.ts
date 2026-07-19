import { AttendanceStatus } from "@/lib/db-types";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";

const entrySchema = z.object({
  studentId: z.coerce.number().int().min(1),
  status: z.nativeEnum(AttendanceStatus),
});

const schema = z.object({
  classId: z.coerce.number().int().min(1),
  date: z.string().min(8),
  entries: z.array(entrySchema).min(1),
});

const calendarService = new AcademicCalendarService();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = new Set(["TEACHER", "CLASS_ASSISTANT", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"]);
  if (!allowedRoles.has(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const isAdmin = ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(session.user.role);

  const teacher = isAdmin
    ? null
    : await prisma.teacher.findFirst({ where: { schoolId, userId: session.user.id } });
  if (!isAdmin && !teacher) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  const classRecord = await prisma.class.findFirst({
    where: { id: parsed.data.classId, schoolId },
  });
  if (!classRecord) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }
  if (!isAdmin && classRecord.teacherId !== teacher?.id) {
    return NextResponse.json({ error: "You can only record attendance for your assigned classes" }, { status: 403 });
  }

  const context = await calendarService.getUserContext(schoolId, session.user.id);
  if (!context.sessionId || !context.termId) {
    return NextResponse.json({ error: "Academic context is not selected" }, { status: 400 });
  }

  const date = new Date(parsed.data.date);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid attendance date" }, { status: 400 });
  }

  // Verify all students belong to this class
  const studentIds = parsed.data.entries.map((e) => e.studentId);
  const classStudents = await prisma.student.findMany({
    where: { id: { in: studentIds }, schoolId, classId: parsed.data.classId },
    select: { id: true },
  });
  const validStudentIds = new Set(classStudents.map((s) => s.id));

  const validEntries = parsed.data.entries.filter((e) => validStudentIds.has(e.studentId));
  if (validEntries.length === 0) {
    return NextResponse.json({ error: "No valid students found in this class" }, { status: 400 });
  }

  // Check existing attendance records for this date/class
  const existingRecords = await prisma.attendance.findMany({
    where: {
      schoolId,
      classId: parsed.data.classId,
      sessionId: context.sessionId,
      termId: context.termId,
      date,
      studentId: { in: validEntries.map((e) => e.studentId) },
    },
  });
  const existingMap = new Map(existingRecords.map((r) => [r.studentId, r]));

  let saved = 0;
  const errors: Array<{ studentId: number; error: string }> = [];

  for (const entry of validEntries) {
    try {
      const existing = existingMap.get(entry.studentId);
      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: { status: entry.status, teacherId: teacher?.id ?? null },
        });
      } else {
        await prisma.attendance.create({
          data: {
            schoolId,
            studentId: entry.studentId,
            classId: parsed.data.classId,
            teacherId: teacher?.id ?? null,
            sessionId: context.sessionId!,
            termId: context.termId!,
            date,
            status: entry.status,
          },
        });
      }
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
    action: "ATTENDANCE_BATCH_SAVED",
    targetType: "Attendance",
    targetId: parsed.data.classId,
    metadata: {
      classId: parsed.data.classId,
      date: date.toISOString(),
      saved,
      errors: errors.length,
    },
  });

  return NextResponse.json({ ok: true, saved, errors });
}
