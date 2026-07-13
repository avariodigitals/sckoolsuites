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
  const allowed = await crudPrivilege(session, "POST", "students");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;

  let studentId: number;
  try {
    studentId = parseNumericId(rawId, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student ID";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: { user: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  try {
    const result = await resendUserCredentials({
      userId: student.userId,
      role: "Student",
      schoolId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to resend credentials" }, { status: 500 });
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "STUDENT_CREDENTIALS_RESENT",
      targetType: "Student",
      targetId: String(studentId),
      metadata: { studentId, userId: student.userId, email: student.user.email },
    });

    return NextResponse.json({ ok: true, message: "Welcome email resent with new temporary password." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resend credentials";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
