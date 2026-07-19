import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden — students only" }, { status: 403 });
  }

  const body = await request.json();
  const { assignmentId, submissionNote } = body;

  if (!assignmentId) {
    return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
  }

  const student = await prisma.student.findFirst({
    where: { userId: session.user.id },
    select: { id: true, schoolId: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: Number(assignmentId),
      schoolId: student.schoolId,
      OR: [
        { studentId: student.id },
        { studentId: null, classId: { not: null } },
      ],
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found or not assigned to you" }, { status: 404 });
  }

  if (assignment.submittedAt) {
    return NextResponse.json({ error: "Assignment already submitted" }, { status: 400 });
  }

  const updated = await prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      submittedAt: new Date(),
      submissionNote: submissionNote?.trim() || null,
      studentId: student.id,
    },
  });

  return NextResponse.json({
    success: true,
    assignment: {
      id: updated.id,
      submittedAt: updated.submittedAt,
      submissionNote: updated.submissionNote,
    },
  });
}
