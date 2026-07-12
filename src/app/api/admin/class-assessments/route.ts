import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "assessments");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const classGroupId = searchParams.get("classGroupId");

  if (classId) {
    // Get class-specific assessments
    const classLinks = await prisma.classAssessment.findMany({
      where: { classId: Number(classId), isActive: true },
      include: { assessment: true },
    });

    // Get the class to find its group
    const cls = await prisma.class.findUnique({ where: { id: Number(classId) } });
    let groupAssessments: any[] = [];
    if (cls?.classGroupId) {
      const groupLinks = await prisma.classGroupAssessment.findMany({
        where: { classGroupId: cls.classGroupId, isActive: true },
        include: { assessment: true },
      });
      groupAssessments = groupLinks.map((l: any) => ({ ...l.assessment, fromGroup: true }));
    }

    const classAssessments = classLinks.map((l: any) => ({ ...l.assessment, fromGroup: false }));

    // Merge, preferring class-specific if same assessment exists in both
    const byId = new Map<string, any>();
    for (const a of groupAssessments) {
      byId.set(String(a.id), a);
    }
    for (const a of classAssessments) {
      byId.set(String(a.id), a); // class-specific overrides
    }

    return NextResponse.json({ assessments: Array.from(byId.values()) });
  }

  if (classGroupId) {
    const groupLinks = await prisma.classGroupAssessment.findMany({
      where: { classGroupId: Number(classGroupId), isActive: true },
      include: { assessment: true },
    });
    return NextResponse.json({ assessments: groupLinks.map((l: any) => l.assessment) });
  }

  return NextResponse.json({ error: "classId or classGroupId required" }, { status: 400 });
}

const createSchema = z.object({
  assessmentId: z.coerce.string().min(1),
  classId: z.coerce.string().optional(),
  classGroupId: z.coerce.string().optional(),
});

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

  const { assessmentId, classId, classGroupId } = parsed.data;
  if (!classId && !classGroupId) {
    return NextResponse.json({ error: "classId or classGroupId required" }, { status: 400 });
  }

  try {
    if (classGroupId) {
      const existing = await prisma.classGroupAssessment.findFirst({
        where: { classGroupId: Number(classGroupId), assessmentId: Number(assessmentId) },
      });
      if (existing) {
        return NextResponse.json({ error: "Assessment already linked to this class group" }, { status: 409 });
      }
      const link = await prisma.classGroupAssessment.create({
        data: {
          classGroupId: Number(classGroupId),
          assessmentId: Number(assessmentId),
        },
      });
      return NextResponse.json({ link }, { status: 201 });
    }

    if (classId) {
      const existing = await prisma.classAssessment.findFirst({
        where: { classId: Number(classId), assessmentId: Number(assessmentId) },
      });
      if (existing) {
        return NextResponse.json({ error: "Assessment already linked to this class" }, { status: 409 });
      }
      const link = await prisma.classAssessment.create({
        data: {
          classId: Number(classId),
          assessmentId: Number(assessmentId),
        },
      });
      return NextResponse.json({ link }, { status: 201 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to link assessment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
