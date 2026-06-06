import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    const [gradingSetting, gradeBandsSetting] = await Promise.all([
      prisma.schoolSetting.findFirst({
        where: { schoolId, key: "grading_config" },
        select: { value: true }
      }),
      prisma.schoolSetting.findFirst({
        where: { schoolId, key: "grade_bands" },
        select: { value: true }
      }),
    ]);

    const config = gradingSetting?.value ? JSON.parse(gradingSetting.value) : null;
    const gradeBands = gradeBandsSetting?.value ? JSON.parse(gradeBandsSetting.value) : null;

    return NextResponse.json({
      config: config ? { ...config, gradeBands } : null,
    });
  } catch (error) {
    console.error("Failed to load grading config:", error);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json({ error: "Config is required" }, { status: 400 });
    }

    // Save grading config (without gradeBands)
    const { gradeBands, ...gradingConfig } = config;
    await prisma.schoolSetting.upsert({
      where: { schoolId_key: { schoolId, key: "grading_config" } },
      update: { value: JSON.stringify(gradingConfig) },
      create: { schoolId, key: "grading_config", value: JSON.stringify(gradingConfig) },
    });

    // Save grade bands separately
    if (gradeBands) {
      await prisma.schoolSetting.upsert({
        where: { schoolId_key: { schoolId, key: "grade_bands" } },
        update: { value: JSON.stringify(gradeBands) },
        create: { schoolId, key: "grade_bands", value: JSON.stringify(gradeBands) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save grading config:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
