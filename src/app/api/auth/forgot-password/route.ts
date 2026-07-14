import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendWorkflowEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const schoolId = "default";

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ ok: true });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.schoolSetting.upsert({
    where: {
      schoolId_key: { schoolId, key: `pwd_otp_${email}` },
    },
    update: {
      value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString(), userId: user.id, email }),
    },
    create: {
      schoolId,
      key: `pwd_otp_${email}`,
      value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString(), userId: user.id, email }),
    },
  });

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const schoolName = school?.name ?? "Sckool Suite";

  await sendWorkflowEmail({
    schoolId,
    to: email,
    subject: `Password Reset OTP — ${schoolName}`,
    text: `Hello ${user.name},\n\nYour password reset verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request a password reset, please ignore this email.\n\nThis is an automated message from ${schoolName}.`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;}h2{color:#0f172a;} .otp-box{background:#f0fdf4;border:1px solid #bbf7d0;padding:20px;border-radius:8px;text-align:center;margin:16px 0;} .otp-code{font-size:32px;font-weight:bold;letter-spacing:8px;color:#047857;}</style></head><body><h2>Password Reset Verification</h2><p>Hello <strong>${user.name}</strong>,</p><p>We received a request to reset your password. Use the verification code below to continue:</p><div class="otp-box"><div class="otp-code">${otp}</div></div><p>This code expires in <strong>10 minutes</strong>.</p><p>If you did not request a password reset, please ignore this email.</p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from ${schoolName}.</p></body></html>`,
  });

  return NextResponse.json({ ok: true });
}
