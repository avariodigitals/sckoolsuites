import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  StudentConfig,
  defaultStudentConfig,
  parseStudentConfig,
  STUDENT_CONFIG_KEY,
} from "@/lib/student-config";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

// GET - Load student configuration
export async function GET() {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    const setting = await prisma.schoolSetting.findUnique({
      where: {
        schoolId_key: {
          schoolId,
          key: STUDENT_CONFIG_KEY,
        },
      },
    });

    let config: StudentConfig;

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        config = parseStudentConfig(parsed);
      } catch {
        config = defaultStudentConfig;
      }
    } else {
      config = defaultStudentConfig;
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Failed to load student config:", error);
    return NextResponse.json(
      { error: "Failed to load configuration" },
      { status: 500 }
    );
  }
}

// POST - Save student configuration
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    const body = await request.json();
    const newConfig: StudentConfig = {
      ...body,
      version: (body.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    // Validate required fields
    if (!newConfig.registration || !newConfig.attendance) {
      return NextResponse.json(
        { error: "Invalid configuration structure" },
        { status: 400 }
      );
    }

    // Save to SchoolSetting
    await prisma.schoolSetting.upsert({
      where: {
        schoolId_key: {
          schoolId,
          key: STUDENT_CONFIG_KEY,
        },
      },
      update: {
        value: JSON.stringify(newConfig),
      },
      create: {
        schoolId,
        key: STUDENT_CONFIG_KEY,
        value: JSON.stringify(newConfig),
      },
    });

    return NextResponse.json({
      success: true,
      config: newConfig,
    });
  } catch (error) {
    console.error("Failed to save student config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
