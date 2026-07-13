import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";
import { resendUserCredentials } from "@/lib/email";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "parents");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;

  let parentId: number;
  try {
    parentId = parseNumericId(rawId, "parent id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid parent ID";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  const parent = await prisma.parent.findFirst({
    where: { id: parentId, schoolId },
    include: { user: true },
  });
  if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });

  try {
    const result = await resendUserCredentials({
      userId: parent.userId,
      role: "Parent",
      schoolId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to resend credentials" }, { status: 500 });
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "PARENT_CREDENTIALS_RESENT",
      targetType: "Parent",
      targetId: String(parentId),
      metadata: { parentId, userId: parent.userId, email: parent.user.email },
    });

    return NextResponse.json({ ok: true, message: "Welcome email resent with new temporary password." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resend credentials";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
