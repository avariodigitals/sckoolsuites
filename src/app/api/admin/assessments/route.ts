import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  headings: z.array(z.object({ name: z.string().min(1), description: z.string().optional() })).optional(),
  gradingScale: z.array(z.object({ min: z.number(), grade: z.string(), gpa: z.number().optional(), label: z.string().optional() })).optional(),
});

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "assessments");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";
  const assessments = await prisma.assessment.findMany({
    where: { schoolId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ assessments: assessments ?? [] });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "assessments");
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

  const schoolId = "default";
  const data = parsed.data;

  try {
    const existing = await prisma.assessment.findFirst({
      where: { name: data.name.trim(), schoolId, isActive: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Assessment with this name already exists" }, { status: 409 });
    }

    const assessment = await prisma.assessment.create({
      data: {
        schoolId,
        name: data.name.trim(),
        description: data.description?.trim() ?? null,
        headings: data.headings ?? [],
        gradingScale: data.gradingScale ?? [],
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ASSESSMENT_CREATED",
      targetType: "Assessment",
      targetId: String(assessment.id),
      metadata: { name: data.name },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create assessment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
