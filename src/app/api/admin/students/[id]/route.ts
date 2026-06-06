import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  age: z.number().int().min(3).max(30).optional(),
  classId: z.string().min(5).optional().nullable(),
  parentId: z.string().min(5).optional().nullable(),
  sportHouse: z.string().max(50).optional().nullable(),
  coCurricular: z.string().max(200).optional().nullable(),
  responsibilities: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
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
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  // Check student exists
  const existing = await prisma.student.findFirst({
    where: { id, schoolId },
    include: { user: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Validate class if provided
  if (data.classId) {
    const classExists = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
    });
    if (!classExists) {
      return NextResponse.json({ error: "Invalid class selected" }, { status: 400 });
    }
  }

  // Validate parent if provided
  if (data.parentId) {
    const parentExists = await prisma.parent.findFirst({
      where: { id: data.parentId, schoolId },
    });
    if (!parentExists) {
      return NextResponse.json({ error: "Invalid parent selected" }, { status: 400 });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Update user if name or isActive changed
      if (data.name !== undefined || data.isActive !== undefined) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(data.name !== undefined ? { name: data.name.trim() } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          },
        });
      }

      // Update student
      const student = await tx.student.update({
        where: { id },
        data: {
          ...(data.gender !== undefined ? { gender: data.gender } : {}),
          ...(data.age !== undefined ? { age: data.age } : {}),
          ...(data.classId !== undefined ? { classId: data.classId } : {}),
          ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
          ...(data.sportHouse !== undefined ? { sportHouse: data.sportHouse?.trim() || null } : {}),
          ...(data.coCurricular !== undefined ? { coCurricular: data.coCurricular?.trim() || null } : {}),
          ...(data.responsibilities !== undefined ? { responsibilities: data.responsibilities?.trim() || null } : {}),
        },
        include: {
          user: true,
          class: true,
          parent: { include: { user: true } },
        },
      });

      return student;
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "STUDENT_UPDATED",
      targetType: "Student",
      targetId: id,
      metadata: {
        studentId: id,
        updates: Object.keys(data),
      },
    });

    return NextResponse.json({
      student: {
        id: result.id,
        userId: result.userId,
        name: result.user.name,
        email: result.user.email,
        gender: result.gender,
        age: result.age,
        classId: result.classId,
        className: result.class?.name ?? null,
        parentId: result.parentId,
        parentName: result.parent?.user.name ?? null,
        sportHouse: result.sportHouse,
        coCurricular: result.coCurricular,
        responsibilities: result.responsibilities,
        passportUrl: result.passportUrl,
        isActive: result.user.isActive,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update student";
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

  // Check student exists
  const existing = await prisma.student.findFirst({
    where: { id, schoolId },
    include: { user: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
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
      action: "STUDENT_DEACTIVATED",
      targetType: "Student",
      targetId: id,
      metadata: {
        studentId: id,
        userId: existing.userId,
        name: existing.user.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to deactivate student";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
