import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const CONFIG_KEY = "receptionConfig";

const configSchema = z.object({
  schoolId: z.string().min(1),
  config: z.object({}).passthrough(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");

  if (!schoolId || schoolId !== "default") {
    return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
  }

  try {
    const setting = await prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: CONFIG_KEY } },
    });

    const config = setting?.value ? JSON.parse(setting.value) : null;

    return NextResponse.json({ config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load configuration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = configSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { schoolId, config } = parsed.data;

  if (schoolId !== "default") {
    return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
  }

  try {
    await prisma.schoolSetting.upsert({
      where: { schoolId_key: { schoolId, key: CONFIG_KEY } },
      create: {
        schoolId,
        key: CONFIG_KEY,
        value: JSON.stringify(config),
      },
      update: {
        value: JSON.stringify(config),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save configuration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
