import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const createSchema = z.object({
  name: z.string().min(1).max(50),
  classGroupId: z.string().min(5).optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  const [classes, classGroups, teachers, subjects] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      include: {
        classGroup: true,
        teacher: { include: { user: true } },
        arms: { orderBy: { name: "asc" } },
        students: { include: { user: true } },
        subjects: true,
      },
      orderBy: [{ createdAt: "desc" }],
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
    prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    classes: classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      classGroupId: cls.classGroupId,
      classGroupName: cls.classGroup?.name ?? null,
      teacherId: cls.teacherId,
      teacherName: cls.teacher?.user.name ?? null,
      arms: cls.arms?.map((a: any) => ({ id: a.id, name: a.name, isActive: a.isActive })) ?? [],
      students: cls.students?.map((s: any) => ({ id: s.id, name: s.user?.name })) ?? [],
      subjects: cls.subjects?.map((s: any) => ({ id: s.id, name: s.name })) ?? [],
      studentCount: cls.students.length,
      createdAt: cls.createdAt.toISOString(),
    })),
    classGroups: classGroups.map((g) => ({ id: g.id, name: g.name })),
    teachers: teachers.map((t) => ({ id: t.id, name: t.user.name })),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
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

  // Check if class name already exists
  const existing = await prisma.class.findFirst({
    where: { name: data.name, schoolId },
  });
  if (existing) {
    return NextResponse.json({ error: "Class name already exists" }, { status: 409 });
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

  try {
    const cls = await prisma.class.create({
      data: {
        schoolId,
        name: data.name.trim(),
        classGroupId: data.classGroupId ?? null,
      },
      include: {
        classGroup: true,
        arms: true,
        students: true,
        subjects: true,
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "CLASS_CREATED",
      targetType: "Class",
      targetId: cls.id,
      metadata: {
        classId: cls.id,
        name: data.name,
        classGroupId: data.classGroupId,
      },
    });

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        classGroupId: cls.classGroupId,
        classGroupName: cls.classGroup?.name ?? null,
        arms: [],
        students: [],
        subjects: [],
        studentCount: 0,
        createdAt: cls.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create class";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
