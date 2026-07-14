import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createNotificationsForRoles } from "@/lib/notification-helpers";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const otp = parsed.data.otp.trim();
  const schoolId = "default";

  const otpSetting = await prisma.schoolSetting.findUnique({
    where: {
      schoolId_key: { schoolId, key: `pwd_otp_${email}` },
    },
  });

  if (!otpSetting) {
    return NextResponse.json({ error: "No OTP was requested for this email. Please request a new code." }, { status: 400 });
  }

  let otpData: { otp: string; expiresAt: string; userId: number; email: string };
  try {
    otpData = JSON.parse(otpSetting.value);
  } catch {
    return NextResponse.json({ error: "Invalid OTP data. Please request a new code." }, { status: 400 });
  }

  if (Date.now() > new Date(otpData.expiresAt).getTime()) {
    return NextResponse.json({ error: "OTP has expired. Please request a new code." }, { status: 400 });
  }

  if (otpData.otp !== otp) {
    return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  await prisma.schoolSetting.create({
    data: {
      schoolId,
      key: `pwd_reset_${requestId}`,
      value: JSON.stringify({
        id: requestId,
        email,
        userId: user.id,
        userName: user.name,
        roleName: user.role.name,
        status: "pending_admin_approval",
        createdAt: new Date().toISOString(),
        otpVerifiedAt: new Date().toISOString(),
      }),
    },
  });

  await prisma.schoolSetting.delete({
    where: { id: otpSetting.id },
  }).catch(() => {});

  await createNotificationsForRoles(schoolId, ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL"], {
    type: "general",
    title: "Password Reset Request",
    body: `${user.name} (${email}) has requested a password reset. OTP verified — awaiting your approval.`,
    link: "/admin/users?tab=password-resets",
  });

  return NextResponse.json({ ok: true, requestId });
}
