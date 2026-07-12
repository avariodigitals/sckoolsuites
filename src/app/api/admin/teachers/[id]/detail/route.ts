import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "ACCOUNTANT", "TEACHER"].includes(role) : false;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "teachers");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let teacherId: number;
  try {
    teacherId = parseNumericId(id, "teacher id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid teacher id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  try {
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      include: {
        user: true,
        classes: { orderBy: { name: "asc" } },
        classArms: { include: { class: true }, orderBy: { name: "asc" } },
        subjects: { include: { class: true }, orderBy: { name: "asc" } },
        students: { include: { user: true, class: true }, orderBy: { createdAt: "desc" } },
        lessons: { orderBy: { createdAt: "desc" }, take: 50 },
        assignments: { include: { subject: true }, orderBy: { createdAt: "desc" }, take: 50 },
        quizzes: { include: { subject: true }, orderBy: { createdAt: "desc" }, take: 50 },
        onlineClasses: { include: { subject: true }, orderBy: { createdAt: "desc" }, take: 50 },
        attendances: { include: { student: { include: { user: true } }, class: true }, orderBy: { date: "desc" }, take: 60 },
        scores: { include: { student: { include: { user: true } }, subject: true }, orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({
      teacher,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch teacher details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
