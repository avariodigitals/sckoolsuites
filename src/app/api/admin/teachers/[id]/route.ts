import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
});

const assignSchema = z.object({
  classId: z.string().min(5).optional(),
  subjectId: z.string().min(5).optional(),
  action: z.enum(["ASSIGN", "UNASSIGN"]),
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

  // Check if this is an assignment action
  const assignParsed = assignSchema.safeParse(payload);
  if (assignParsed.success && (assignParsed.data.classId || assignParsed.data.subjectId)) {
    const { classId, subjectId, action } = assignParsed.data;

    // Verify teacher exists
    const teacher = await prisma.teacher.findFirst({
      where: { id, schoolId },
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
        if (classExists.teacherId && classExists.teacherId !== id && classExists.teacher?.user) {
          return NextResponse.json(
            { error: `Class is already assigned to ${classExists.teacher.user.name}` },
            { status: 409 }
          );
        }

        await prisma.class.update({
          where: { id: classId },
          data: { teacherId: id },
        });

        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "CLASS_ASSIGNED_TO_TEACHER",
          targetType: "Teacher",
          targetId: id,
          metadata: { teacherId: id, classId },
        });

        return NextResponse.json({ ok: true, message: "Class assigned successfully" });
      } else {
        // UNASSIGN
        if (classExists.teacherId !== id) {
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
          targetId: id,
          metadata: { teacherId: id, classId },
        });

        return NextResponse.json({ ok: true, message: "Class unassigned successfully" });
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
          data: { teacherId: id },
        });

        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "SUBJECT_ASSIGNED_TO_TEACHER",
          targetType: "Teacher",
          targetId: id,
          metadata: { teacherId: id, subjectId },
        });

        return NextResponse.json({ ok: true, message: "Subject assigned successfully" });
      } else {
        // UNASSIGN
        if (subjectExists.teacherId !== id) {
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
          targetId: id,
          metadata: { teacherId: id, subjectId },
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
    where: { id, schoolId },
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
      targetId: id,
      metadata: {
        teacherId: id,
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
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const schoolId = "default";

  // Check teacher exists
  const existing = await prisma.teacher.findFirst({
    where: { id, schoolId },
    include: { user: true, classes: true, subjects: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  // Check if teacher has assigned classes or subjects
  if (existing.classes.length > 0) {
    return NextResponse.json(
      { error: `Cannot deactivate teacher with ${existing.classes.length} assigned class(es). Unassign all classes first.` },
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
      targetId: id,
      metadata: {
        teacherId: id,
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
