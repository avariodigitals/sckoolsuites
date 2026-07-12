import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  feeGroupId: z.coerce.number().min(1),
  name: z.string().min(2).max(150),
  category: z.string().min(2).max(120),
  classId: z.coerce.number().optional().nullable(),
  armId: z.coerce.number().optional().nullable(),
  sessionId: z.coerce.number().min(1),
  termId: z.coerce.number().min(1),
  description: z.string().max(500).optional().nullable(),
  amount: z.number().min(0),
  isOptional: z.boolean().optional(),
  dueDate: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "fees");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  const [items, groups, classes, sessions, terms, arms] = await Promise.all([
    prisma.feeItem.findMany({
      where: { schoolId },
      include: {
        feeGroup: true,
        class: true,
        arm: true,
        session: true,
        term: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.feeGroup.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.session.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } }),
    prisma.term.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } }),
    prisma.classArm.findMany({ where: { schoolId, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    items: items.map((item: any) => ({
      id: item.id,
      feeGroupId: item.feeGroupId,
      feeGroupName: item.feeGroup.name,
      name: item.name,
      category: item.category,
      classId: item.classId,
      className: item.class?.name ?? null,
      armId: item.armId,
      armName: item.arm?.name ?? null,
      sessionId: item.sessionId,
      sessionName: item.session.name,
      termId: item.termId,
      termName: item.term.name,
      description: item.description,
      amount: item.amount,
      isOptional: item.isOptional,
      dueDate: item.dueDate?.toISOString() ?? null,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    })),
    groups: groups.map((group: any) => ({ id: group.id, name: group.name, code: group.code, isActive: group.isActive })),
    classes: classes.map((item: any) => ({ id: item.id, name: item.name })),
    sessions: sessions.map((item: any) => ({ id: item.id, name: item.name, isCurrent: item.isCurrent })),
    terms: terms.map((item: any) => ({ id: item.id, name: item.name, sessionId: item.sessionId, isCurrent: item.isCurrent })),
    arms: arms.map((item: any) => ({ id: item.id, name: item.name, classId: item.classId })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "fees");
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
  const classId = parsed.data.classId ?? null;
  const armId = parsed.data.armId ?? null;

  const [group, sessionRow, termRow] = await Promise.all([
    prisma.feeGroup.findFirst({ where: { id: parsed.data.feeGroupId, schoolId } }),
    prisma.session.findFirst({ where: { id: parsed.data.sessionId, schoolId } }),
    prisma.term.findFirst({ where: { id: parsed.data.termId, schoolId } }),
  ]);

  if (!group || !sessionRow || !termRow) {
    return NextResponse.json({ error: "Invalid fee group/session/term selection." }, { status: 400 });
  }

  if (armId) {
    const arm = await prisma.classArm.findFirst({ where: { id: armId, schoolId } });
    if (!arm) {
      return NextResponse.json({ error: "Selected class arm is invalid." }, { status: 400 });
    }
    if (classId && arm.classId !== classId) {
      return NextResponse.json({ error: "Selected arm does not belong to selected class." }, { status: 400 });
    }
  }

  try {
    const created = await prisma.feeItem.create({
      data: {
        schoolId,
        feeGroupId: parsed.data.feeGroupId,
        sessionId: parsed.data.sessionId,
        termId: parsed.data.termId,
        classId,
        armId,
        category: parsed.data.category.trim(),
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        amount: parsed.data.amount,
        isOptional: parsed.data.isOptional === true,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        sortOrder: parsed.data.sortOrder ?? 0,
        isActive: parsed.data.isActive !== false,
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create fee item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
