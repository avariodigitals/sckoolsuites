import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { createNotification, createNotificationsForRoles } from "@/lib/notification-helpers";

const notifySchema = z.object({
  studentId: z.number(),
  date: z.string().min(2),
  reason: z.string().min(3),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parent = await prisma.parent.findFirst({
    where: { userId: session.user.id },
  });

  if (!parent) {
    return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
  }

  const parsed = notifySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { studentId, date, reason, notes } = parsed.data;

  const student = await prisma.student.findFirst({
    where: { id: studentId, parentId: parent.id },
    include: { class: true, classArm: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found or not linked to this parent" }, { status: 404 });
  }

  const schoolId = student.schoolId;
  const studentName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
  const className = student.class?.name ?? "Not assigned";

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: "PARENT_ABSENCE_NOTIFICATION",
    targetType: "Student",
    targetId: String(studentId),
    metadata: {
      studentId,
      studentName,
      date,
      reason,
      notes: notes ?? null,
    },
  });

  const rolesToNotify = ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"];
  
  const studentClass = student.class;
  if (studentClass?.teacherId) {
    const classTeacher = await prisma.teacher.findUnique({
      where: { id: studentClass.teacherId },
      select: { userId: true },
    });
    if (classTeacher) {
      await createNotification({
        schoolId,
        userId: classTeacher.userId,
        type: "attendance",
        title: `Absence Notification: ${studentName}`,
        body: `Parent has notified that ${studentName} (${className}) will be absent on ${date}. Reason: ${reason}.${notes ? ` Notes: ${notes}` : ""}`,
        link: "/admin/attendance",
        actorUserId: session.user.id,
        metadata: { studentId, date, reason, notes: notes ?? null },
      });
    }
  }

  await createNotificationsForRoles(schoolId, rolesToNotify, {
    type: "attendance",
    title: `Absence Notification: ${studentName}`,
    body: `Parent has notified that ${studentName} (${className}) will be absent on ${date}. Reason: ${reason}.${notes ? ` Notes: ${notes}` : ""}`,
    link: "/admin/attendance",
    actorUserId: session.user.id,
    excludeActorUserId: session.user.id,
    metadata: { studentId, date, reason, notes: notes ?? null },
  });

  return NextResponse.json({ ok: true, message: "Notification sent to school." });
}
