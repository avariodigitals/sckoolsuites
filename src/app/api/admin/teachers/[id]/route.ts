import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
});

const assignSchema = z.object({
  classId: z.coerce.number().int().min(1).optional(),
  armId: z.coerce.number().int().min(1).optional(),
  subjectId: z.coerce.number().int().min(1).optional(),
  action: z.enum(["ASSIGN", "UNASSIGN"]),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}


export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "teachers");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawTeacherId } = await params;

  let teacherId: number;
  try {
    teacherId = parseNumericId(rawTeacherId, "teacher id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid teacher ID";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = await request.json();
  const schoolId = session.user.schoolId || "default";

  // Check if this is an assignment action
  const assignParsed = assignSchema.safeParse(payload);
  if (assignParsed.success && (assignParsed.data.classId || assignParsed.data.armId || assignParsed.data.subjectId)) {
    const { classId, armId, subjectId, action } = assignParsed.data;

    // Verify teacher exists
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    if (classId) {
      // Verify class exists
      const classExists = await prisma.class.findFirst({
        where: { id: classId, schoolId },
        include: { teacher: { include: { user: true } } },
      });
      if (!classExists) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
      }

      if (action === "ASSIGN") {
        // Check if class already has a different teacher
        if (classExists.teacherId && classExists.teacherId !== teacherId && classExists.teacher?.user) {
          return NextResponse.json(
            { error: `Class is already assigned to ${classExists.teacher.user.name}` },
            { status: 409 }
          );
        }

        await prisma.class.update({
          where: { id: classId },
          data: { teacherId },
        });

        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "CLASS_ASSIGNED_TO_TEACHER",
          targetType: "Teacher",
          targetId: String(teacherId),
          metadata: { teacherId, classId },
        });

        return NextResponse.json({ ok: true, message: "Class assigned successfully" });
      } else {
        // UNASSIGN
        if (classExists.teacherId !== teacherId) {
          return NextResponse.json(
            { error: "Class is not assigned to this teacher" },
            { status: 400 }
          );
        }

        await prisma.class.update({
          where: { id: classId },
          data: { teacherId: null },
        });

        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "CLASS_UNASSIGNED_FROM_TEACHER",
          targetType: "Teacher",
          targetId: String(teacherId),
          metadata: { teacherId, classId },
        });

        return NextResponse.json({ ok: true, message: "Class unassigned successfully" });
      }
    }

    if (armId) {
      // Verify arm exists
      const armExists = await prisma.classArm.findFirst({
        where: { id: armId, schoolId },
        include: { teacher: { include: { user: true } } },
      });
      if (!armExists) {
        return NextResponse.json({ error: "Class arm not found" }, { status: 404 });
      }

      if (action === "ASSIGN") {
        // Check if arm already has a different teacher
        if (armExists.teacherId && armExists.teacherId !== teacherId && armExists.teacher?.user) {
          return NextResponse.json(
            { error: `Class arm is already assigned to ${armExists.teacher.user.name}` },
            { status: 409 }
          );
        }

        await prisma.classArm.update({
          where: { id: armId },
          data: { teacherId },
        });

        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "ARM_ASSIGNED_TO_TEACHER",
          targetType: "Teacher",
          targetId: String(teacherId),
          metadata: { teacherId, armId },
        });

        return NextResponse.json({ ok: true, message: "Class arm assigned successfully" });
      } else {
        // UNASSIGN
        if (armExists.teacherId !== teacherId) {
          return NextResponse.json(
            { error: "Class arm is not assigned to this teacher" },
            { status: 400 }
          );
        }

        await prisma.classArm.update({
          where: { id: armId },
          data: { teacherId: null },
        });

        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "ARM_UNASSIGNED_FROM_TEACHER",
          targetType: "Teacher",
          targetId: String(teacherId),
          metadata: { teacherId, armId },
        });

        return NextResponse.json({ ok: true, message: "Class arm unassigned successfully" });
      }
    }

    if (subjectId) {
      // Verify subject exists
      const subjectExists = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId },
      });
      if (!subjectExists) {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }

      if (action === "ASSIGN") {
        await prisma.subject.update({
          where: { id: subjectId },
          data: { teacherId },
        });

        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "SUBJECT_ASSIGNED_TO_TEACHER",
          targetType: "Teacher",
          targetId: String(teacherId),
          metadata: { teacherId, subjectId },
        });

        return NextResponse.json({ ok: true, message: "Subject assigned successfully" });
      } else {
        // UNASSIGN
        if (subjectExists.teacherId !== teacherId) {
          return NextResponse.json(
            { error: "Subject is not assigned to this teacher" },
            { status: 400 }
          );
        }

        await prisma.subject.update({
          where: { id: subjectId },
          data: { teacherId: null },
        });

        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "SUBJECT_UNASSIGNED_FROM_TEACHER",
          targetType: "Teacher",
          targetId: String(teacherId),
          metadata: { teacherId, subjectId },
        });

        return NextResponse.json({ ok: true, message: "Subject unassigned successfully" });
      }
    }
  }

  // Regular teacher update
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Check teacher exists
  const existing = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    include: { user: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  try {
    // Update user if name or isActive changed
    if (data.name !== undefined || data.isActive !== undefined) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "TEACHER_UPDATED",
      targetType: "Teacher",
      targetId: String(teacherId),
      metadata: {
        teacherId,
        updates: Object.keys(data),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update teacher";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "teachers");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawTeacherId } = await params;

  let teacherId: number;
  try {
    teacherId = parseNumericId(rawTeacherId, "teacher id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid teacher ID";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";

  // Check teacher exists
  const existing = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    include: { user: true, classes: true, classArms: true, subjects: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  // Check if teacher has assigned classes, arms, or subjects
  if (existing.classes.length > 0) {
    return NextResponse.json(
      { error: `Cannot deactivate teacher with ${existing.classes.length} assigned class(es). Unassign all classes first.` },
      { status: 409 }
    );
  }

  if (existing.classArms.length > 0) {
    return NextResponse.json(
      { error: `Cannot deactivate teacher with ${existing.classArms.length} assigned class arm(s). Unassign all arms first.` },
      { status: 409 }
    );
  }

  if (existing.subjects.length > 0) {
    return NextResponse.json(
      { error: `Cannot deactivate teacher with ${existing.subjects.length} assigned subject(s). Unassign all subjects first.` },
      { status: 409 }
    );
  }

  try {
    // Soft delete by deactivating user
    await prisma.user.update({
      where: { id: existing.userId },
      data: { isActive: false },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "TEACHER_DEACTIVATED",
      targetType: "Teacher",
      targetId: String(teacherId),
      metadata: {
        teacherId,
        userId: existing.userId,
        name: existing.user.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to deactivate teacher";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
