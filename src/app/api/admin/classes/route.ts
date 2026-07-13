import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { Prisma } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(1).max(50),
  classGroupId: z.coerce.number(),
  armIds: z.array(z.coerce.number()).optional(),
  assessmentIds: z.array(z.coerce.number()).optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "classes");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";

  const [classes, classGroups, teachers, subjects] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      include: {
        classGroup: true,
        teacher: { include: { user: true } },
        arms: { orderBy: { name: "asc" }, include: { teacher: { include: { user: true } } } },
        students: { include: { user: true } },
        subjects: true,
      },
      orderBy: [{ createdAt: "desc" }],
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
    prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
  ]);

  // Fetch assessments for all classes in batch
  const classIds = classes.map((c) => c.id);
  const groupIds = [...new Set(classes.map((c) => c.classGroupId).filter((id): id is number => id !== null))];

  const [classAssessmentLinks, groupAssessmentLinks] = await Promise.all([
    classIds.length
      ? prisma.classAssessment.findMany({
          where: { classId: { in: classIds }, isActive: true },
          select: { classId: true, assessmentId: true },
        })
      : Promise.resolve([] as Array<{ classId: number; assessmentId: number }>),
    groupIds.length
      ? prisma.classGroupAssessment.findMany({
          where: { classGroupId: { in: groupIds }, isActive: true },
          select: { classGroupId: true, assessmentId: true },
        })
      : Promise.resolve([] as Array<{ classGroupId: number; assessmentId: number }>),
  ]);

  // Fetch assessment records in one batch
  const allAssessmentIds = [...new Set([...classAssessmentLinks, ...groupAssessmentLinks].map((l) => l.assessmentId))];
  const allAssessments = allAssessmentIds.length
    ? await prisma.assessment.findMany({ where: { id: { in: allAssessmentIds } } })
    : [];
  const assessmentById = new Map(allAssessments.map((a) => [a.id, a]));

  // Build lookup maps
  const assessmentsByClass = new Map<string, Array<Prisma.AssessmentGetPayload<{}> & { fromGroup: boolean }>>();
  const assessmentsByGroup = new Map<string, Array<Prisma.AssessmentGetPayload<{}> & { fromGroup: boolean }>>();

  for (const link of classAssessmentLinks) {
    const assessment = assessmentById.get(link.assessmentId);
    if (!assessment) continue;
    const list = assessmentsByClass.get(String(link.classId)) ?? [];
    list.push({ ...assessment, fromGroup: false });
    assessmentsByClass.set(String(link.classId), list);
  }

  for (const link of groupAssessmentLinks) {
    const assessment = assessmentById.get(link.assessmentId);
    if (!assessment) continue;
    const list = assessmentsByGroup.get(String(link.classGroupId)) ?? [];
    list.push({ ...assessment, fromGroup: true });
    assessmentsByGroup.set(String(link.classGroupId), list);
  }

  return NextResponse.json({
    classes: classes.map((cls) => {
      const groupAssessments = assessmentsByGroup.get(String(cls.classGroupId)) ?? [];
      const classAssessments = assessmentsByClass.get(String(cls.id)) ?? [];

      // Merge: group first, then class overrides/adds
      const byId = new Map<string, Prisma.AssessmentGetPayload<{}> & { fromGroup: boolean }>();
      for (const a of groupAssessments) byId.set(String(a.id), a);
      for (const a of classAssessments) byId.set(String(a.id), a);

      return {
        id: cls.id,
        name: cls.name,
        classGroupId: cls.classGroupId,
        classGroupName: cls.classGroup?.name ?? null,
        teacherId: cls.teacherId,
        teacherName: cls.teacher?.user.name ?? null,
        arms: cls.arms?.map((a) => ({ id: a.id, name: a.name, isActive: a.isActive, teacherId: a.teacherId, teacherName: a.teacher?.user?.name ?? null })) ?? [],
        students: cls.students?.map((s) => ({ id: s.id, name: s.user?.name })) ?? [],
        subjects: cls.subjects?.map((s) => ({ id: s.id, name: s.name })) ?? [],
        assessments: Array.from(byId.values()),
        studentCount: cls.students.length,
        createdAt: cls.createdAt.toISOString(),
      };
    }),
    classGroups: classGroups.map((g) => ({ id: g.id, name: g.name })),
    teachers: teachers.map((t) => ({ id: t.id, name: t.user.name })),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "classes");
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

  // Check if class name already exists
  const existing = await prisma.class.findFirst({
    where: { name: data.name, schoolId },
  });
  if (existing) {
    return NextResponse.json({ error: "Class name already exists" }, { status: 409 });
  }

  // Validate class group exists
  const groupExists = await prisma.classGroup.findFirst({
    where: { id: data.classGroupId, schoolId },
  });
  if (!groupExists) {
    return NextResponse.json({ error: "Invalid class group selected" }, { status: 400 });
  }

  try {
    // Create class first
    const cls = await prisma.class.create({
      data: {
        schoolId,
        name: data.name.trim(),
        classGroupId: data.classGroupId,
      },
      include: {
        classGroup: true,
        arms: true,
        students: true,
        subjects: true,
      },
    });

    // Create assigned arms from selected preset arms
    const assignedArms: Array<Prisma.ClassArmGetPayload<{}>> = [];
    if (data.armIds && data.armIds.length > 0) {
      // Fetch preset arms
      const presetArms = await prisma.classArm.findMany({
        where: {
          id: { in: data.armIds },
          schoolId,
          classId: null,
        },
      });

      for (const preset of presetArms) {
        const assigned = await prisma.classArm.create({
          data: {
            schoolId,
            classId: cls.id,
            name: preset.name,
            capacity: preset.capacity,
            isActive: true,
          },
        });
        assignedArms.push(assigned);
      }
    }

    // Link selected assessments to the class
    const linkedAssessments: Array<Prisma.ClassAssessmentGetPayload<{}>> = [];
    if (data.assessmentIds && data.assessmentIds.length > 0) {
      for (const assessmentId of data.assessmentIds) {
        try {
          const link = await prisma.classAssessment.create({
            data: {
              classId: cls.id,
              assessmentId,
            },
          });
          linkedAssessments.push(link);
        } catch {
          // Skip duplicates or invalid IDs
        }
      }
    }

    // Also inherit group-level assessments automatically
    const groupAssessmentLinks = cls.classGroupId
      ? await prisma.classGroupAssessment.findMany({
          where: { classGroupId: cls.classGroupId, isActive: true },
          select: { assessmentId: true },
        })
      : [];
    const groupAssessmentIds = groupAssessmentLinks.map((l) => l.assessmentId);
    const groupAssessments = groupAssessmentIds.length
      ? await prisma.assessment.findMany({ where: { id: { in: groupAssessmentIds } } })
      : [];

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "CLASS_CREATED",
      targetType: "Class",
      targetId: String(cls.id),
      metadata: {
        classId: cls.id,
        name: data.name,
        classGroupId: data.classGroupId,
        armIds: data.armIds,
        assessmentIds: data.assessmentIds,
      },
    });

    const allAssessments = groupAssessments.map((a) => ({ ...a, fromGroup: true }));
    for (const id of data.assessmentIds ?? []) {
      const found = allAssessments.find((a) => String(a.id) === String(id));
      if (!found) {
        const a = await prisma.assessment.findUnique({ where: { id } });
        if (a) allAssessments.push({ ...a, fromGroup: false });
      }
    }

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        classGroupId: cls.classGroupId,
        classGroupName: cls.classGroup?.name ?? null,
        arms: assignedArms.map((a) => ({ id: a.id, name: a.name, isActive: a.isActive })),
        students: [],
        subjects: [],
        assessments: allAssessments,
        studentCount: 0,
        createdAt: cls.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create class";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
