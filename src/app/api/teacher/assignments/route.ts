import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { checkPrivilege } from "@/lib/privileges";

const createSchema = z.object({
  subjectId: z.coerce.number().int().min(1).optional(),
  classId: z.coerce.number().int().min(1).optional(),
  lessonId: z.coerce.number().int().min(1).optional(),
  title: z.string().min(1).max(200),
  instruction: z.string().max(5000),
  dueDate: z.string(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await checkPrivilege(session.user.id, "assessments.manage");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const isAdmin = await checkPrivilege(session.user.id, "students.manage");

  const teacher = isAdmin
    ? null
    : await prisma.teacher.findFirst({ where: { schoolId, userId: session.user.id } });
  if (!isAdmin && !teacher) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  // Verify subject if provided
  if (parsed.data.subjectId) {
    const subject = await prisma.subject.findFirst({
      where: { id: parsed.data.subjectId, schoolId },
    });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }
    if (!isAdmin && subject.teacherId !== teacher?.id) {
      return NextResponse.json(
        { error: "You can only create assignments for your assigned subjects" },
        { status: 403 }
      );
    }
  }

  // Verify class if provided
  if (parsed.data.classId) {
    const cls = await prisma.class.findFirst({
      where: { id: parsed.data.classId, schoolId },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
  }

  const dueDate = new Date(parsed.data.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      schoolId,
      subjectId: parsed.data.subjectId ?? null,
      teacherId: teacher?.id ?? 0,
      classId: parsed.data.classId ?? null,
      lessonId: parsed.data.lessonId ?? null,
      title: parsed.data.title,
      instruction: parsed.data.instruction,
      dueDate,
    },
    include: { subject: true, class: true, lesson: true },
  });

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: "ASSIGNMENT_CREATED",
    targetType: "Assignment",
    targetId: assignment.id,
    metadata: {
      assignmentId: assignment.id,
      title: parsed.data.title,
      subjectId: parsed.data.subjectId,
    },
  });

  return NextResponse.json({ ok: true, assignment }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const delAllowed = await checkPrivilege(session.user.id, "assessments.manage");
  if (!delAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing assignment id" }, { status: 400 });
  }

  const assignmentId = parseInt(id, 10);
  if (Number.isNaN(assignmentId)) {
    return NextResponse.json({ error: "Invalid assignment id" }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const isAdmin = await checkPrivilege(session.user.id, "students.manage");

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, schoolId },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  if (!isAdmin) {
    const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: session.user.id } });
    if (!teacher || assignment.teacherId !== teacher.id) {
      return NextResponse.json({ error: "You can only delete your own assignments" }, { status: 403 });
    }
  }

  await prisma.assignment.delete({ where: { id: assignmentId } });

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: "ASSIGNMENT_DELETED",
    targetType: "Assignment",
    targetId: assignmentId,
    metadata: { assignmentId, title: assignment.title },
  });

  return NextResponse.json({ ok: true });
}
