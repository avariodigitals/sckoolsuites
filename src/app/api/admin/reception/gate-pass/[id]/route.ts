import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

const updateSchema = z.object({
  status: z.string().optional(),
  actualReturn: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "reception");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "gate pass id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid gate pass id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";

  try {
    const existing = await prisma.gatePass.findFirst({ where: { id: parsedId, schoolId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = parsed.data;
    const pass = await prisma.gatePass.update({
      where: { id: parsedId },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.actualReturn !== undefined && { actualReturn: data.actualReturn ? new Date(data.actualReturn) : null }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "GATEPASS_UPDATED",
      targetType: "GatePass",
      targetId: String(parsedId),
      metadata: { passNumber: pass.passNumber },
    });

    return NextResponse.json({ pass });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "reception");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "gate pass id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid gate pass id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  try {
    const existing = await prisma.gatePass.findFirst({ where: { id: parsedId, schoolId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.gatePass.delete({ where: { id: parsedId } });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "GATEPASS_DELETED",
      targetType: "GatePass",
      targetId: String(parsedId),
      metadata: { passNumber: existing.passNumber },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
