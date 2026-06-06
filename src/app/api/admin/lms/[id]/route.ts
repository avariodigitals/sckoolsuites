import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const schoolId = "default";

  // Get type from query param
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  if (!type || !["lesson", "assignment", "quiz", "online-class"].includes(type)) {
    return NextResponse.json({ error: "Invalid or missing content type" }, { status: 400 });
  }

  try {
    let action = "";
    let title = "";

    switch (type) {
      case "lesson":
        const lesson = await prisma.lesson.findFirst({
          where: { id, schoolId },
        });
        if (!lesson) {
          return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
        }
        title = lesson.title;
        await prisma.lesson.delete({ where: { id } });
        action = "LESSON_DELETED";
        break;

      case "assignment":
        const assignment = await prisma.assignment.findFirst({
          where: { id, schoolId },
        });
        if (!assignment) {
          return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }
        title = assignment.title;
        await prisma.assignment.delete({ where: { id } });
        action = "ASSIGNMENT_DELETED";
        break;

      case "quiz":
        const quiz = await prisma.quiz.findFirst({
          where: { id, schoolId },
        });
        if (!quiz) {
          return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
        title = quiz.title;
        await prisma.quiz.delete({ where: { id } });
        action = "QUIZ_DELETED";
        break;

      case "online-class":
        const onlineClass = await prisma.onlineClass.findFirst({
          where: { id, schoolId },
        });
        if (!onlineClass) {
          return NextResponse.json({ error: "Online class not found" }, { status: 404 });
        }
        title = onlineClass.title;
        await prisma.onlineClass.delete({ where: { id } });
        action = "ONLINE_CLASS_DELETED";
        break;
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action,
      targetType: "LMS",
      targetId: id,
      metadata: {
        id,
        type,
        title,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
