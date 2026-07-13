import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { sendTemplatedEmail } from "@/lib/email";
import { parseNumericId } from "@/lib/id-helpers";
import { Prisma } from "@prisma/client";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "admissions");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "admission id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid admission id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  const application = await prisma.admissionApplication.findFirst({
    where: { id: parsedId, schoolId },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (application.status === "APPROVED" && application.convertedStudentId) {
    return NextResponse.json({ error: "Already approved and converted to student" }, { status: 409 });
  }

  // Get required roles and current session/term
  const [studentRole, parentRole, currentSession, currentTerm] = await Promise.all([
    prisma.role.findUnique({ where: { name: "STUDENT" } }),
    prisma.role.findUnique({ where: { name: "PARENT" } }),
    prisma.session.findFirst({ where: { schoolId, isCurrent: true } }),
    prisma.term.findFirst({ where: { schoolId, isCurrent: true } }),
  ]);

  if (!studentRole) {
    return NextResponse.json({ error: "Student role not found" }, { status: 500 });
  }
  if (!parentRole) {
    return NextResponse.json({ error: "Parent role not found" }, { status: 500 });
  }

  try {
    // Fetch guardians before transaction
    const guardians = await prisma.admissionGuardian.findMany({
      where: { applicationId: parsedId },
    });

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check if user already exists
      let user = await tx.user.findUnique({ where: { email: application.email } });
      if (!user) {
        const password = application.email.split("@")[0] + "123";
        const hashedPassword = await hashPassword(password);
        user = await tx.user.create({
          data: {
            schoolId,
            roleId: studentRole.id,
            name: application.name,
            email: application.email,
            password: hashedPassword,
            isActive: true,
          },
        });
      }

      const student = await tx.student.create({
        data: {
          schoolId,
          userId: user.id,
          parentId: null,
          classId: application.applyingForClassId ?? null,
          firstName: (application.name || "Unknown").split(" ")[0],
          lastName: (application.name || "Unknown").split(" ").slice(1).join(" ") || "Unknown",
          gender: application.gender || "OTHER",
          age: application.age ?? 10,
          sportHouse: null,
          coCurricular: null,
          responsibilities: null,
          passportUrl: null,
        },
      });

      // Auto-enroll if current session/term exists
      if (currentSession && currentTerm) {
        await tx.studentEnrollment.create({
          data: {
            studentId: student.id,
            sessionId: currentSession.id,
            termId: currentTerm.id,
            classId: application.applyingForClassId ?? null,
            promotionStatus: "ACTIVE",
          },
        });
      }

      // Create guardian users if new guardians
      const guardianUsers = [];
      for (const g of guardians) {
        if (g.email) {
          const existingGuardianUser = await tx.user.findUnique({ where: { email: g.email } });
          if (!existingGuardianUser) {
            const gPassword = g.email.split("@")[0] + "123";
            const gHashed = await hashPassword(gPassword);
            const guardianUser = await tx.user.create({
              data: {
                schoolId,
                roleId: parentRole.id,
                name: g.name,
                email: g.email,
                phone: g.contactNumber,
                password: gHashed,
                isActive: true,
              },
            });
            const parentRecord = await tx.parent.create({
              data: {
                schoolId,
                userId: guardianUser.id,
                occupation: g.occupation?.trim() || null,
                employerName: g.employerName?.trim() || null,
                workAddress: g.workAddress?.trim() || null,
                workPhone: g.workPhone?.trim() || null,
                homeAddress: g.homeAddress?.trim() || null,
                idDocumentType: g.idDocumentType?.trim() || null,
                idDocumentNumber: g.idDocumentNumber?.trim() || null,
                idDocumentUrl: g.idDocumentUrl?.trim() || null,
                photoUrl: g.photoUrl?.trim() || null,
              },
            });

            // Link guardian to the new student via junction table
            try {
              await tx.studentGuardian.create({
                data: {
                  studentId: student.id,
                  parentId: parentRecord.id,
                  relationship: g.relationship,
                  isPrimary: g.isPrimary ?? false,
                },
              });
            } catch {
              // Ignore if junction table is not available
            }
            guardianUsers.push({
              name: g.name,
              email: g.email,
              password: gPassword,
              relationship: g.relationship,
            });
          }
        }
      }

      // Update application
      await tx.admissionApplication.update({
        where: { id: parsedId },
        data: {
          status: "APPROVED",
          convertedStudentId: student.id,
        },
      });

      return { user, student, guardianUsers };
    });

    // Fetch school info for the letter
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const classRecord = application.applyingForClassId
      ? await prisma.class.findUnique({ where: { id: application.applyingForClassId } })
      : null;

    const password = application.email.split("@")[0] + "123";

    // Send Pre-Admission Letter to applicant
    await sendTemplatedEmail({
      schoolId,
      to: result.user.email,
      templateKey: "pre_admission_letter",
      vars: {
        schoolName: school?.name ?? "School",
        schoolAddress: school?.address ?? "",
        schoolPhone: school?.phone ?? "",
        schoolEmail: school?.email ?? "",
        studentName: result.user.name,
        applicantNumber: application.applicantNumber,
        className: classRecord?.name ?? "Assigned Class",
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
        loginEmail: result.user.email,
        loginPassword: password,
        portalUrl: process.env.NEXTAUTH_URL ?? "",
      },
    });

    // Send notification emails to guardians
    for (const g of result.guardianUsers) {
      await sendTemplatedEmail({
        schoolId,
        to: g.email,
        templateKey: "guardian_notification",
        vars: {
          guardianName: g.name,
          studentName: result.user.name,
          schoolName: school?.name ?? "School",
          applicantNumber: application.applicantNumber,
          className: classRecord?.name ?? "Assigned Class",
          email: g.email,
          password: g.password,
        },
      });
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ADMISSION_APPROVED",
      targetType: "AdmissionApplication",
      targetId: id,
      metadata: {
        applicantNumber: application.applicantNumber,
        studentId: result.student.id,
        userId: result.user.id,
      },
    });

    return NextResponse.json({
      ok: true,
      student: {
        id: String(result.student.id),
        name: result.user.name,
        email: result.user.email,
      },
      guardians: result.guardianUsers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to approve application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
