import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
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

  const [teachers, classes, subjects] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId },
      include: {
        user: true,
        classes: true,
        subjects: true,
        students: { include: { user: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.class.findMany({
      where: { schoolId },
      include: { teacher: { include: { user: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      where: { schoolId },
      include: { teacher: { include: { user: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      userId: teacher.userId,
      name: teacher.user.name,
      email: teacher.user.email,
      isActive: teacher.user.isActive,
      createdAt: teacher.createdAt.toISOString(),
      assignedClasses: teacher.classes?.map((c: any) => ({ id: c.id, name: c.name })) ?? [],
      assignedSubjects: teacher.subjects?.map((s: any) => ({ id: s.id, name: s.name })) ?? [],
      studentCount: teacher.students.length,
    })),
    unassignedClasses: classes
      .filter((c) => !c.teacherId)
      .map((c) => ({ id: c.id, name: c.name })),
    unassignedSubjects: subjects
      .filter((s) => !s.teacherId)
      .map((s) => ({ id: s.id, name: s.name })),
    allClasses: classes.map((c) => ({ id: c.id, name: c.name })),
    allSubjects: subjects.map((s) => ({ id: s.id, name: s.name })),
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

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  try {
    // Get TEACHER role
    const teacherRole = await prisma.role.findUnique({
      where: { name: "TEACHER" },
    });
    if (!teacherRole) {
      return NextResponse.json({ error: "Teacher role not found" }, { status: 500 });
    }

    // Hash password
    const password = data.password || data.email.split("@")[0] + "123";
    const hashedPassword = await hashPassword(password);

    // Create user and teacher in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          roleId: teacherRole.id,
          name: data.name,
          email: data.email,
          password: hashedPassword,
          isActive: data.isActive !== false,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          schoolId,
          userId: user.id,
        },
        include: {
          user: true,
          classes: true,
          subjects: true,
          students: true,
        },
      });

      return { user, teacher };
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "TEACHER_CREATED",
      targetType: "Teacher",
      targetId: result.teacher.id,
      metadata: {
        teacherId: result.teacher.id,
        userId: result.user.id,
        name: data.name,
        email: data.email,
      },
    });

    return NextResponse.json({
      teacher: {
        id: result.teacher.id,
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        isActive: result.user.isActive,
        createdAt: result.teacher.createdAt.toISOString(),
        assignedClasses: [],
        assignedSubjects: [],
        studentCount: 0,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create teacher";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
