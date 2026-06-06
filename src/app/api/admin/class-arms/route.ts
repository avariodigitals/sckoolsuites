import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const arms = await prisma.classArm.findMany({
      where: { schoolId: "default" },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedArms = arms.map((arm) => ({
      id: arm.id,
      name: arm.name,
      classId: arm.classId,
      className: arm.class?.name || "Unknown",
      studentCount: 0, // Students are associated with Class, not directly with ClassArm
      isActive: arm.isActive,
      createdAt: arm.createdAt,
    }));

    return NextResponse.json({ arms: formattedArms });
  } catch (error) {
    console.error("Failed to fetch class arms:", error);
    return NextResponse.json(
      { error: "Failed to fetch class arms" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, classId } = body;

    if (!name?.trim() || !classId) {
      return NextResponse.json(
        { error: "Arm name and class are required" },
        { status: 400 }
      );
    }

    // Check if class exists and belongs to this school
    const classItem = await prisma.class.findFirst({
      where: { id: classId, schoolId: "default" },
    });

    if (!classItem) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Check for duplicate arm name in this class
    const existing = await prisma.classArm.findUnique({
      where: {
        schoolId_classId_name: {
          schoolId: "default",
          classId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Arm with this name already exists in this class" },
        { status: 409 }
      );
    }

    const arm = await prisma.classArm.create({
      data: {
        schoolId: "default",
        classId,
        name: name.trim(),
        isActive: true,
      },
    });

    return NextResponse.json({ arm }, { status: 201 });
  } catch (error) {
    console.error("Failed to create class arm:", error);
    return NextResponse.json(
      { error: "Failed to create class arm" },
      { status: 500 }
    );
  }
}
