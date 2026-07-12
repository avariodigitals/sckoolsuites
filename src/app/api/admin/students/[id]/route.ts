import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  age: z.number().int().min(3).max(30).optional(),
  classId: z.coerce.number().int().min(1).optional().nullable(),
  parentId: z.coerce.number().int().min(1).optional().nullable(),
  sportHouse: z.string().max(50).optional().nullable(),
  coCurricular: z.string().max(200).optional().nullable(),
  responsibilities: z.string().max(200).optional().nullable(),
  passportUrl: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  // Check student exists
  const existing = await prisma.student.findFirst({
    where: { id: parsedId, schoolId },
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

  // Check email uniqueness if changing email
  if (data.email && data.email !== existing.user.email) {
    const emailExists = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailExists) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Update user if name, email, or isActive changed
      if (data.name !== undefined || data.isActive !== undefined || data.email !== undefined) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(data.name !== undefined ? { name: data.name.trim() } : {}),
            ...(data.email !== undefined ? { email: data.email.trim() } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          },
        });
      }

      // Update student
      const student = await tx.student.update({
        where: { id: parsedId },
        data: {
          ...(data.gender !== undefined ? { gender: data.gender } : {}),
          ...(data.age !== undefined ? { age: data.age } : {}),
          ...(data.classId !== undefined ? { classId: data.classId } : {}),
          ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
          ...(data.sportHouse !== undefined ? { sportHouse: data.sportHouse?.trim() || null } : {}),
          ...(data.coCurricular !== undefined ? { coCurricular: data.coCurricular?.trim() || null } : {}),
          ...(data.responsibilities !== undefined ? { responsibilities: data.responsibilities?.trim() || null } : {}),
          ...(data.passportUrl !== undefined ? { passportUrl: data.passportUrl?.trim() || null } : {}),
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
      targetId: String(parsedId),
      metadata: {
        studentId: parsedId,
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";
  const url = new URL(request.url);
  const hard = url.searchParams.get("hard") === "true";

  // Check student exists
  const existing = await prisma.student.findFirst({
    where: { id: parsedId, schoolId },
    include: { user: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    if (hard) {
      // Hard delete - remove user (cascades to student via ON DELETE CASCADE)
      await prisma.user.delete({
        where: { id: existing.userId },
      });

      await createAuditLog({
        schoolId,
        actorUserId: session.user.id,
        action: "STUDENT_DELETED",
        targetType: "Student",
        targetId: String(parsedId),
        metadata: {
          studentId: parsedId,
          userId: existing.userId,
          name: existing.user.name,
          hard: true,
        },
      });

      return NextResponse.json({ ok: true, deleted: true });
    }

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
      targetId: String(parsedId),
      metadata: {
        studentId: parsedId,
        userId: existing.userId,
        name: existing.user.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
