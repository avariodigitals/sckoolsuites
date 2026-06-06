import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
});

const linkStudentSchema = z.object({
  studentId: z.string().min(5),
  action: z.enum(["LINK", "UNLINK"]),
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

  // Check if this is a student linking action
  const linkParsed = linkStudentSchema.safeParse(payload);
  if (linkParsed.success) {
    const { studentId, action } = linkParsed.data;

    // Verify parent exists
    const parent = await prisma.parent.findFirst({
      where: { id, schoolId },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    // Verify student exists
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (action === "LINK") {
      // Check if student already has a different parent
      if (student.parentId && student.parentId !== id) {
        return NextResponse.json(
          { error: "Student is already linked to another parent" },
          { status: 409 }
        );
      }

      await prisma.student.update({
        where: { id: studentId },
        data: { parentId: id },
      });

      await createAuditLog({
        schoolId,
        actorUserId: session.user.id,
        action: "STUDENT_LINKED_TO_PARENT",
        targetType: "Parent",
        targetId: id,
        metadata: { parentId: id, studentId },
      });

      return NextResponse.json({ ok: true, message: "Student linked successfully" });
    } else {
      // UNLINK
      if (student.parentId !== id) {
        return NextResponse.json(
          { error: "Student is not linked to this parent" },
          { status: 400 }
        );
      }

      await prisma.student.update({
        where: { id: studentId },
        data: { parentId: null },
      });

      await createAuditLog({
        schoolId,
        actorUserId: session.user.id,
        action: "STUDENT_UNLINKED_FROM_PARENT",
        targetType: "Parent",
        targetId: id,
        metadata: { parentId: id, studentId },
      });

      return NextResponse.json({ ok: true, message: "Student unlinked successfully" });
    }
  }

  // Regular parent update
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Check parent exists
  const existing = await prisma.parent.findFirst({
    where: { id, schoolId },
    include: { user: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Parent not found" }, { status: 404 });
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
      action: "PARENT_UPDATED",
      targetType: "Parent",
      targetId: id,
      metadata: {
        parentId: id,
        updates: Object.keys(data),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update parent";
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

  // Check parent exists
  const existing = await prisma.parent.findFirst({
    where: { id, schoolId },
    include: { user: true, students: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Parent not found" }, { status: 404 });
  }

  // Check if parent has linked students
  if (existing.students.length > 0) {
    return NextResponse.json(
      { error: "Cannot deactivate parent with linked students. Unlink all children first." },
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
      action: "PARENT_DEACTIVATED",
      targetType: "Parent",
      targetId: id,
      metadata: {
        parentId: id,
        userId: existing.userId,
        name: existing.user.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to deactivate parent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
