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
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "REGISTRAR"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "parents");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";

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
    parents: parents.map((parent: any) => ({
      id: parent.id,
      userId: parent.userId,
      title: parent.title ?? "",
      name: [parent.title, parent.user.name].filter(Boolean).join(" "),
      email: parent.user.email,
      isActive: parent.user.isActive,
      createdAt: parent.createdAt.toISOString(),
      children: parent.students?.map((s: any) => ({
        id: s.id,
        name: s.user?.name,
      })) ?? [],
    })),
    unlinkedStudents: students
      .filter((s: any) => !s.parentId)
      .map((s: any) => ({ id: s.id, name: s.user.name })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "parents");
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
    // Get PARENT role
    const parentRole = await prisma.role.findUnique({
      where: { name: "PARENT" },
    });
    if (!parentRole) {
      return NextResponse.json({ error: "Parent role not found" }, { status: 500 });
    }

    // Hash password
    const plaintextPassword = data.password || data.email.split("@")[0] + "123";
    const hashedPassword = await hashPassword(plaintextPassword);

    // Create user and parent in transaction
    const result = (await prisma.$transaction(async (tx: any) => {
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
      targetId: String(result.parent.id),
      metadata: {
        parentId: result.parent.id,
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
        role: "Parent",
      });
      emailStatus = { sent: emailResult.ok, error: emailResult.ok ? undefined : (emailResult as any).error ?? "Email delivery failed" };
    } catch (error) {
      emailStatus = {
        sent: false,
        error: error instanceof Error ? error.message : "Email delivery failed",
      };
    }

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
      emailStatus,
      message: emailStatus.sent
        ? "Parent created and welcome email sent."
        : "Parent created, but welcome email could not be delivered. Please resend credentials manually.",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create parent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
