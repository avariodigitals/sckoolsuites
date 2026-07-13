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
  const allowed = await crudPrivilege(session, "POST", "teachers");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;

  let teacherId: number;
  try {
    teacherId = parseNumericId(rawId, "teacher id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid teacher ID";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    include: { user: true },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  try {
    const result = await resendUserCredentials({
      userId: teacher.userId,
      role: "Teacher",
      schoolId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to resend credentials" }, { status: 500 });
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "TEACHER_CREDENTIALS_RESENT",
      targetType: "Teacher",
      targetId: String(teacherId),
      metadata: { teacherId, userId: teacher.userId, email: teacher.user.email },
    });

    return NextResponse.json({ ok: true, message: "Welcome email resent with new temporary password." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resend credentials";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
