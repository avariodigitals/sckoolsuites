import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getProvider, type EmailProviderType } from "@/lib/email-providers";
import { z } from "zod";

const PROVIDER_FIELDS: Record<EmailProviderType, string[]> = {
  cpanel: ["cpanelUrl", "cpanelUser", "cpanelToken"],
  google: ["serviceAccountEmail", "privateKey", "adminEmail"],
  microsoft: ["tenantId", "clientId", "clientSecret", "usageLocation"],
  zoho: ["zohoAuthToken", "zohoOrgId", "zohoApiUrl"],
};

const createSchema = z.object({
  provider: z.enum(["cpanel", "google", "microsoft", "zoho"]),
  domain: z.string().min(1),
  isActive: z.boolean().default(true),
  defaultPassword: z.string().optional().nullable(),
  passwordPolicy: z.enum(["fixed", "random", "firstname+year"]).optional().nullable(),
  emailPattern: z.enum(["firstname.lastname", "firstname.lastinitial", "firstinitial.lastname", "firstname", "firstname.lastname.year", "firstname.studentid", "admissionno", "custom"]).optional().nullable(),
  customPattern: z.string().optional().nullable(),
  credentials: z.record(z.string(), z.string()),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const schoolId = session.user.schoolId || "default";
  const configs = await prisma.emailProviderConfig.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    configs.map((c) => ({
      id: c.id,
      provider: c.provider,
      domain: c.domain,
      isActive: c.isActive,
      passwordPolicy: c.passwordPolicy,
      emailPattern: c.emailPattern,
      customPattern: c.customPattern,
      hasDefaultPassword: !!c.defaultPassword,
      requiredFields: PROVIDER_FIELDS[c.provider as EmailProviderType] || [],
      hasCredentials: Object.keys(c.config as Record<string, unknown>).length > 0,
      createdAt: c.createdAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const schoolId = session.user.schoolId || "default";
  const parsed = createSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { provider, domain, isActive, credentials, defaultPassword, passwordPolicy, emailPattern, customPattern } = parsed.data;

  const required = PROVIDER_FIELDS[provider];
  const missing = required.filter((f) => !credentials[f]);
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const record = await prisma.emailProviderConfig.upsert({
    where: {
      schoolId_provider: { schoolId, provider },
    },
    update: {
      domain,
      isActive,
      config: credentials as any,
      ...(defaultPassword !== undefined ? { defaultPassword } : {}),
      ...(passwordPolicy !== undefined ? { passwordPolicy } : {}),
      ...(emailPattern !== undefined ? { emailPattern } : {}),
      ...(customPattern !== undefined ? { customPattern } : {}),
    },
    create: {
      schoolId,
      provider,
      domain,
      isActive,
      config: credentials as any,
      defaultPassword: defaultPassword ?? null,
      passwordPolicy: passwordPolicy ?? null,
      emailPattern: emailPattern ?? null,
      customPattern: customPattern ?? null,
    },
  });

  return NextResponse.json({
    id: record.id,
    provider: record.provider,
    domain: record.domain,
    isActive: record.isActive,
  });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const schoolId = session.user.schoolId || "default";
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  await prisma.emailProviderConfig.deleteMany({
    where: { id, schoolId },
  });

  return NextResponse.json({ ok: true });
}
