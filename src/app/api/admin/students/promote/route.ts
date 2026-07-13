import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const promoteSchema = z.object({
  promotions: z.array(
    z.object({
      studentId: z.coerce.number().int().min(1),
      action: z.enum(["PROMOTE", "REPEAT", "WITHDRAW"]),
      nextClassId: z.coerce.number().int().optional().nullable(),
    })
  ).min(1),
  sourceSessionId: z.coerce.number().int().min(1),
  sourceTermId: z.coerce.number().int().min(1),
  targetSessionId: z.coerce.number().int().min(1),
  targetTermId: z.coerce.number().int().min(1),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
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
  const parsed = promoteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { promotions, sourceSessionId, sourceTermId, targetSessionId, targetTermId } = parsed.data;
  const schoolId = "default";

  try {
    // Validate target session/term exist and belong to this school
    const [targetSession, targetTerm] = await Promise.all([
      prisma.session.findFirst({ where: { id: targetSessionId, schoolId } }),
      prisma.term.findFirst({ where: { id: targetTermId, schoolId } }),
    ]);
    if (!targetSession || !targetTerm) {
      return NextResponse.json({ error: "Target session or term not found" }, { status: 400 });
    }

    const results = await prisma.$transaction(async (tx: any) => {
      const out: Array<{ studentId: number; action: string; success: boolean; error?: string }> = [];

      for (const p of promotions) {
        // Verify student exists and is enrolled in source session
        const existingEnrollment = await tx.studentEnrollment.findFirst({
          where: {
            studentId: p.studentId,
            sessionId: sourceSessionId,
            termId: sourceTermId,
          },
        });

        if (!existingEnrollment) {
          out.push({ studentId: p.studentId, action: p.action, success: false, error: "Not enrolled in source session" });
          continue;
        }

        // Update source enrollment status
        await tx.studentEnrollment.updateMany({
          where: {
            studentId: p.studentId,
            sessionId: sourceSessionId,
            termId: sourceTermId,
          },
          data: {
            promotionStatus: p.action,
          },
        });

        if (p.action === "WITHDRAW") {
          out.push({ studentId: p.studentId, action: p.action, success: true });
          continue;
        }

        // For PROMOTE or REPEAT, create target enrollment
        const targetClassId = p.action === "PROMOTE" ? (p.nextClassId ?? existingEnrollment.classId) : existingEnrollment.classId;

        // Check if already enrolled in target
        const alreadyEnrolled = await tx.studentEnrollment.findFirst({
          where: {
            studentId: p.studentId,
            sessionId: targetSessionId,
            termId: targetTermId,
          },
        });

        if (alreadyEnrolled) {
          out.push({ studentId: p.studentId, action: p.action, success: false, error: "Already enrolled in target session" });
          continue;
        }

        await tx.studentEnrollment.create({
          data: {
            studentId: p.studentId,
            sessionId: targetSessionId,
            termId: targetTermId,
            classId: targetClassId,
            promotionStatus: "ACTIVE",
          },
        });

        // If promoted to a new class, update the master student record too
        if (p.action === "PROMOTE" && p.nextClassId) {
          await tx.student.updateMany({
            where: { id: p.studentId },
            data: { classId: p.nextClassId },
          });
        }

        out.push({ studentId: p.studentId, action: p.action, success: true });
      }

      return out;
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "STUDENTS_PROMOTED",
      targetType: "StudentEnrollment",
      targetId: targetSessionId,
      metadata: {
        sourceSessionId,
        sourceTermId,
        targetSessionId,
        targetTermId,
        promotions: results,
      },
    });

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Promotion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
