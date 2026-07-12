import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

const updateSchema = z.object({
  status: z.enum(["PENDING", "PROCESSED", "ARCHIVED"]).optional(),
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

  try {
    const { id } = await params;

    let parsedId: number;
    try {
      parsedId = parseNumericId(id, "correspondence id");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid correspondence id";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const json = await request.json();
    const validated = updateSchema.parse(json);

    const item = await prisma.correspondence.update({
      where: { id: parsedId, schoolId: "default" },
      data: validated,
    });

    await createAuditLog({
      actorUserId: session.user.id,
      schoolId: "default",
      action: "UPDATE",
      targetType: "Correspondence",
      targetId: String(parsedId),
      details: `Updated correspondence ${item.refNumber}`,
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating correspondence:", error);
    return NextResponse.json({ error: "Failed to update correspondence" }, { status: 500 });
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

  try {
    const { id } = await params;

    let parsedId: number;
    try {
      parsedId = parseNumericId(id, "correspondence id");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid correspondence id";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await prisma.correspondence.delete({
      where: { id: parsedId, schoolId: "default" },
    });

    await createAuditLog({
      actorUserId: session.user.id,
      schoolId: "default",
      action: "DELETE",
      targetType: "Correspondence",
      targetId: String(parsedId),
      details: "Deleted correspondence",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting correspondence:", error);
    return NextResponse.json({ error: "Failed to delete correspondence" }, { status: 500 });
  }
}
