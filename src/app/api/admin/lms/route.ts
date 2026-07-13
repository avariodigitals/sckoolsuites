import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const querySchema = z.object({
  type: z.enum(["lessons", "assignments", "quizzes", "online-classes"]).optional(),
  subjectId: z.string().optional(),
  classId: z.string().optional(),
});

// Schema matching actual Prisma models
const lessonSchema = z.object({
  type: z.literal("lesson"),
  subjectId: z.string().min(5),
  teacherId: z.string().min(5),
  classId: z.string().min(5).optional(),
  title: z.string().min(1).max(200),
  note: z.string().max(10000).optional(),
});

const assignmentSchema = z.object({
  type: z.literal("assignment"),
  subjectId: z.string().min(5).optional(),
  teacherId: z.string().min(5),
  classId: z.string().min(5).optional(),
  lessonId: z.string().min(5).optional(),
  title: z.string().min(1).max(200),
  instruction: z.string().max(5000),
  dueDate: z.string(),
});

const quizSchema = z.object({
  type: z.literal("quiz"),
  subjectId: z.string().min(5).optional(),
  teacherId: z.string().min(5),
  classId: z.string().min(5).optional(),
  title: z.string().min(1).max(200),
  instruction: z.string().max(5000).optional(),
  totalMarks: z.number().min(1).max(1000).default(100),
  dueDate: z.string().optional(),
});

const onlineClassSchema = z.object({
  type: z.literal("online-class"),
  subjectId: z.string().min(5).optional(),
  teacherId: z.string().min(5),
  classId: z.string().min(5).optional(),
  title: z.string().min(1).max(200),
  platform: z.string().max(100).optional(),
  meetingLink: z.string().max(500).optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
});

const createSchema = z.union([lessonSchema, assignmentSchema, quizSchema, onlineClassSchema]);

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "lms");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";
  const url = new URL(request.url);
  
  const parsedQuery = querySchema.safeParse({
    type: url.searchParams.get("type") ?? undefined,
    subjectId: url.searchParams.get("subjectId") ?? undefined,
    classId: url.searchParams.get("classId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.flatten() }, { status: 400 });
  }

  const { type, subjectId, classId } = parsedQuery.data;

  // Get all reference data
  const [subjects, classes, teachers] = await Promise.all([
    prisma.subject.findMany({
      where: { schoolId },
      include: { class: true, teacher: { include: { user: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { id: "asc" },
    }),
  ]);

  // Get LMS content based on type filter
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let lessons: any[] = [];
  let assignments: any[] = [];
  let quizzes: any[] = [];
  let onlineClasses: any[] = [];
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const subjectFilter = subjectId ? { subjectId: parseInt(subjectId, 10) } : {};
  const classFilter = classId ? { classId: parseInt(classId, 10) } : {};

  if (!type || type === "lessons") {
    lessons = await prisma.lesson.findMany({
      where: { schoolId, ...subjectFilter, ...classFilter },
      include: { subject: true, teacher: { include: { user: true } }, class: true },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  if (!type || type === "assignments") {
    assignments = await prisma.assignment.findMany({
      where: { schoolId, ...subjectFilter, ...classFilter },
      include: { subject: true, teacher: { include: { user: true } }, class: true, lesson: true },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  if (!type || type === "quizzes") {
    quizzes = await prisma.quiz.findMany({
      where: { schoolId, ...subjectFilter, ...classFilter },
      include: { subject: true, teacher: { include: { user: true } }, class: true },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  if (!type || type === "online-classes") {
    onlineClasses = await prisma.onlineClass.findMany({
      where: { schoolId, ...subjectFilter, ...classFilter },
      include: { subject: true, teacher: { include: { user: true } }, class: true },
      orderBy: [{ startTime: "desc" }],
    });
  }

  return NextResponse.json({
    lessons: lessons.map((l) => ({
      id: l.id,
      type: "lesson",
      subjectId: l.subjectId,
      subjectName: l.subject?.name ?? null,
      classId: l.classId,
      className: l.class?.name ?? null,
      teacherId: l.teacherId,
      teacherName: l.teacher?.user.name ?? null,
      title: l.title,
      note: l.note,
      createdAt: l.createdAt.toISOString(),
    })),
    assignments: assignments.map((a) => ({
      id: a.id,
      type: "assignment",
      subjectId: a.subjectId,
      subjectName: a.subject?.name ?? null,
      classId: a.classId,
      className: a.class?.name ?? null,
      lessonId: a.lessonId,
      lessonTitle: a.lesson?.title ?? null,
      teacherId: a.teacherId,
      teacherName: a.teacher?.user.name ?? null,
      title: a.title,
      instruction: a.instruction,
      dueDate: a.dueDate?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    quizzes: quizzes.map((q) => ({
      id: q.id,
      type: "quiz",
      subjectId: q.subjectId,
      subjectName: q.subject?.name ?? null,
      classId: q.classId,
      className: q.class?.name ?? null,
      teacherId: q.teacherId,
      teacherName: q.teacher?.user.name ?? null,
      title: q.title,
      instruction: q.instruction,
      totalMarks: q.totalMarks,
      dueDate: q.dueDate?.toISOString() ?? null,
      createdAt: q.createdAt.toISOString(),
    })),
    onlineClasses: onlineClasses.map((o: any) => ({
      id: o.id,
      type: "online-class",
      subjectId: o.subjectId,
      subjectName: o.subject?.name ?? null,
      classId: o.classId,
      className: o.class?.name ?? null,
      teacherId: o.teacherId,
      teacherName: o.teacher?.user.name ?? null,
      title: o.title,
      platform: o.platform,
      meetingLink: o.meetingLink,
      startTime: o.startTime.toISOString(),
      endTime: o.endTime?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
    subjects: subjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      classId: s.classId,
      className: s.class?.name ?? null,
      teacherId: s.teacherId,
      teacherName: s.teacher?.user.name ?? null,
    })),
    classes: classes.map((c: any) => ({ id: c.id, name: c.name })),
    teachers: teachers.map((t: any) => ({ id: t.id, name: t.user.name })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "lms");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  const teacherIdInt = parseInt(data.teacherId, 10);

  // Validate teacher
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherIdInt, schoolId },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  try {
    let result;
    let action: string;

    switch (data.type) {
      case "lesson":
        result = await prisma.lesson.create({
          data: {
            schoolId,
            subjectId: parseInt(data.subjectId, 10),
            teacherId: teacherIdInt,
            classId: data.classId ? parseInt(data.classId, 10) : null,
            title: data.title,
            note: data.note ?? "",
          },
          include: { subject: true, teacher: { include: { user: true } }, class: true },
        });
        action = "LESSON_CREATED";
        break;

      case "assignment":
        result = await prisma.assignment.create({
          data: {
            schoolId,
            subjectId: data.subjectId ? parseInt(data.subjectId, 10) : null,
            teacherId: teacherIdInt,
            classId: data.classId ? parseInt(data.classId, 10) : null,
            lessonId: data.lessonId ? parseInt(data.lessonId, 10) : null,
            title: data.title,
            instruction: data.instruction,
            dueDate: new Date(data.dueDate),
          },
          include: { subject: true, teacher: { include: { user: true } }, class: true, lesson: true },
        });
        action = "ASSIGNMENT_CREATED";
        break;

      case "quiz":
        result = await prisma.quiz.create({
          data: {
            schoolId,
            subjectId: data.subjectId ? parseInt(data.subjectId, 10) : null,
            teacherId: teacherIdInt,
            classId: data.classId ? parseInt(data.classId, 10) : null,
            title: data.title,
            instruction: data.instruction ?? null,
            totalMarks: data.totalMarks,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
          },
          include: { subject: true, teacher: { include: { user: true } }, class: true },
        });
        action = "QUIZ_CREATED";
        break;

      case "online-class":
        result = await prisma.onlineClass.create({
          data: {
            schoolId,
            subjectId: data.subjectId ? parseInt(data.subjectId, 10) : null,
            teacherId: teacherIdInt,
            classId: data.classId ? parseInt(data.classId, 10) : null,
            title: data.title,
            platform: data.platform ?? null,
            meetingLink: data.meetingLink ?? null,
            startTime: new Date(data.startTime),
            endTime: data.endTime ? new Date(data.endTime) : null,
          },
          include: { subject: true, teacher: { include: { user: true } }, class: true },
        });
        action = "ONLINE_CLASS_CREATED";
        break;
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action,
      targetType: "LMS",
      targetId: result.id,
      metadata: {
        id: result.id,
        type: data.type,
        subjectId: data.subjectId,
        title: data.title,
      },
    });

    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
