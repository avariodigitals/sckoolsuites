import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  classGroupId: z.string().min(5).optional().nullable(),
  teacherId: z.string().min(5).optional().nullable(),
});

const armSchema = z.object({
  armName: z.string().min(1).max(20),
  action: z.enum(["ADD_ARM", "REMOVE_ARM"]),
});

const subjectSchema = z.object({
  subjectId: z.string().min(5),
  action: z.enum(["ADD_SUBJECT", "REMOVE_SUBJECT"]),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json();
  const schoolId = "default";

  // Check if this is an arm management action
  const armParsed = armSchema.safeParse(payload);
  if (armParsed.success) {
    const { armName, action } = armParsed.data;

    // Verify class exists
    const cls = await prisma.class.findFirst({
      where: { id, schoolId },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    if (action === "ADD_ARM") {
      // Check if arm name already exists for this class
      const existingArm = await prisma.classArm.findFirst({
        where: { classId: id, name: armName, schoolId },
      });
      if (existingArm) {
        return NextResponse.json({ error: "Arm name already exists for this class" }, { status: 409 });
      }

      const arm = await prisma.classArm.create({
        data: {
          schoolId,
          classId: id,
          name: armName.trim(),
          isActive: true,
        },
      });

      await createAuditLog({
        schoolId,
        actorUserId: session.user.id,
        action: "CLASS_ARM_ADDED",
        targetType: "Class",
        targetId: id,
        metadata: { classId: id, armId: arm.id, armName },
      });

      return NextResponse.json({ ok: true, arm: { id: arm.id, name: arm.name, isActive: arm.isActive } });
    } else {
      // REMOVE_ARM
      const arm = await prisma.classArm.findFirst({
        where: { classId: id, name: armName, schoolId },
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
        targetId: id,
        metadata: { classId: id, armId: arm.id, armName },
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
      where: { id, schoolId },
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
        data: { classId: id },
      });

      await createAuditLog({
        schoolId,
        actorUserId: session.user.id,
        action: "SUBJECT_ADDED_TO_CLASS",
        targetType: "Class",
        targetId: id,
        metadata: { classId: id, subjectId },
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
        targetId: id,
        metadata: { classId: id, subjectId },
      });

      return NextResponse.json({ ok: true, message: "Subject removed from class successfully" });
    }
  }

  // Regular class update
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Check class exists
  const existing = await prisma.class.findFirst({
    where: { id, schoolId },
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
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.classGroupId !== undefined ? { classGroupId: data.classGroupId } : {}),
        ...(data.teacherId !== undefined ? { teacherId: data.teacherId } : {}),
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "CLASS_UPDATED",
      targetType: "Class",
      targetId: id,
      metadata: {
        classId: id,
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
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const schoolId = "default";

  // Check class exists
  const existing = await prisma.class.findFirst({
    where: { id, schoolId },
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
      where: { classId: id, schoolId },
      data: { isActive: false },
    });

    // Remove subject associations
    await prisma.subject.updateMany({
      where: { classId: id, schoolId },
      data: { classId: null },
    });

    // Delete the class
    await prisma.class.delete({
      where: { id },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "CLASS_DELETED",
      targetType: "Class",
      targetId: id,
      metadata: {
        classId: id,
        name: existing.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete class";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
