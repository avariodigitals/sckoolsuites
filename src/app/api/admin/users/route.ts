import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkPrivilege } from "@/lib/privileges";
import { createAuditLog } from "@/lib/audit-log";
import { hashPassword } from "@/auth";
import { humanizeEnum } from "@/lib/utils";
import { parseNumericId } from "@/lib/id-helpers";
import { sendWelcomeEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

const updateSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  roleId: z.coerce.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(6).max(100).optional(),
  roleId: z.coerce.number().int().min(1),
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd + "@1";
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    console.log("[users API] session user id:", session.user.id, "type:", typeof session.user.id);

    const allowed = await checkPrivilege(session.user.id, "users.view");
    console.log("[users API] checkPrivilege result:", allowed);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    console.log("[users API] found users:", users.length);

    const roleIds = [...new Set(users.map((u) => u.roleId).filter(Boolean))];
    const roles = roleIds.length ? await prisma.role.findMany({ where: { id: { in: roleIds as number[] } } }) : [];
    const roleById = new Map(roles.map((r) => [r.id, r] as [number, typeof r]));

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        roleId: u.roleId,
        roleName: humanizeEnum(roleById.get(u.roleId)?.name),
        avatarUrl: u.avatarUrl ?? null,
        isActive: u.isActive,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[users API] ERROR:", message, err instanceof Error ? err.stack : "");
    return NextResponse.json({ error: message ?? "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "users.manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const plaintextPassword = data.password || generateTempPassword();
  const hashed = await hashPassword(plaintextPassword);
  const user = await prisma.user.create({
    data: {
      schoolId,
      name: data.name.trim(),
      email: data.email.trim(),
      password: hashed,
      roleId: role.id,
      isActive: true,
      mustChangePassword: true,
    },
  });

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: "USER_CREATED",
    targetType: "User",
    targetId: String(user.id),
    metadata: { userId: user.id, name: user.name, email: user.email, roleId: role.id },
  });

  let emailStatus: { sent: boolean; error?: string } = { sent: false };
  try {
    const emailResult = await sendWelcomeEmail({
      schoolId,
      to: data.email,
      userName: data.name,
      email: data.email,
      password: plaintextPassword,
      role: role.name,
    });
    emailStatus = { sent: emailResult.ok, error: emailResult.ok ? undefined : (emailResult as any).error ?? "Email delivery failed" };
  } catch (error) {
    emailStatus = {
      sent: false,
      error: error instanceof Error ? error.message : "Email delivery failed",
    };
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: role.name,
      isActive: user.isActive,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    },
    emailStatus,
    message: emailStatus.sent
      ? "User created and welcome email sent."
      : "User created, but welcome email could not be delivered. Use Resend to send credentials manually.",
  }, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "users.manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rawId = parsed.data.id;
  if (!rawId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let id: number;
  try {
    id = parseNumericId(String(rawId), "user id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid user id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id: _id, ...data } = parsed.data;
  const updateData: Prisma.UserUncheckedUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.email !== undefined) updateData.email = data.email.trim();
  if (data.roleId !== undefined) updateData.roleId = data.roleId;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  const updatedRole = user.roleId ? await prisma.role.findUnique({ where: { id: user.roleId } }) : null;

  await createAuditLog({
    schoolId: "default",
    actorUserId: session.user.id,
    action: "USER_UPDATED",
    targetType: "User",
    targetId: String(user.id),
    metadata: { userId: user.id, updates: data },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: updatedRole?.name ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    },
  });
}
