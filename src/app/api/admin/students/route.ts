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
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  age: z.number().int().min(3).max(30),
  classId: z.string().min(5).optional().nullable(),
  parentId: z.string().min(5).optional().nullable(),
  sportHouse: z.string().max(50).optional().nullable(),
  coCurricular: z.string().max(200).optional().nullable(),
  responsibilities: z.string().max(200).optional().nullable(),
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

  const [students, classes, parents] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId },
      include: {
        user: true,
        class: true,
        parent: { include: { user: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.parent.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    students: students.map((student) => ({
      id: student.id,
      userId: student.userId,
      name: student.user.name,
      email: student.user.email,
      gender: student.gender,
      age: student.age,
      classId: student.classId,
      className: student.class?.name ?? null,
      parentId: student.parentId,
      parentName: student.parent?.user.name ?? null,
      sportHouse: student.sportHouse,
      coCurricular: student.coCurricular,
      responsibilities: student.responsibilities,
      passportUrl: student.passportUrl,
      isActive: student.user.isActive,
      createdAt: student.createdAt.toISOString(),
    })),
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    parents: parents.map((p) => ({ id: p.id, name: p.user.name, email: p.user.email })),
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

  // Validate class if provided
  if (data.classId) {
    const classExists = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
    });
    if (!classExists) {
      return NextResponse.json({ error: "Invalid class selected" }, { status: 400 });
    }
  }

  // Validate parent if provided
  if (data.parentId) {
    const parentExists = await prisma.parent.findFirst({
      where: { id: data.parentId, schoolId },
    });
    if (!parentExists) {
      return NextResponse.json({ error: "Invalid parent selected" }, { status: 400 });
    }
  }

  try {
    // Get STUDENT role
    const studentRole = await prisma.role.findUnique({
      where: { name: "STUDENT" },
    });
    if (!studentRole) {
      return NextResponse.json({ error: "Student role not found" }, { status: 500 });
    }

    // Hash password (use provided or default to email local part)
    const password = data.password || data.email.split("@")[0] + "123";
    const hashedPassword = await hashPassword(password);

    // Create user and student in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          roleId: studentRole.id,
          name: data.name,
          email: data.email,
          password: hashedPassword,
          isActive: true,
        },
      });

      const student = await tx.student.create({
        data: {
          schoolId,
          userId: user.id,
          parentId: data.parentId ?? null,
          classId: data.classId ?? null,
          gender: data.gender,
          age: data.age,
          sportHouse: data.sportHouse?.trim() || null,
          coCurricular: data.coCurricular?.trim() || null,
          responsibilities: data.responsibilities?.trim() || null,
        },
      });

      return { user, student };
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "STUDENT_CREATED",
      targetType: "Student",
      targetId: result.student.id,
      metadata: {
        studentId: result.student.id,
        userId: result.user.id,
        name: data.name,
        email: data.email,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    return NextResponse.json({
      student: {
        id: result.student.id,
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        gender: result.student.gender,
        age: result.student.age,
        classId: result.student.classId,
        parentId: result.student.parentId,
        isActive: true,
        createdAt: result.student.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create student";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
