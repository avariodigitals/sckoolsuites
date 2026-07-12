import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

const SETTINGS_KEY = "email_config";

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "settings");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    const setting = await prisma.schoolSetting.findFirst({
      where: { schoolId, key: SETTINGS_KEY },
    });

    const hasEnvKey = !!(process.env.RESEND_API_KEY);

    if (setting?.value) {
      try {
        const saved = JSON.parse(setting.value);
        const hasSavedKey = !!(saved.resendApiKey);
        return NextResponse.json({
          provider: "resend",
          resendApiKey: "", // mask API key
          fromEmail: saved.fromEmail || process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "",
          enabled: hasEnvKey || hasSavedKey,
        });
      } catch {
        return NextResponse.json({
          provider: "resend",
          resendApiKey: "",
          fromEmail: process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "",
          enabled: hasEnvKey,
        });
      }
    }

    return NextResponse.json({
      provider: "resend",
      resendApiKey: "",
      fromEmail: process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "",
      enabled: hasEnvKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "settings");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    const body = await request.json();
    const {
      resendApiKey,
      fromEmail,
    } = body;

    const payload: Record<string, any> = {
      provider: "resend",
      fromEmail: fromEmail?.trim() || "",
      updatedAt: new Date().toISOString(),
    };

    // Only update API key if a new one is provided
    if (resendApiKey && resendApiKey.length > 0) {
      payload.resendApiKey = resendApiKey;
    }

    const existing = await prisma.schoolSetting.findFirst({
      where: { schoolId, key: SETTINGS_KEY },
    });

    if (existing) {
      // Merge with existing to preserve API key if not changing
      let merged = payload;
      try {
        const prev = JSON.parse(existing.value);
        if (!payload.resendApiKey && prev.resendApiKey) {
          merged = { ...payload, resendApiKey: prev.resendApiKey };
        }
      } catch { /* ignore */ }

      await prisma.schoolSetting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(merged) },
      });
    } else {
      await prisma.schoolSetting.create({
        data: {
          schoolId,
          key: SETTINGS_KEY,
          value: JSON.stringify(payload),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "settings");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    await prisma.schoolSetting.deleteMany({
      where: { schoolId, key: SETTINGS_KEY },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to clear settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
