import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  classId: z.coerce.number().optional().nullable(),
  classIds: z.array(z.coerce.number()).optional(),
  classGroupId: z.coerce.number().optional().nullable(),
  teacherId: z.coerce.number().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "subjects");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";

  const [subjects, classes, classGroups, teachers] = await Promise.all([
    prisma.subject.findMany({
      where: { schoolId },
      include: {
        class: true,
        classGroup: true,
        teacher: { include: { user: true } },
      },
      orderBy: [{ name: "asc" }],
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
    prisma.classGroup.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { id: "asc" },
    }),
  ]);

  return NextResponse.json({
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      classId: s.classId,
      className: s.class?.name ?? null,
      classGroupId: s.classGroupId,
      classGroupName: s.classGroup?.name ?? null,
      teacherId: s.teacherId,
      teacherName: s.teacher?.user.name ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
    classes: classes.map((c) => ({ id: c.id, name: c.name, classGroupId: c.classGroupId })),
    classGroups: classGroups.map((g) => ({ id: g.id, name: g.name })),
    teachers: teachers.map((t) => ({ id: t.id, name: t.user.name })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "subjects");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const data = parsed.data;

  // Determine which class IDs to create subjects for
  let classIdsToCreate: number[] = [];
  if (data.classIds && data.classIds.length > 0) {
    classIdsToCreate = data.classIds;
  } else if (data.classId) {
    classIdsToCreate = [data.classId];
  }

  // Validate class group if provided
  let classGroup: { id: number; name: string } | null = null;
  if (data.classGroupId) {
    classGroup = await prisma.classGroup.findFirst({
      where: { id: data.classGroupId, schoolId },
    });
    if (!classGroup) {
      return NextResponse.json({ error: "Invalid class group selected" }, { status: 400 });
    }
  }

  // Validate all classes and fetch their names
  let classNamesMap: Map<number, string> = new Map();
  if (classIdsToCreate.length > 0) {
    const classRecords = await prisma.class.findMany({
      where: { id: { in: classIdsToCreate }, schoolId },
    });
    if (classRecords.length !== classIdsToCreate.length) {
      return NextResponse.json({ error: "One or more invalid classes selected" }, { status: 400 });
    }
    classNamesMap = new Map(classRecords.map((c) => [c.id, c.name]));
  }

  // Validate teacher if provided
  if (data.teacherId) {
    const teacherExists = await prisma.teacher.findFirst({
      where: { id: data.teacherId, schoolId },
    });
    if (!teacherExists) {
      return NextResponse.json({ error: "Invalid teacher selected" }, { status: 400 });
    }
  }

  try {
    const createdSubjects: any[] = [];
    const classGroupName = classGroup?.name ?? null;

    if (classIdsToCreate.length === 0) {
      // No classes selected — create a single subject linked to class group only (or general)
      const existing = await prisma.subject.findFirst({
        where: { name: data.name.trim(), schoolId, classId: null, classGroupId: data.classGroupId ?? null },
      });
      if (existing) {
        return NextResponse.json({ error: `Subject "${data.name}" already exists for this scope` }, { status: 409 });
      }

      const subject = await prisma.subject.create({
        data: {
          schoolId,
          name: data.name.trim(),
          classId: null,
          classGroupId: data.classGroupId ?? null,
          classGroupNames: classGroupName,
          teacherId: data.teacherId ?? null,
        },
        include: { class: true, classGroup: true, teacher: { include: { user: true } } },
      });
      createdSubjects.push(subject);
    } else {
      // Create one subject per selected class
      for (const classId of classIdsToCreate) {
        const className = classNamesMap.get(classId) ?? "";
        const existing = await prisma.subject.findFirst({
          where: { name: data.name.trim(), schoolId, classId },
        });
        if (existing) {
          // Skip duplicates silently
          continue;
        }

        const subject = await prisma.subject.create({
          data: {
            schoolId,
            name: data.name.trim(),
            classId,
            classNames: className,
            classGroupId: data.classGroupId ?? null,
            classGroupNames: classGroupName,
            teacherId: data.teacherId ?? null,
          },
          include: { class: true, classGroup: true, teacher: { include: { user: true } } },
        });
        createdSubjects.push(subject);
      }
    }

    if (createdSubjects.length === 0) {
      return NextResponse.json({ error: "Subjects already exist for all selected classes" }, { status: 409 });
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "SUBJECT_CREATED",
      targetType: "Subject",
      targetId: String(createdSubjects[0].id),
      metadata: {
        name: data.name,
        classIds: classIdsToCreate,
        classGroupId: data.classGroupId,
        teacherId: data.teacherId,
        count: createdSubjects.length,
      },
    });

    return NextResponse.json({
      subjects: createdSubjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        classId: subject.classId,
        className: subject.class?.name ?? null,
        classGroupId: subject.classGroupId,
        classGroupName: subject.classGroup?.name ?? null,
        teacherId: subject.teacherId,
        teacherName: subject.teacher?.user.name ?? null,
        createdAt: subject.createdAt.toISOString(),
      })),
      created: createdSubjects.length,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create subject";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
