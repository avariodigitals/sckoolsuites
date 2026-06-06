import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const updateSchema = z.object({
  status: z.string().optional(),
  actualReturn: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";

  try {
    const existing = await prisma.gatePass.findFirst({ where: { id, schoolId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = parsed.data;
    const pass = await prisma.gatePass.update({
      where: { id },
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
      targetId: id,
      metadata: { passNumber: pass.passNumber },
    });

    return NextResponse.json({ pass });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const schoolId = "default";

  try {
    const existing = await prisma.gatePass.findFirst({ where: { id, schoolId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.gatePass.delete({ where: { id } });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "GATEPASS_DELETED",
      targetType: "GatePass",
      targetId: id,
      metadata: { passNumber: existing.passNumber },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
