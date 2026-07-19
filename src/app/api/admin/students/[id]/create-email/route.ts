import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createStudentEmailAccount } from "@/lib/email-providers/email-service";
import { z } from "zod";

const createSchema = z.object({
  studentId: z.coerce.number().int().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "REGISTRAR", "PRINCIPAL"];
  if (!adminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session.user.schoolId || "default";
  const parsed = createSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const student = await prisma.student.findFirst({
    where: { id: parsed.data.studentId, schoolId },
    include: { user: true, studentEmailAccount: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (student.studentEmailAccount && student.studentEmailAccount.status === "ACTIVE") {
    return NextResponse.json({
      ok: true,
      created: false,
      emailAddress: student.studentEmailAccount.emailAddress,
      message: "Student already has an active email account",
    });
  }

  try {
    const result = await createStudentEmailAccount({
      schoolId,
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      displayName: student.user.name,
    });

    return NextResponse.json({
      ok: true,
      created: result.created,
      emailAddress: result.emailAddress,
      provider: result.provider,
      message: result.created
        ? `Email account created: ${result.emailAddress}`
        : `Email account already exists: ${result.emailAddress}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create email account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "REGISTRAR", "PRINCIPAL"];
  if (!adminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session.user.schoolId || "default";
  const url = new URL(request.url);
  const studentId = Number(url.searchParams.get("studentId"));

  if (!studentId) {
    return NextResponse.json({ error: "Missing studentId parameter" }, { status: 400 });
  }

  const account = await prisma.studentEmailAccount.findUnique({
    where: { studentId },
  });

  if (!account) {
    return NextResponse.json({ hasEmail: false });
  }

  return NextResponse.json({
    hasEmail: true,
    emailAddress: account.emailAddress,
    status: account.status,
    createdAt: account.createdAt.toISOString(),
  });
}
