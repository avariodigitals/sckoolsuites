import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { Prisma } from "@prisma/client";

type ImportType = "students" | "parents" | "staff";

function isAuthorized(role?: string) {
  return role
    ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role)
    : false;
}

function calcAgeFromDOB(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd + "@1";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const body = await request.json();
  const type = body.type as ImportType;
  const rows: Record<string, unknown>[] = body.rows ?? [];

  if (!type || !["students", "parents", "staff"].includes(type)) {
    return NextResponse.json({ error: "Invalid import type" }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "Maximum 500 rows per import" }, { status: 400 });
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  if (type === "students") {
    const studentRole = await prisma.role.findUnique({ where: { name: "STUDENT" } });
    if (!studentRole) {
      return NextResponse.json({ error: "Student role not found" }, { status: 500 });
    }

    const [currentSession, currentTerm] = await Promise.all([
      prisma.session.findFirst({ where: { schoolId, isCurrent: true } }),
      prisma.term.findFirst({ where: { schoolId, isCurrent: true } }),
    ]);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `Row ${i + 1}`;
      try {
        const firstName = String(row.firstName ?? "").trim();
        const lastName = String(row.lastName ?? "").trim();
        const email = String(row.email ?? "").trim().toLowerCase();
        const gender = String(row.gender ?? "").trim().toUpperCase() as "MALE" | "FEMALE" | "OTHER";

        if (!firstName || !lastName || !email || !gender) {
          errors.push(`${rowLabel}: Missing required fields`);
          failed++;
          continue;
        }
        if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
          errors.push(`${rowLabel}: Invalid gender "${gender}"`);
          failed++;
          continue;
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          errors.push(`${rowLabel}: Email "${email}" already in use`);
          failed++;
          continue;
        }

        const middleName = row.middleName ? String(row.middleName).trim() : null;
        const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
        const dobStr = row.dateOfBirth ? String(row.dateOfBirth).trim() : "";
        const age = row.age ? Number(row.age) : dobStr ? calcAgeFromDOB(dobStr) : 10;
        const admissionNo = row.admissionNo ? String(row.admissionNo).trim() : null;
        const sportHouse = row.sportHouse ? String(row.sportHouse).trim() : null;

        let classId: number | null = null;
        if (row.className) {
          const cls = await prisma.class.findFirst({
            where: { schoolId, name: { equals: String(row.className).trim(), mode: "insensitive" } },
          });
          if (cls) classId = cls.id;
        }

        const plaintextPassword = email.split("@")[0] + "123";
        const hashedPassword = await hashPassword(plaintextPassword);

        let parentId: number | null = null;
        const guardianName = row.guardianName ? String(row.guardianName).trim() : "";
        const guardianEmail = row.guardianEmail ? String(row.guardianEmail).trim().toLowerCase() : "";

        if (guardianName && guardianEmail) {
          const existingGuardian = await prisma.user.findUnique({ where: { email: guardianEmail } });
          if (existingGuardian) {
            const existingParent = await prisma.parent.findFirst({
              where: { userId: existingGuardian.id, schoolId },
            });
            if (existingParent) {
              parentId = existingParent.id;
            }
          } else {
            const parentRole = await prisma.role.findUnique({ where: { name: "PARENT" } });
            if (parentRole) {
              const guardianPassword = guardianEmail.split("@")[0] + "123";
              const guardianUser = await prisma.user.create({
                data: {
                  schoolId,
                  roleId: parentRole.id,
                  name: guardianName,
                  email: guardianEmail,
                  phone: row.guardianPhone ? String(row.guardianPhone).trim() : null,
                  password: await hashPassword(guardianPassword),
                  isActive: true,
                },
              });
              const parent = await prisma.parent.create({
                data: { schoolId, userId: guardianUser.id },
              });
              parentId = parent.id;
            }
          }
        }

        const studentData: Record<string, unknown> = {
          schoolId,
          roleId: studentRole.id,
          name: fullName,
          email,
          password: hashedPassword,
          isActive: true,
        };

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const user = await tx.user.create({ data: studentData as any });

          const sData: Record<string, unknown> = {
            schoolId,
            userId: user.id,
            parentId,
            classId,
            firstName,
            middleName,
            lastName,
            gender,
            age,
            admissionNo,
            sportHouse,
          };
          if (dobStr) sData.dateOfBirth = new Date(dobStr);

          const student = await tx.student.create({ data: sData as any });

          if (currentSession && currentTerm) {
            await tx.studentEnrollment.create({
              data: {
                studentId: student.id,
                sessionId: currentSession.id,
                termId: currentTerm.id,
                classId,
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
          metadata: { importBatch: true, name: fullName, email },
        });

        success++;
      } catch (err) {
        errors.push(`${rowLabel}: ${err instanceof Error ? err.message : "Unknown error"}`);
        failed++;
      }
    }
  } else if (type === "parents") {
    const parentRole = await prisma.role.findUnique({ where: { name: "PARENT" } });
    if (!parentRole) {
      return NextResponse.json({ error: "Parent role not found" }, { status: 500 });
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `Row ${i + 1}`;
      try {
        const name = String(row.name ?? "").trim();
        const email = String(row.email ?? "").trim().toLowerCase();

        if (!name || !email) {
          errors.push(`${rowLabel}: Missing required fields`);
          failed++;
          continue;
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          errors.push(`${rowLabel}: Email "${email}" already in use`);
          failed++;
          continue;
        }

        const plaintextPassword = email.split("@")[0] + "123";
        const hashedPassword = await hashPassword(plaintextPassword);
        const phone = row.phone ? String(row.phone).trim() : null;
        const occupation = row.occupation ? String(row.occupation).trim() : null;
        const homeAddress = row.homeAddress ? String(row.homeAddress).trim() : null;

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const user = await tx.user.create({
            data: {
              schoolId,
              roleId: parentRole.id,
              name,
              email,
              phone,
              password: hashedPassword,
              isActive: true,
            },
          });

          const parent = await tx.parent.create({
            data: {
              schoolId,
              userId: user.id,
              occupation,
              homeAddress,
            },
          });

          return { user, parent };
        });

        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "PARENT_CREATED",
          targetType: "Parent",
          targetId: String(result.parent.id),
          metadata: { importBatch: true, name, email },
        });

        success++;
      } catch (err) {
        errors.push(`${rowLabel}: ${err instanceof Error ? err.message : "Unknown error"}`);
        failed++;
      }
    }
  } else if (type === "staff") {
    const teacherRole = await prisma.role.findUnique({ where: { name: "TEACHER" } });
    if (!teacherRole) {
      return NextResponse.json({ error: "Teacher role not found" }, { status: 500 });
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `Row ${i + 1}`;
      try {
        const name = String(row.name ?? "").trim();
        const email = String(row.email ?? "").trim().toLowerCase();

        if (!name || !email) {
          errors.push(`${rowLabel}: Missing required fields`);
          failed++;
          continue;
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          errors.push(`${rowLabel}: Email "${email}" already in use`);
          failed++;
          continue;
        }

        const plaintextPassword = generateTempPassword();
        const hashedPassword = await hashPassword(plaintextPassword);
        const designation = row.designation ? String(row.designation).trim().toUpperCase() : null;
        const phone = row.phone ? String(row.phone).trim() : null;

        let classGroupId: number | null = null;
        if (row.className) {
          const cg = await prisma.classGroup.findFirst({
            where: { schoolId, name: { equals: String(row.className).trim(), mode: "insensitive" } },
          });
          if (cg) classGroupId = cg.id;
        }

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const user = await tx.user.create({
            data: {
              schoolId,
              roleId: teacherRole.id,
              name,
              email,
              phone,
              password: hashedPassword,
              isActive: true,
              mustChangePassword: true,
            },
          });

          const teacher = await tx.teacher.create({
            data: {
              schoolId,
              userId: user.id,
              designation: designation as any,
              classGroupId,
            },
          });

          return { user, teacher };
        });

        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "TEACHER_CREATED",
          targetType: "Teacher",
          targetId: String(result.teacher.id),
          metadata: { importBatch: true, name, email },
        });

        success++;
      } catch (err) {
        errors.push(`${rowLabel}: ${err instanceof Error ? err.message : "Unknown error"}`);
        failed++;
      }
    }
  }

  return NextResponse.json({
    result: {
      total: rows.length,
      success,
      failed,
      errors: errors.slice(0, 50),
    },
  });
}
