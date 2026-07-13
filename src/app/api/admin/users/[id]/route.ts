import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkPrivilege } from "@/lib/privileges";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";
import { resendUserCredentials } from "@/lib/email";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "users.manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: rawId } = await params;

  let id: number;
  try {
    id = parseNumericId(rawId, "user id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid user id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (id === Number(session.user.id)) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      schoolId: existing.schoolId ?? "default",
      actorUserId: session.user.id,
      action: "USER_DEACTIVATED",
      targetType: "User",
      targetId: String(id),
      metadata: { userId: id, name: existing.name, email: existing.email },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to deactivate user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkPrivilege(session.user.id, "users.manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: rawId } = await params;

  let id: number;
  try {
    id = parseNumericId(rawId, "user id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid user id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const schoolId = existing.schoolId ?? "default";

  try {
    const result = await resendUserCredentials({
      userId: id,
      role: existing.role?.name ?? "User",
      schoolId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to resend credentials" }, { status: 500 });
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "USER_CREDENTIALS_RESENT",
      targetType: "User",
      targetId: String(id),
      metadata: { userId: id, email: existing.email },
    });

    return NextResponse.json({ ok: true, message: "Welcome email resent with new temporary password." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resend credentials";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
