import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { slugifyFinanceCode } from "@/lib/finance";
import { parseNumericId } from "@/lib/id-helpers";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  code: z.string().min(2).max(60).optional(),
  description: z.string().max(500).optional().nullable(),
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

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "fee group id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid fee group id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const updated = await prisma.feeGroup.updateMany({
      where: { id: parsedId, schoolId: "default" },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.code !== undefined ? { code: slugifyFinanceCode(parsed.data.code.trim()) } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description?.trim() || null } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });

    if (!updated.count) {
      return NextResponse.json({ error: "Fee group not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update fee group";
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
    parsedId = parseNumericId(id, "fee group id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid fee group id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updated = await prisma.feeGroup.updateMany({
    where: { id: parsedId, schoolId: "default" },
    data: { isActive: false },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Fee group not found" }, { status: 404 });
  }

  await prisma.feeItem.updateMany({
    where: { feeGroupId: parsedId, schoolId: "default" },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
