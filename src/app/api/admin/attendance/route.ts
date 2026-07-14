import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { AttendanceStatus } from "@/lib/db-types";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const querySchema = z.object({
  date: z.string().optional(),
  classId: z.coerce.number().int().positive().optional(),
  studentId: z.coerce.number().int().positive().optional(),
  sessionId: z.coerce.number().int().positive().optional(),
  termId: z.coerce.number().int().positive().optional(),
});

const createSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  classId: z.coerce.number().int().positive().optional(),
  date: z.string(),
  status: z.nativeEnum(AttendanceStatus),
  sessionId: z.coerce.number().int().positive().optional(),
  termId: z.coerce.number().int().positive().optional(),
});

const bulkSchema = z.object({
  records: z.array(
    z.object({
      studentId: z.coerce.number().int().positive(),
      status: z.nativeEnum(AttendanceStatus),
    })
  ),
  classId: z.coerce.number().int().positive(),
  date: z.string(),
  sessionId: z.coerce.number().int().positive().optional(),
  termId: z.coerce.number().int().positive().optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "attendance");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const url = new URL(request.url);
  
  const parsedQuery = querySchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
    classId: url.searchParams.get("classId") ?? undefined,
    studentId: url.searchParams.get("studentId") ?? undefined,
    sessionId: url.searchParams.get("sessionId") ?? undefined,
    termId: url.searchParams.get("termId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.flatten() }, { status: 400 });
  }

  const { date, classId, studentId, sessionId, termId } = parsedQuery.data;

  // Get default session/term if not provided
  let effectiveSessionId = sessionId;
  let effectiveTermId = termId;

  if (!effectiveSessionId || !effectiveTermId) {
    const currentSession = await prisma.session.findFirst({
      where: { schoolId, isCurrent: true },
    });
    const currentTerm = await prisma.term.findFirst({
      where: { schoolId, isCurrent: true },
    });
    effectiveSessionId = effectiveSessionId ?? currentSession?.id;
    effectiveTermId = effectiveTermId ?? currentTerm?.id;
  }

  const [attendanceRecords, classes, students, sessions, terms] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        schoolId,
        ...(date ? { date: new Date(date) } : {}),
        ...(classId ? { classId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(effectiveSessionId ? { sessionId: effectiveSessionId } : {}),
        ...(effectiveTermId ? { termId: effectiveTermId } : {}),
      },
      include: {
        student: { include: { user: true, class: true } },
        class: true,
        teacher: { include: { user: true } },
        session: true,
        term: true,
      },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.class.findMany({
      where: { schoolId },
      include: { students: { include: { user: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { schoolId },
      include: { user: true, class: true },
      orderBy: { id: "asc" },
    }),
    prisma.session.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.term.findMany({
      where: { schoolId },
      include: { session: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    attendance: attendanceRecords.map((a: any) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: [a.student.firstName, a.student.middleName, a.student.lastName].filter(Boolean).join(" ") || a.student.user.name,
      termId: a.termId,
      termName: a.term?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    classes: classes.map((c: any) => ({
      id: c.id,
      name: c.name,
      students: c.students?.map((s: any) => ({ id: s.id, name: s.user?.name })) ?? [],
    })),
    students: students.map((s: any) => ({
      id: s.id,
      name: s.user?.name,
      classId: s.classId,
      className: s.class?.name ?? null,
    })),
    sessions: sessions.map((s: any) => ({ id: s.id, name: s.name, isCurrent: s.isCurrent })),
    terms: terms.map((t: any) => ({
      id: t.id,
      name: t.name,
      sessionId: t.sessionId,
      sessionName: t.session.name,
      isCurrent: t.isCurrent,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "attendance");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const payload = await request.json();

  // Check if this is a bulk request
  const bulkParsed = bulkSchema.safeParse(payload);
  if (bulkParsed.success) {
    return handleBulkAttendance(bulkParsed.data, schoolId, Number(session.user.id));
  }

  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Validate student
  const student = await prisma.student.findFirst({
    where: { id: data.studentId, schoolId },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Validate class if provided
  if (data.classId) {
    const classExists = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
    });
    if (!classExists) {
      return NextResponse.json({ error: "Invalid class selected" }, { status: 400 });
    }
  }

  // Get default session/term if not provided
  let effectiveSessionId = data.sessionId;
  let effectiveTermId = data.termId;

  if (!effectiveSessionId || !effectiveTermId) {
    const currentSession = await prisma.session.findFirst({
      where: { schoolId, isCurrent: true },
    });
    const currentTerm = await prisma.term.findFirst({
      where: { schoolId, isCurrent: true },
    });
    effectiveSessionId = effectiveSessionId ?? currentSession?.id;
    effectiveTermId = effectiveTermId ?? currentTerm?.id;
  }

  if (!effectiveSessionId || !effectiveTermId) {
    return NextResponse.json({ error: "No active session/term found. Please select a session and term." }, { status: 400 });
  }

  try {
    // Check if attendance record already exists for this student/date
    const existing = await prisma.attendance.findFirst({
      where: {
        schoolId,
        studentId: data.studentId,
        date: new Date(data.date),
        sessionId: effectiveSessionId,
        termId: effectiveTermId,
      },
    });

    let attendance;
    if (existing) {
      // Update existing
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: data.status,
          classId: data.classId ?? student.classId,
          teacherId: Number(session.user.id),
        },
        include: {
          student: { include: { user: true, class: true } },
          class: true,
          session: true,
          term: true,
        },
      });
    } else {
      // Create new
      attendance = await prisma.attendance.create({
        data: {
          schoolId,
          studentId: data.studentId,
          classId: data.classId ?? student.classId,
          sessionId: effectiveSessionId,
          termId: effectiveTermId,
          date: new Date(data.date),
          status: data.status,
          teacherId: Number(session.user.id),
        },
        include: {
          student: { include: { user: true, class: true } },
          class: true,
          session: true,
          term: true,
        },
      });
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: existing ? "ATTENDANCE_UPDATED" : "ATTENDANCE_CREATED",
      targetType: "Attendance",
      targetId: attendance.id,
      metadata: {
        attendanceId: attendance.id,
        studentId: data.studentId,
        date: data.date,
        status: data.status,
      },
    });

    return NextResponse.json({
      attendance: {
        id: attendance.id,
        studentId: attendance.studentId,
        studentName: [attendance.student.firstName, attendance.student.middleName, attendance.student.lastName].filter(Boolean).join(" ") || attendance.student.user.name,
        studentClass: attendance.student.class?.name ?? attendance.class?.name ?? null,
        classId: attendance.classId,
        className: attendance.class?.name ?? null,
        date: attendance.date.toISOString().split("T")[0],
        status: attendance.status,
        sessionId: attendance.sessionId,
        sessionName: attendance.session?.name ?? null,
        termId: attendance.termId,
        termName: attendance.term?.name ?? null,
      },
    }, { status: existing ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save attendance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleBulkAttendance(
  data: {
    records: { studentId: number; status: AttendanceStatus }[];
    classId: number;
    date: string;
    sessionId?: number;
    termId?: number;
  },
  schoolId: string,
  userId: number
) {
  // Validate class
  const classExists = await prisma.class.findFirst({
    where: { id: data.classId, schoolId },
  });
  if (!classExists) {
    return NextResponse.json({ error: "Invalid class selected" }, { status: 400 });
  }

  // Get default session/term if not provided
  let effectiveSessionId = data.sessionId;
  let effectiveTermId = data.termId;

  if (!effectiveSessionId || !effectiveTermId) {
    const currentSession = await prisma.session.findFirst({
      where: { schoolId, isCurrent: true },
    });
    const currentTerm = await prisma.term.findFirst({
      where: { schoolId, isCurrent: true },
    });
    effectiveSessionId = effectiveSessionId ?? currentSession?.id;
    effectiveTermId = effectiveTermId ?? currentTerm?.id;
  }

  if (!effectiveSessionId || !effectiveTermId) {
    return NextResponse.json({ error: "No active session/term found. Please select a session and term." }, { status: 400 });
  }

  const targetDate = new Date(data.date);
  const results = [];

  try {
    for (const record of data.records) {
      // Validate student
      const student = await prisma.student.findFirst({
        where: { id: record.studentId, schoolId },
      });
      if (!student) continue;

      // Check if attendance record already exists
      const existing = await prisma.attendance.findFirst({
        where: {
          schoolId,
          studentId: record.studentId,
          date: targetDate,
          sessionId: effectiveSessionId,
          termId: effectiveTermId,
        },
      });

      let attendance;
      if (existing) {
        attendance = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: record.status,
            classId: data.classId,
            teacherId: Number(userId),
          },
          include: {
            student: { include: { user: true } },
            class: true,
          },
        });
      } else {
        attendance = await prisma.attendance.create({
          data: {
            schoolId,
            studentId: record.studentId,
            classId: data.classId,
            sessionId: effectiveSessionId,
            termId: effectiveTermId,
            date: targetDate,
            status: record.status,
            teacherId: Number(userId),
          },
          include: {
            student: { include: { user: true } },
            class: true,
          },
        });
      }

      results.push({
        id: attendance.id,
        studentId: attendance.studentId,
        studentName: [attendance.student.firstName, attendance.student.middleName, attendance.student.lastName].filter(Boolean).join(" ") || attendance.student.user.name,
        status: attendance.status,
      });
    }

    await createAuditLog({
      schoolId,
      actorUserId: userId,
      action: "ATTENDANCE_BULK_MARKED",
      targetType: "Attendance",
      targetId: null,
      metadata: {
        classId: data.classId,
        date: data.date,
        recordCount: results.length,
      },
    });

    return NextResponse.json({
      ok: true,
      count: results.length,
      records: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save attendance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
