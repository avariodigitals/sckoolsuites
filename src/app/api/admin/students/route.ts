import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { sendWelcomeEmail, sendTemplatedEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

const guardianSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  relationship: z.string().min(1).max(30).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  employerName: z.string().max(120).optional().nullable(),
  workAddress: z.string().max(300).optional().nullable(),
  workPhone: z.string().max(20).optional().nullable(),
  homeAddress: z.string().max(300).optional().nullable(),
  idDocumentType: z.string().max(50).optional().nullable(),
  idDocumentNumber: z.string().max(50).optional().nullable(),
  isPrimary: z.boolean().default(true),
});

const createSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  firstName: z.string().min(1).max(80).optional(),
  middleName: z.string().max(80).optional().nullable(),
  lastName: z.string().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  age: z.number().int().min(3).max(30),
  dateOfBirth: z.string().optional().nullable(),
  classId: z.coerce.number().optional().nullable(),
  armId: z.coerce.number().optional().nullable(),
  parentId: z.coerce.number().optional().nullable(),
  admissionNo: z.string().max(50).optional().nullable(),
  sportHouse: z.string().max(50).optional().nullable(),
  coCurricular: z.string().max(200).optional().nullable(),
  responsibilities: z.string().max(200).optional().nullable(),
  guardian: guardianSchema.optional().nullable(),
}).refine(
  (data) => data.firstName || data.name,
  { message: "Either firstName or name is required" }
);

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const url = new URL(request.url);
  const rawSessionId = url.searchParams.get("sessionId");
  const rawTermId = url.searchParams.get("termId");
  const sessionId = rawSessionId ? Number(rawSessionId) : undefined;
  const termId = rawTermId ? Number(rawTermId) : undefined;

  // If session/term provided, prefer students enrolled in that period,
  // but still show all students if none match (prevents "missing" newly admitted students)
  let studentWhere: Prisma.StudentWhereInput = { schoolId };
  if (sessionId && termId && !Number.isNaN(sessionId) && !Number.isNaN(termId)) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { sessionId, termId },
      select: { studentId: true },
    });
    const ids = enrollments.map((e) => e.studentId);
    if (ids.length > 0) {
      studentWhere = { id: { in: ids }, schoolId };
    }
    // If no enrollments match, fall through to show all students
  }

  const [students, classes, parents, arms] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      include: {
        user: true,
        class: true,
        parent: { include: { user: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.parent.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.classArm.findMany({ where: { schoolId, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    students: students.map((student) => ({
      id: student.id,
      userId: student.userId,
      name: student.user.name,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      email: student.user.email,
      gender: student.gender,
      age: student.age,
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
      classId: student.classId,
      className: student.class?.name ?? null,
      armId: student.armId,
      parentId: student.parentId,
      admissionNo: student.admissionNo,
      parentName: student.parent?.user.name ?? null,
      sportHouse: student.sportHouse,
      coCurricular: student.coCurricular,
      responsibilities: student.responsibilities,
      passportUrl: student.passportUrl,
      isActive: student.user.isActive,
      createdAt: student.createdAt.toISOString(),
    })),
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    parents: parents.map((p) => ({ id: p.id, name: p.user.name, email: p.user.email })),
    arms: arms.map((a) => ({ id: a.id, name: a.name, classId: a.classId })),
  });
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

  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const data = parsed.data;

  // Compute split name fields and full name
  let firstName: string;
  let middleName: string | null;
  let lastName: string;
  let fullName: string;

  if (data.firstName) {
    firstName = data.firstName.trim();
    middleName = data.middleName?.trim() || null;
    lastName = data.lastName?.trim() || "";
    if (!lastName && data.name) {
      const parts = data.name.trim().split(/\s+/);
      lastName = parts[parts.length - 1] || "Unknown";
    }
    if (!lastName) lastName = "Unknown";
    fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  } else {
    const parts = (data.name ?? "").trim().split(/\s+/);
    firstName = parts[0] || "Unknown";
    lastName = parts.length >= 2 ? parts[parts.length - 1] : "Unknown";
    middleName = parts.length >= 3 ? parts.slice(1, -1).join(" ") : null;
    fullName = data.name ?? `${firstName} ${lastName}`.trim();
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // Validate class if provided
  if (data.classId) {
    const classExists = await prisma.class.findFirst({
      where: { id: data.classId, schoolId },
    });
    if (!classExists) {
      return NextResponse.json({ error: "Invalid class selected" }, { status: 400 });
    }
  }

  // Validate parent if provided
  if (data.parentId) {
    const parentExists = await prisma.parent.findFirst({
      where: { id: data.parentId, schoolId },
    });
    if (!parentExists) {
      return NextResponse.json({ error: "Invalid parent selected" }, { status: 400 });
    }
  }

  // Validate arm if provided
  if (data.armId) {
    const armExists = await prisma.classArm.findFirst({
      where: { id: data.armId, schoolId },
    });
    if (!armExists) {
      return NextResponse.json({ error: "Invalid class arm selected" }, { status: 400 });
    }
  }

  // Generate admission number if not provided
  const admissionNo = data.admissionNo?.trim() || null;

  try {
    // Get STUDENT role
    const studentRole = await prisma.role.findUnique({
      where: { name: "STUDENT" },
    });
    if (!studentRole) {
      return NextResponse.json({ error: "Student role not found" }, { status: 500 });
    }

    // Hash password (use provided or default to email local part)
    const plaintextPassword = data.password || data.email.split("@")[0] + "123";
    const hashedPassword = await hashPassword(plaintextPassword);

    // Get current session/term for auto-enrollment
    const [currentSession, currentTerm] = await Promise.all([
      prisma.session.findFirst({ where: { schoolId, isCurrent: true } }),
      prisma.term.findFirst({ where: { schoolId, isCurrent: true } }),
    ]);

    // Track guardian info for post-transaction email notifications
    let guardianEmailInfo = null as { email: string; password: string; name: string; isNew: boolean } | null;
    let createdGuardian = false;

    // Create user and student in transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          schoolId,
          roleId: studentRole.id,
          name: fullName,
          email: data.email,
          password: hashedPassword,
          isActive: true,
        },
      });

      let parentId = data.parentId ?? null;
      let createdGuardian = false;
      const guardianRelationship = data.guardian?.relationship?.trim() || "Guardian";
      const guardianIsPrimary = data.guardian?.isPrimary ?? true;

      // Create a new guardian/parent if supplied and no existing parent selected
      if (!parentId && data.guardian?.name?.trim()) {
        const parentRole = await tx.role.findUnique({ where: { name: "PARENT" } });
        if (!parentRole) throw new Error("Parent role not found");

        const guardianEmail = data.guardian.email?.trim().toLowerCase();
        if (guardianEmail) {
          const existing = await tx.user.findUnique({ where: { email: guardianEmail } });
          if (existing) throw new Error("Guardian email already in use");
        }

        const password = guardianEmail ? guardianEmail.split("@")[0] + "123" : "parent123";
        const guardianUser = await tx.user.create({
          data: {
            schoolId,
            roleId: parentRole.id,
            name: data.guardian.name.trim(),
            email: guardianEmail || `${Date.now()}@guardian.local`,
            phone: data.guardian.phone?.trim() || null,
            password: await hashPassword(password),
            isActive: true,
          },
        });

        const parent = await tx.parent.create({
          data: {
            schoolId,
            userId: guardianUser.id,
            occupation: data.guardian.occupation?.trim() || null,
            employerName: data.guardian.employerName?.trim() || null,
            workAddress: data.guardian.workAddress?.trim() || null,
            workPhone: data.guardian.workPhone?.trim() || null,
            homeAddress: data.guardian.homeAddress?.trim() || null,
            idDocumentType: data.guardian.idDocumentType?.trim() || null,
            idDocumentNumber: data.guardian.idDocumentNumber?.trim() || null,
          },
        });

        parentId = parent.id;
        createdGuardian = true;
        guardianEmailInfo = {
          email: guardianUser.email!,
          password,
          name: data.guardian.name.trim(),
          isNew: true,
        };
      }

      const student = await tx.student.create({
        data: {
          schoolId,
          userId: user.id,
          parentId,
          classId: data.classId ?? null,
          armId: data.armId ?? null,
          admissionNo,
          firstName,
          middleName,
          lastName,
          gender: data.gender,
          age: data.age,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          sportHouse: data.sportHouse?.trim() || null,
          coCurricular: data.coCurricular?.trim() || null,
          responsibilities: data.responsibilities?.trim() || null,
        },
      });

      if (createdGuardian && parentId) {
        try {
          await tx.studentGuardian.create({
            data: {
              studentId: student.id,
              parentId,
              relationship: guardianRelationship,
              isPrimary: guardianIsPrimary,
            },
          });
        } catch {
          // Ignore if junction table is not available
        }
      }

      // Auto-enroll in current session/term
      if (currentSession && currentTerm) {
        await tx.studentEnrollment.create({
          data: {
            studentId: student.id,
            sessionId: currentSession.id,
            termId: currentTerm.id,
            classId: data.classId ?? null,
            promotionStatus: "ACTIVE",
          },
        });
      }

      return { user, student };
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "STUDENT_CREATED",
      targetType: "Student",
      targetId: String(result.student.id),
      metadata: {
        studentId: result.student.id,
        userId: result.user.id,
        name: fullName,
        email: data.email,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    // Send welcome email with login credentials
    let emailStatus: { sent: boolean; error?: string } = { sent: false };
    try {
      const emailResult = await sendWelcomeEmail({
        schoolId,
        to: data.email,
        userName: fullName,
        email: data.email,
        password: plaintextPassword,
        role: "Student",
      });
      emailStatus = { sent: emailResult.ok, error: emailResult.ok ? undefined : (emailResult as any).error ?? "Email delivery failed" };
    } catch (error) {
      emailStatus = {
        sent: false,
        error: error instanceof Error ? error.message : "Email delivery failed",
      };
    }

    // Send welcome email to new guardian or notify existing guardian about child access
    let guardianEmailStatus: { sent: boolean; error?: string } | null = null;
    if (guardianEmailInfo?.isNew && guardianEmailInfo.email) {
      try {
        const guardianResult = await sendWelcomeEmail({
          schoolId,
          to: guardianEmailInfo.email,
          userName: guardianEmailInfo.name,
          email: guardianEmailInfo.email,
          password: guardianEmailInfo.password,
          role: "Parent",
        });
        guardianEmailStatus = { sent: guardianResult.ok, error: guardianResult.ok ? undefined : (guardianResult as any).error ?? "Email delivery failed" };
      } catch (error) {
        guardianEmailStatus = { sent: false, error: error instanceof Error ? error.message : "Email delivery failed" };
      }
    } else if (data.parentId && !createdGuardian) {
      // Notify existing parent about new child access
      try {
        const existingParent = await prisma.parent.findFirst({
          where: { id: data.parentId, schoolId },
          include: { user: true },
        });
        if (existingParent?.user?.email) {
          const school = await prisma.school.findUnique({ where: { id: schoolId } });
          const notifyResult = await sendTemplatedEmail({
            schoolId,
            to: existingParent.user.email,
            templateKey: "guardian_notification",
            vars: {
              schoolName: school?.name ?? "Sckool Suite",
              parentName: existingParent.user.name ?? "Parent",
              studentName: fullName,
              portalUrl: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "",
            },
          });
          guardianEmailStatus = { sent: notifyResult.ok, error: notifyResult.ok ? undefined : "Email delivery failed" };
        }
      } catch (error) {
        guardianEmailStatus = { sent: false, error: error instanceof Error ? error.message : "Email delivery failed" };
      }
    }

    return NextResponse.json({
      student: {
        id: result.student.id,
        userId: result.user.id,
        name: result.user.name,
        firstName: result.student.firstName,
        middleName: result.student.middleName,
        lastName: result.student.lastName,
        email: result.user.email,
        gender: result.student.gender,
        age: result.student.age,
        dateOfBirth: result.student.dateOfBirth ? result.student.dateOfBirth.toISOString() : null,
        classId: result.student.classId,
        armId: result.student.armId,
        parentId: result.student.parentId,
        admissionNo: result.student.admissionNo,
        isActive: true,
        createdAt: result.student.createdAt.toISOString(),
      },
      emailStatus,
      guardianEmailStatus,
      message: emailStatus.sent
        ? "Student created and welcome email sent."
        : "Student created, but welcome email could not be delivered. Please resend credentials manually.",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create student";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
