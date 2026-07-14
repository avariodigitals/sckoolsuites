import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";

const schema = z.object({
  requestId: z.string().min(1),
  newPassword: z.string().min(6).max(120),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input. Password must be at least 6 characters." }, { status: 400 });
  }

  const { requestId, newPassword } = parsed.data;
  const schoolId = "default";

  const setting = await prisma.schoolSetting.findUnique({
    where: {
      schoolId_key: { schoolId, key: `pwd_reset_${requestId}` },
    },
  });

  if (!setting) {
    return NextResponse.json({ error: "Password reset request not found." }, { status: 404 });
  }

  let reqData: {
    id: string;
    email: string;
    userId: number;
    userName: string;
    roleName: string;
    status: string;
    createdAt: string;
    otpVerifiedAt: string;
    approvedAt?: string;
    approvedBy?: number;
    completedAt?: string;
  };

  try {
    reqData = JSON.parse(setting.value);
  } catch {
    return NextResponse.json({ error: "Invalid reset request data." }, { status: 400 });
  }

  if (reqData.status !== "approved") {
    return NextResponse.json({ error: "Your password reset request has not been approved yet." }, { status: 403 });
  }

  const hashed = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: reqData.userId },
    data: { password: hashed },
  });

  reqData.status = "completed";
  reqData.completedAt = new Date().toISOString();

  await prisma.schoolSetting.update({
    where: { id: setting.id },
    data: { value: JSON.stringify(reqData) },
  });

  await createAuditLog({
    schoolId,
    action: "PASSWORD_RESET_SELF",
    targetType: "User",
    targetId: String(reqData.userId),
    metadata: { email: reqData.email, requestId },
  });

  return NextResponse.json({ ok: true });
}
