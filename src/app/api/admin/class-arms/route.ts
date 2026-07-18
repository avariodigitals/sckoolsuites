import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "classes");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const preset = searchParams.get("preset");

  try {
    // preset=1 returns standalone arms (class_id IS NULL)
    // otherwise returns assigned arms for a specific class (via classId param)
    const classId = searchParams.get("classId");

    const schoolId = user.schoolId || "default";
    const where: Prisma.ClassArmWhereInput = { schoolId };
    if (preset === "1") {
      where.classId = null;
    } else if (classId) {
      let parsedClassId: number;
      try {
        parsedClassId = parseNumericId(classId, "class id");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid class id";
        return NextResponse.json({ error: message }, { status: 400 });
      }
      where.classId = parsedClassId;
    }

    const arms = await prisma.classArm.findMany({
      where,
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: { include: { user: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const armIds = arms.map((a) => a.id);

    const [subjectAssignments, studentCounts] = await Promise.all([
      armIds.length
        ? prisma.subjectAssignment.findMany({
            where: { classId: { in: armIds } },
            include: { subject: { include: { teacher: { include: { user: true } } } } },
          })
        : Promise.resolve([]),
      armIds.length
        ? prisma.student.groupBy({
            by: ["armId"],
            where: { armId: { in: armIds }, schoolId },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const subjectsByArm = new Map<number, Array<{ id: string; name: string; teacherId?: string; teacherName?: string }>>();
    for (const sa of subjectAssignments) {
      const armId = sa.classId;
      if (!armId) continue;
      const list = subjectsByArm.get(armId) ?? [];
      list.push({
        id: String(sa.subject.id),
        name: sa.subject.name,
        teacherId: sa.subject.teacherId ? String(sa.subject.teacherId) : undefined,
        teacherName: sa.subject.teacher?.user?.name ?? undefined,
      });
      subjectsByArm.set(armId, list);
    }

    const studentCountByArm = new Map<number, number>();
    for (const sc of studentCounts) {
      if (sc.armId) studentCountByArm.set(sc.armId, sc._count.id);
    }

    const formattedArms = arms.map((arm) => ({
      id: String(arm.id),
      name: arm.name,
      capacity: arm.capacity ?? null,
      classId: arm.classId ? String(arm.classId) : null,
      className: arm.class?.name || null,
      isActive: arm.isActive,
      teacherId: arm.teacherId ? String(arm.teacherId) : null,
      teacherName: arm.teacher?.user?.name ?? null,
      subjects: subjectsByArm.get(arm.id) ?? [],
      studentCount: studentCountByArm.get(arm.id) ?? 0,
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
  const allowed = await crudPrivilege(session, "POST", "classes");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Arm name is required" },
        { status: 400 }
      );
    }

    const schoolId = user.schoolId || "default";

    // Check for duplicate preset arm name at school level
    const existing = await prisma.classArm.findFirst({
      where: {
        schoolId,
        classId: null,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An arm with this name already exists" },
        { status: 409 }
      );
    }

    const arm = await prisma.classArm.create({
      data: {
        schoolId,
        classId: null,
        name: name.trim(),
        capacity: body.capacity ? parseInt(body.capacity, 10) : null,
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
