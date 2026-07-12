import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";
import { Prisma } from "@prisma/client";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "ACCOUNTANT", "TEACHER"].includes(role) : false;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let numericId: number;
  try {
    numericId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student ID";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const schoolId = "default";

  try {
    // 1. Core student with relations
    const student = await prisma.student.findUnique({
      where: { id: numericId },
      include: {
        user: true,
        class: true,
        parent: { include: { user: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 2. Siblings (other students under same parent)
    let siblings: Array<Prisma.StudentGetPayload<{ include: { user: true; class: true } }>> = [];
    if (student.parentId) {
      const sibRows = await prisma.student.findMany({
        where: { parentId: student.parentId, schoolId, id: { not: numericId } },
        include: { user: true, class: true },
      });
      siblings = sibRows || [];
    }

    // 3. Enrollments with session/term/class
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: numericId },
      include: { session: true, term: true, class: true },
      orderBy: { createdAt: "desc" },
    });

    // 4. Invoices
    const invoices = await prisma.invoice.findMany({
      where: { studentId: numericId },
      include: { term: true, session: true, class: true },
      orderBy: { createdAt: "desc" },
    });

    // 5. Payments
    const payments = await prisma.payment.findMany({
      where: { studentId: numericId },
      include: { invoice: true },
      orderBy: { createdAt: "desc" },
    });

    // 6. Receipts
    const receipts = await prisma.receipt.findMany({
      where: { studentId: numericId },
      orderBy: { createdAt: "desc" },
    });

    // 7. Attendance (last 30 records)
    const attendance = await prisma.attendance.findMany({
      where: { studentId: numericId },
      include: { session: true, term: true, class: true },
      orderBy: { date: "desc" },
      take: 60,
    });

    // 8. Results
    const results = await prisma.result.findMany({
      where: { studentId: numericId },
      include: { term: true, session: true },
      orderBy: { createdAt: "desc" },
    });

    // 9. Scores with subjects
    const scores = await prisma.score.findMany({
      where: { studentId: numericId },
      include: { subject: true, term: true, session: true },
      orderBy: { createdAt: "desc" },
    });

    // 10. Parent messages/complaints
    let messages: any[] = [];
    let complaints: any[] = [];
    if (student.parentId) {
      messages = await prisma.parentMessage.findMany({
        where: { parentId: student.parentId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      complaints = await prisma.parentComplaint.findMany({
        where: { parentId: student.parentId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }

    // 11. Subjects via class
    let subjects: any[] = [];
    if (student.classId) {
      subjects = await prisma.subject.findMany({
        where: { classId: student.classId },
        include: { teacher: { include: { user: true } } },
        orderBy: { name: "asc" },
      });
    }

    // 12. Admission application (if converted)
    const admission = await prisma.admissionApplication.findFirst({
      where: { convertedStudentId: numericId },
      include: { guardians: true, documents: true, qualifications: true },
    });

    // 13. Additional guardians from junction table
    let additionalGuardians: Array<{
      id: number;
      userId: number;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      relationship: string;
    }> = [];
    try {
      const rows = await prisma.studentGuardian.findMany({
        where: { studentId: numericId },
        include: { parent: { include: { user: true } } },
      });
      if (rows) {
        additionalGuardians = rows.map((row) => ({
          id: row.parent.id,
          userId: row.parent.userId,
          name: row.parent.user.name,
          email: row.parent.user.email,
          phone: row.parent.user.phone,
          address: row.parent.user.address,
          relationship: row.relationship ?? "Guardian",
        }));
      }
    } catch {
      // Table may not exist yet
    }

    // 14. Transport route
    let route: any = null;
    if (student.routeId) {
      route = await prisma.route.findUnique({
        where: { id: student.routeId },
        include: { vehicle: true, stops: { orderBy: { order: "asc" } } },
      });
    }

    return NextResponse.json({
      student,
      siblings,
      enrollments,
      invoices,
      payments,
      receipts,
      attendance,
      results,
      scores,
      messages,
      complaints,
      subjects,
      additionalGuardians,
      admission,
      route,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch student details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
