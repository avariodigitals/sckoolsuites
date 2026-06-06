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

  const [parents, students] = await Promise.all([
    prisma.parent.findMany({
      where: { schoolId },
      include: {
        user: true,
        students: { include: { user: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.student.findMany({
      where: { schoolId },
      include: { user: true, parent: true },
      orderBy: { id: "asc" },
    }),
  ]);

  return NextResponse.json({
    parents: parents.map((parent) => ({
      id: parent.id,
      userId: parent.userId,
      name: parent.user.name,
      email: parent.user.email,
      isActive: parent.user.isActive,
      createdAt: parent.createdAt.toISOString(),
      children: parent.students?.map((s: any) => ({
        id: s.id,
        name: s.user?.name,
      })) ?? [],
    })),
    unlinkedStudents: students
      .filter((s) => !s.parentId)
      .map((s) => ({ id: s.id, name: s.user.name })),
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
    // Get PARENT role
    const parentRole = await prisma.role.findUnique({
      where: { name: "PARENT" },
    });
    if (!parentRole) {
      return NextResponse.json({ error: "Parent role not found" }, { status: 500 });
    }

    // Hash password
    const password = data.password || data.email.split("@")[0] + "123";
    const hashedPassword = await hashPassword(password);

    // Create user and parent in transaction
    const result = (await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          roleId: parentRole.id,
          name: data.name,
          email: data.email,
          password: hashedPassword,
          isActive: data.isActive !== false,
        },
      });

      const parent = await tx.parent.create({
        data: {
          schoolId,
          userId: user.id,
        },
        include: {
          user: true,
          students: { include: { user: true } },
        },
      });

      return { user, parent };
    })) as { user: any; parent: any };

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "PARENT_CREATED",
      targetType: "Parent",
      targetId: result.parent.id,
      metadata: {
        parentId: result.parent.id,
        userId: result.user.id,
        name: data.name,
        email: data.email,
      },
    });

    return NextResponse.json({
      parent: {
        id: result.parent.id,
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        isActive: true,
        createdAt: result.parent.createdAt.toISOString(),
        children: [],
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create parent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
