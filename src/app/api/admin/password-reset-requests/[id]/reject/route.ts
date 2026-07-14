import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notification-helpers";

function isAuthorized(role?: string) {
  return role ? ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(role) : false;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const schoolId = "default";

  const setting = await prisma.schoolSetting.findUnique({
    where: {
      schoolId_key: { schoolId, key: `pwd_reset_${id}` },
    },
  });

  if (!setting) {
    return NextResponse.json({ error: "Reset request not found" }, { status: 404 });
  }

  let reqData: Record<string, any>;
  try {
    reqData = JSON.parse(setting.value);
  } catch {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }

  if (reqData.status !== "pending_admin_approval") {
    return NextResponse.json({ error: `Request is already ${reqData.status}` }, { status: 400 });
  }

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch { /* empty body is fine */ }

  reqData.status = "rejected";
  reqData.rejectedAt = new Date().toISOString();
  reqData.rejectedBy = session.user.id;
  reqData.rejectionReason = body.reason || "";

  await prisma.schoolSetting.update({
    where: { id: setting.id },
    data: { value: JSON.stringify(reqData) },
  });

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: "PASSWORD_RESET_REJECTED",
    targetType: "User",
    targetId: String(reqData.userId),
    metadata: { email: reqData.email, requestId: id, reason: body.reason || "" },
  });

  await createNotification({
    schoolId,
    userId: reqData.userId,
    type: "general",
    title: "Password Reset Request Rejected",
    body: `Your password reset request was rejected by an administrator.${body.reason ? ` Reason: ${body.reason}` : ""}`,
  });

  return NextResponse.json({ ok: true });
}
