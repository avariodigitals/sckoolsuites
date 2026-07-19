import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { checkPrivilege } from "@/lib/privileges";

const createSchema = z.object({
  subjectId: z.coerce.number().int().min(1),
  classId: z.coerce.number().int().min(1).optional(),
  title: z.string().min(1).max(200),
  note: z.string().max(10000).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await checkPrivilege(session.user.id, "lms.manage");
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

  const subject = await prisma.subject.findFirst({
    where: { id: parsed.data.subjectId, schoolId },
  });
  if (!subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  if (!isAdmin && subject.teacherId !== teacher?.id) {
    const cls = parsed.data.classId
      ? await prisma.class.findFirst({ where: { id: parsed.data.classId, schoolId } })
      : null;
    if (!cls || cls.teacherId !== teacher?.id) {
      return NextResponse.json(
        { error: "You can only create lessons for your assigned subjects or classes" },
        { status: 403 }
      );
    }
  }

  const lesson = await prisma.lesson.create({
    data: {
      schoolId,
      subjectId: parsed.data.subjectId,
      teacherId: teacher?.id ?? subject.teacherId ?? 0,
      classId: parsed.data.classId ?? subject.classId ?? null,
      title: parsed.data.title,
      note: parsed.data.note ?? "",
    },
    include: { subject: true, class: true },
  });

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: "LESSON_CREATED",
    targetType: "Lesson",
    targetId: lesson.id,
    metadata: {
      lessonId: lesson.id,
      subjectId: parsed.data.subjectId,
      title: parsed.data.title,
    },
  });

  return NextResponse.json({ ok: true, lesson }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const delAllowed = await checkPrivilege(session.user.id, "lms.manage");
  if (!delAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing lesson id" }, { status: 400 });
  }

  const lessonId = parseInt(id, 10);
  if (Number.isNaN(lessonId)) {
    return NextResponse.json({ error: "Invalid lesson id" }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const isAdmin = await checkPrivilege(session.user.id, "students.manage");

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, schoolId },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (!isAdmin) {
    const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: session.user.id } });
    if (!teacher || lesson.teacherId !== teacher.id) {
      return NextResponse.json({ error: "You can only delete your own lessons" }, { status: 403 });
    }
  }

  await prisma.lesson.delete({ where: { id: lessonId } });

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: "LESSON_DELETED",
    targetType: "Lesson",
    targetId: lessonId,
    metadata: { lessonId, title: lesson.title },
  });

  return NextResponse.json({ ok: true });
}
