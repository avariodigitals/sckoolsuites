import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = new Set(["TEACHER", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"]);
  if (!allowedRoles.has(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";

  try {
    const url = new URL(request.url);
    const sessionId = Number(url.searchParams.get("sessionId") ?? "NaN");
    const termId = Number(url.searchParams.get("termId") ?? "NaN");

    const isAdmin = ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(session.user.role);
    const teacher = isAdmin
      ? null
      : await prisma.teacher.findFirst({ where: { schoolId, userId: session.user.id } });

    if (!isAdmin && !teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const where: any = {
      schoolId,
      ...(Number.isNaN(sessionId) ? {} : { sessionId }),
      ...(Number.isNaN(termId) ? {} : { termId }),
    };

    if (!isAdmin && teacher) {
      const assignedClasses = await prisma.class.findMany({
        where: { OR: [{ teacherId: teacher.id }, { classArms: { some: { teacherId: teacher.id } } }] },
        select: { id: true, classArms: { select: { id: true } } },
      });

      const classIds = assignedClasses.map((item: any) => item.id);
      const armIds = assignedClasses.flatMap((item: any) => item.classArms.map((arm: any) => arm.id));

      where.student = {
        OR: [{ classId: { in: classIds } }, { armId: { in: armIds } }],
      };
    }

    const results = await prisma.result.findMany({
      where,
      include: {
        student: { include: { user: true, class: true } },
        term: true,
        session: true,
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(
      results.map((result: any) => ({
        id: result.id,
        status: result.status,
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        reviewNote: result.reviewNote,
        student: {
          id: result.student.id,
          name: result.student.user.name,
          className: result.student.class?.name ?? "-",
        },
        term: { id: result.term.id, name: result.term.name },
        session: { id: result.session.id, name: result.session.name },
        uploadedBy: result.uploadedBy ? { id: result.uploadedBy.id, name: result.uploadedBy.name } : null,
        createdAt: result.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("[teacher-results]", error);
    return NextResponse.json({ error: "Could not load results" }, { status: 500 });
  }
}
