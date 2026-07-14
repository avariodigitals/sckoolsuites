import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notification-helpers";
import { sendWorkflowEmail } from "@/lib/email";

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

  reqData.status = "approved";
  reqData.approvedAt = new Date().toISOString();
  reqData.approvedBy = session.user.id;

  await prisma.schoolSetting.update({
    where: { id: setting.id },
    data: { value: JSON.stringify(reqData) },
  });

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: "PASSWORD_RESET_APPROVED",
    targetType: "User",
    targetId: String(reqData.userId),
    metadata: { email: reqData.email, requestId: id },
  });

  await createNotification({
    schoolId,
    userId: reqData.userId,
    type: "general",
    title: "Password Reset Approved",
    body: "Your password reset request has been approved. You can now set a new password.",
    link: `/forgot-password?request=${id}`,
  });

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const schoolName = school?.name ?? "Sckool Suite";

  await sendWorkflowEmail({
    schoolId,
    to: reqData.email,
    subject: `Password Reset Approved — ${schoolName}`,
    text: `Hello ${reqData.userName},\n\nYour password reset request has been approved by an administrator. You can now set your new password by visiting the link below:\n\n${process.env.NEXTAUTH_URL || ""}/forgot-password?request=${id}\n\nThis is an automated message from ${schoolName}.`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;}h2{color:#0f172a;} .btn{background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;}</style></head><body><h2>Password Reset Approved</h2><p>Hello <strong>${reqData.userName}</strong>,</p><p>Your password reset request has been approved by an administrator.</p><p><a href="${process.env.NEXTAUTH_URL || ""}/forgot-password?request=${id}" class="btn">Set New Password</a></p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from ${schoolName}.</p></body></html>`,
  });

  return NextResponse.json({ ok: true });
}
