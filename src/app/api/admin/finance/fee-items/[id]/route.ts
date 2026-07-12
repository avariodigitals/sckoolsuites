import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";

const updateSchema = z.object({
  feeGroupId: z.coerce.number().int().min(1).optional(),
  name: z.string().min(2).max(150).optional(),
  category: z.string().min(2).max(120).optional(),
  classId: z.coerce.number().int().min(1).optional().nullable(),
  armId: z.coerce.number().int().min(1).optional().nullable(),
  sessionId: z.coerce.number().int().min(1).optional(),
  termId: z.coerce.number().int().min(1).optional(),
  description: z.string().max(500).optional().nullable(),
  amount: z.number().min(0).optional(),
  isOptional: z.boolean().optional(),
  dueDate: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "SUPER_ADMIN"].includes(role) : false;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "fees");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const schoolId = "default";

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "fee item id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid fee item id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existing = await prisma.feeItem.findFirst({ where: { id: parsedId, schoolId } });
  if (!existing) {
    return NextResponse.json({ error: "Fee item not found" }, { status: 404 });
  }

  try {
    const updated = await prisma.feeItem.update({
      where: { id: parsedId },
      data: {
        ...(parsed.data.feeGroupId !== undefined ? { feeGroupId: parsed.data.feeGroupId } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category.trim() } : {}),
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.classId !== undefined ? { classId: parsed.data.classId } : {}),
        ...(parsed.data.armId !== undefined ? { armId: parsed.data.armId } : {}),
        ...(parsed.data.sessionId !== undefined ? { sessionId: parsed.data.sessionId } : {}),
        ...(parsed.data.termId !== undefined ? { termId: parsed.data.termId } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description?.trim() || null } : {}),
        ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
        ...(parsed.data.isOptional !== undefined ? { isOptional: parsed.data.isOptional } : {}),
        ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });

    return NextResponse.json({ id: updated.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update fee item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "fees");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "fee item id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid fee item id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updated = await prisma.feeItem.updateMany({
    where: { id: parsedId, schoolId: "default" },
    data: { isActive: false },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Fee item not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
