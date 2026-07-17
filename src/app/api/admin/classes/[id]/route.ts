import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  classGroupId: z.coerce.number().int().min(1).optional().nullable(),
  teacherId: z.coerce.number().int().min(1).optional().nullable(),
  armIds: z.array(z.coerce.number().int().min(1)).optional(),
  assessmentIds: z.array(z.coerce.number().int().min(1)).optional(),
});

const armSchema = z.object({
  armName: z.string().min(1).max(20),
  action: z.enum(["ADD_ARM", "REMOVE_ARM"]),
});

const subjectSchema = z.object({
  subjectId: z.coerce.number().int().min(1),
  action: z.enum(["ADD_SUBJECT", "REMOVE_SUBJECT"]),
});

const armTeacherSchema = z.object({
  armId: z.coerce.number().int().min(1),
  teacherId: z.coerce.number().int().min(1),
  action: z.literal("ASSIGN_ARM_TEACHER"),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "classes");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "class id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid class id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = await request.json();
  const schoolId = session.user.schoolId || "default";

  // Check if this is an arm management action
  const armParsed = armSchema.safeParse(payload);
  if (armParsed.success) {
    const { armName, action } = armParsed.data;

    // Verify class exists
    const cls = await prisma.class.findFirst({
      where: { id: parsedId, schoolId },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    if (action === "ADD_ARM") {
      // Check if arm name already exists for this class
      const existingArm = await prisma.classArm.findFirst({
        where: { classId: parsedId, name: armName, schoolId },
      });
      if (existingArm) {
        return NextResponse.json({ error: "Arm name already exists for this class" }, { status: 409 });
      }

      const arm = await prisma.classArm.create({
        data: {
          schoolId,
          classId: parsedId,
          name: armName.trim(),
          isActive: true,
        },
      });

      await createAuditLog({
        schoolId,
        actorUserId: session.user.id,
        action: "CLASS_ARM_ADDED",
        targetType: "Class",
        targetId: String(parsedId),
        metadata: { classId: parsedId, armId: arm.id, armName },
      });

      return NextResponse.json({ ok: true, arm: { id: arm.id, name: arm.name, isActive: arm.isActive } });
    } else {
      // REMOVE_ARM
      const arm = await prisma.classArm.findFirst({
        where: { classId: parsedId, name: armName, schoolId },
      });
      if (!arm) {
        return NextResponse.json({ error: "Arm not found" }, { status: 404 });
      }

      await prisma.classArm.update({
        where: { id: arm.id },
        data: { isActive: false },
      });

      await createAuditLog({
        schoolId,
        actorUserId: session.user.id,
        action: "CLASS_ARM_REMOVED",
        targetType: "Class",
        targetId: String(parsedId),
        metadata: { classId: parsedId, armId: arm.id, armName },
      });

      return NextResponse.json({ ok: true, message: "Arm removed successfully" });
    }
  }

  // Check if this is a subject management action
  const subjectParsed = subjectSchema.safeParse(payload);
  if (subjectParsed.success) {
    const { subjectId, action } = subjectParsed.data;

    // Verify class exists
    const cls = await prisma.class.findFirst({
      where: { id: parsedId, schoolId },
      include: { subjects: true },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Verify subject exists
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
    });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    if (action === "ADD_SUBJECT") {
      // Check if subject is already assigned
      const alreadyAssigned = cls.subjects?.some((s: any) => s.id === subjectId) ?? false;
      if (alreadyAssigned) {
        return NextResponse.json({ error: "Subject already assigned to this class" }, { status: 409 });
      }

      // Update subject to link to this class
      await prisma.subject.update({
        where: { id: subjectId },
        data: { classId: parsedId },
      });

      await createAuditLog({
        schoolId,
        actorUserId: session.user.id,
        action: "SUBJECT_ADDED_TO_CLASS",
        targetType: "Class",
        targetId: String(parsedId),
        metadata: { classId: parsedId, subjectId },
      });

      return NextResponse.json({ ok: true, message: "Subject added to class successfully" });
    } else {
      // REMOVE_SUBJECT
      const isAssigned = cls.subjects?.some((s: any) => s.id === subjectId) ?? false;
      if (!isAssigned) {
        return NextResponse.json({ error: "Subject is not assigned to this class" }, { status: 400 });
      }

      await prisma.subject.update({
        where: { id: subjectId },
        data: { classId: null },
      });

      await createAuditLog({
        schoolId,
        actorUserId: session.user.id,
        action: "SUBJECT_REMOVED_FROM_CLASS",
        targetType: "Class",
        targetId: String(parsedId),
        metadata: { classId: parsedId, subjectId },
      });

      return NextResponse.json({ ok: true, message: "Subject removed from class successfully" });
    }
  }

  // Check if this is an arm teacher assignment action
  const armTeacherParsed = armTeacherSchema.safeParse(payload);
  if (armTeacherParsed.success) {
    const { armId, teacherId } = armTeacherParsed.data;

    // Verify class exists
    const cls = await prisma.class.findFirst({
      where: { id: parsedId, schoolId },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Verify arm belongs to this class
    const arm = await prisma.classArm.findFirst({
      where: { id: armId, classId: parsedId, schoolId },
    });
    if (!arm) {
      return NextResponse.json({ error: "Arm not found in this class" }, { status: 404 });
    }

    // Update the arm's teacher
    await prisma.classArm.update({
      where: { id: armId },
      data: { teacherId: teacherId || null },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ARM_TEACHER_ASSIGNED",
      targetType: "ClassArm",
      targetId: String(armId),
      metadata: { classId: parsedId, armId, teacherId: teacherId || null },
    });

    return NextResponse.json({ ok: true, message: "Arm teacher assigned successfully" });
  }

  // Regular class update
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Check class exists
  const existing = await prisma.class.findFirst({
    where: { id: parsedId, schoolId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  // Check for name uniqueness if updating name
  if (data.name && data.name !== existing.name) {
    const nameExists = await prisma.class.findFirst({
      where: { name: data.name, schoolId },
    });
    if (nameExists) {
      return NextResponse.json({ error: "Class name already exists" }, { status: 409 });
    }
  }

  // Validate class group if provided
  if (data.classGroupId) {
    const groupExists = await prisma.classGroup.findFirst({
      where: { id: data.classGroupId, schoolId },
    });
    if (!groupExists) {
      return NextResponse.json({ error: "Invalid class group selected" }, { status: 400 });
    }
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
    const updated = await prisma.class.update({
      where: { id: parsedId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.classGroupId !== undefined ? { classGroupId: data.classGroupId } : {}),
        ...(data.teacherId !== undefined ? { teacherId: data.teacherId } : {}),
      },
    });

    // Sync arms from preset selections
    if (data.armIds !== undefined) {
      const currentArms = await prisma.classArm.findMany({
        where: { classId: parsedId, schoolId, isActive: true },
      });
      const desiredArmIds = new Set(data.armIds);

      // Look up selected preset arms by ID
      const presetArms = desiredArmIds.size > 0
        ? await prisma.classArm.findMany({
            where: {
              id: { in: Array.from(desiredArmIds) },
              schoolId,
              classId: null,
            },
          })
        : [];
      const desiredNames = new Set(presetArms.map((p: { name: string }) => p.name));

      // Deactivate class arms whose preset is no longer selected (match by name)
      for (const arm of currentArms) {
        if (!desiredNames.has(arm.name)) {
          await prisma.classArm.update({
            where: { id: arm.id },
            data: { isActive: false },
          });
        }
      }

      // Create class arms from presets that aren't already active on this class
      const currentNames = new Set(currentArms.map((a: { name: string }) => a.name));
      for (const preset of presetArms) {
        if (!currentNames.has(preset.name)) {
          await prisma.classArm.create({
            data: {
              schoolId,
              classId: parsedId,
              name: preset.name,
              capacity: preset.capacity,
              isActive: true,
            },
          });
        }
      }
    }

    // Sync assessment links
    if (data.assessmentIds !== undefined) {
      const currentLinks = await prisma.classAssessment.findMany({
        where: { classId: parsedId, isActive: true },
      });
      const desiredIds = new Set(data.assessmentIds);
      const currentIds = new Set(currentLinks.map((l) => l.assessmentId));

      // Deactivate links that are no longer selected
      for (const link of currentLinks) {
        if (!desiredIds.has(link.assessmentId)) {
          await prisma.classAssessment.update({
            where: { id: link.id },
            data: { isActive: false },
          });
        }
      }

      // Create new links for selected assessments
      for (const assessmentId of desiredIds) {
        if (!currentIds.has(assessmentId)) {
          await prisma.classAssessment.create({
            data: {
              classId: parsedId,
              assessmentId,
              isActive: true,
            },
          });
        }
      }
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "CLASS_UPDATED",
      targetType: "Class",
      targetId: String(parsedId),
      metadata: {
        classId: parsedId,
        updates: Object.keys(data),
      },
    });

    return NextResponse.json({ ok: true, class: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update class";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "classes");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "class id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid class id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";

  // Check class exists
  const existing = await prisma.class.findFirst({
    where: { id: parsedId, schoolId },
    include: { students: true, arms: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  // Check if class has students
  if (existing.students.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete class with ${existing.students.length} enrolled student(s). Remove all students first.` },
      { status: 409 }
    );
  }

  try {
    // Soft delete by deactivating arms
    await prisma.classArm.updateMany({
      where: { classId: parsedId, schoolId },
      data: { isActive: false },
    });

    // Remove subject associations
    await prisma.subject.updateMany({
      where: { classId: parsedId, schoolId },
      data: { classId: null },
    });

    // Delete the class
    await prisma.class.delete({
      where: { id: parsedId },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "CLASS_DELETED",
      targetType: "Class",
      targetId: String(parsedId),
      metadata: {
        classId: parsedId,
        name: existing.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete class";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
