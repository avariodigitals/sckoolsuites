import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const transferSchema = z.object({
  studentId: z.coerce.number(),
  classId: z.coerce.number(),
  armId: z.coerce.number().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const body = await request.json();
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { studentId, classId, armId } = parsed.data;

  try {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const targetClass = await prisma.class.findFirst({
      where: { id: classId, schoolId },
    });
    if (!targetClass) {
      return NextResponse.json({ error: "Target class not found" }, { status: 404 });
    }

    if (armId) {
      const arm = await prisma.classArm.findFirst({
        where: { id: armId, schoolId, classId },
      });
      if (!arm) {
        return NextResponse.json({ error: "Target arm not found in selected class" }, { status: 404 });
      }
    }

    const previousClassId = student.classId;
    const previousArmId = student.armId;

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        classId,
        armId: armId ?? null,
      },
      include: {
        class: true,
        classArm: true,
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "STUDENT_TRANSFERRED",
      targetType: "Student",
      targetId: String(studentId),
      metadata: {
        studentId,
        fromClassId: previousClassId,
        fromArmId: previousArmId,
        toClassId: classId,
        toArmId: armId ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      student: {
        id: updated.id,
        classId: updated.classId,
        className: updated.class?.name ?? null,
        armId: updated.armId,
        armName: updated.classArm?.name ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
