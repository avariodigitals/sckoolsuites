import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { sendWelcomeEmail } from "@/lib/email";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
  designation: z.string().optional().nullable(),
  reportsToId: z.number().int().optional().nullable(),
  classGroupId: z.number().int().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd + "@1";
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "teachers");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";

  const [teachers, classes, subjects, classGroups] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId },
      include: {
        user: true,
        classes: true,
        subjects: true,
        students: { include: { user: true } },
        reportsTo: { include: { user: true } },
        classGroup: true,
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
    prisma.classGroup.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    teachers: teachers.map((teacher: any) => ({
      id: teacher.id,
      userId: teacher.userId,
      name: teacher.user.name,
      email: teacher.user.email,
      isActive: teacher.user.isActive,
      createdAt: teacher.createdAt.toISOString(),
      assignedClasses: teacher.classes?.map((c: any) => ({ id: c.id, name: c.name })) ?? [],
      assignedSubjects: teacher.subjects?.map((s: any) => ({ id: s.id, name: s.name })) ?? [],
      studentCount: teacher.students.length,
      designation: teacher.designation ?? null,
      reportsTo: teacher.reportsTo ? { id: teacher.reportsTo.id, name: teacher.reportsTo.user.name } : null,
      classGroupId: teacher.classGroupId ?? null,
      classGroupName: teacher.classGroup?.name ?? null,
    })),
    unassignedClasses: classes
      .filter((c: any) => !c.teacherId)
      .map((c: any) => ({ id: c.id, name: c.name })),
    unassignedSubjects: subjects
      .filter((s: any) => !s.teacherId)
      .map((s: any) => ({ id: s.id, name: s.name })),
    allClasses: classes.map((c: any) => ({ id: c.id, name: c.name })),
    allSubjects: subjects.map((s: any) => ({ id: s.id, name: s.name })),
    classGroups: classGroups.map((cg: any) => ({ id: cg.id, name: cg.name })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "teachers");
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
    const plaintextPassword = data.password || generateTempPassword();
    const hashedPassword = await hashPassword(plaintextPassword);

    // Create user and teacher in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          roleId: teacherRole.id,
          name: data.name,
          email: data.email,
          password: hashedPassword,
          isActive: data.isActive !== false,
          mustChangePassword: true,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          schoolId,
          userId: user.id,
          designation: data.designation || null,
          reportsToId: data.reportsToId || null,
          classGroupId: data.classGroupId || null,
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
      targetId: String(result.teacher.id),
      metadata: {
        teacherId: result.teacher.id,
        userId: result.user.id,
        name: data.name,
        email: data.email,
      },
    });

    // Send welcome email with login credentials
    let emailStatus: { sent: boolean; error?: string } = { sent: false };
    try {
      const emailResult = await sendWelcomeEmail({
        schoolId,
        to: data.email,
        userName: data.name,
        email: data.email,
        password: plaintextPassword,
        role: "Teacher",
      });
      emailStatus = { sent: emailResult.ok, error: emailResult.ok ? undefined : (emailResult as any).error ?? "Email delivery failed" };
    } catch (error) {
      emailStatus = {
        sent: false,
        error: error instanceof Error ? error.message : "Email delivery failed",
      };
    }

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
      emailStatus,
      message: emailStatus.sent
        ? "Teacher created and welcome email sent."
        : "Teacher created, but welcome email could not be delivered. Please resend credentials manually.",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create teacher";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
