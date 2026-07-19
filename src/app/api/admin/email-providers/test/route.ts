import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getProvider, type EmailProviderConfig } from "@/lib/email-providers";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const schoolId = session.user.schoolId || "default";
  const body = await request.json().catch(() => ({}));
  const provider = body.provider as string | undefined;

  let config: EmailProviderConfig | null = null;

  if (provider) {
    const record = await prisma.emailProviderConfig.findFirst({
      where: { schoolId, provider },
    });
    if (!record) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    config = {
      provider: record.provider as EmailProviderConfig["provider"],
      domain: record.domain,
      credentials: record.config as Record<string, string>,
      defaultPassword: record.defaultPassword ?? undefined,
      passwordPolicy: record.passwordPolicy ?? undefined,
    };
  } else {
    const record = await prisma.emailProviderConfig.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!record) {
      return NextResponse.json({ error: "No active email provider configured" }, { status: 404 });
    }
    config = {
      provider: record.provider as EmailProviderConfig["provider"],
      domain: record.domain,
      credentials: record.config as Record<string, string>,
      defaultPassword: record.defaultPassword ?? undefined,
      passwordPolicy: record.passwordPolicy ?? undefined,
    };
  }

  const providerInstance = getProvider(config);
  const result = await providerInstance.testConnection();

  return NextResponse.json(result);
}
