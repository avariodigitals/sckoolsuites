import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  classId: z.coerce.number().optional().nullable(),
  classGroupId: z.coerce.number().optional().nullable(),
  teacherId: z.coerce.number().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "subjects");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";

  const [subjects, classes, classGroups, teachers] = await Promise.all([
    prisma.subject.findMany({
      where: { schoolId },
      include: {
        class: true,
        classGroup: true,
        teacher: { include: { user: true } },
      },
      orderBy: [{ name: "asc" }],
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
    prisma.classGroup.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { id: "asc" },
    }),
  ]);

  return NextResponse.json({
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      classId: s.classId,
      className: s.class?.name ?? null,
      classGroupId: s.classGroupId,
      classGroupName: s.classGroup?.name ?? null,
      teacherId: s.teacherId,
      teacherName: s.teacher?.user.name ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    classGroups: classGroups.map((g) => ({ id: g.id, name: g.name })),
    teachers: teachers.map((t) => ({ id: t.id, name: t.user.name })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "subjects");
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

  const schoolId = session.user.schoolId || "default";
  const data = parsed.data;

  // Check if subject name already exists
  const existing = await prisma.subject.findFirst({
    where: { name: data.name, schoolId },
  });
  if (existing) {
    return NextResponse.json({ error: "Subject name already exists" }, { status: 409 });
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

  // Validate class group if provided
  if (data.classGroupId) {
    const groupExists = await prisma.classGroup.findFirst({
      where: { id: data.classGroupId, schoolId },
    });
    if (!groupExists) {
      return NextResponse.json({ error: "Invalid class group selected" }, { status: 400 });
    }
  }

  // Validate teacher if provided
  if (data.teacherId) {
    const teacherExists = await prisma.teacher.findFirst({
      where: { id: data.teacherId, schoolId },
    });
    if (!teacherExists) {
      return NextResponse.json({ error: "Invalid teacher selected" }, { status: 400 });
    }
  }

  try {
    const subject = await prisma.subject.create({
      data: {
        schoolId,
        name: data.name.trim(),
        classId: data.classId ?? null,
        classGroupId: data.classGroupId ?? null,
        teacherId: data.teacherId ?? null,
      },
      include: {
        class: true,
        classGroup: true,
        teacher: { include: { user: true } },
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "SUBJECT_CREATED",
      targetType: "Subject",
      targetId: String(subject.id),
      metadata: {
        subjectId: subject.id,
        name: data.name,
        classId: data.classId,
        classGroupId: data.classGroupId,
        teacherId: data.teacherId,
      },
    });

    return NextResponse.json({
      subject: {
        id: subject.id,
        name: subject.name,
        classId: subject.classId,
        className: subject.class?.name ?? null,
        classGroupId: subject.classGroupId,
        classGroupName: subject.classGroup?.name ?? null,
        teacherId: subject.teacherId,
        teacherName: subject.teacher?.user.name ?? null,
        createdAt: subject.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create subject";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
