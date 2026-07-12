import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  resolution: z.string().optional().nullable(),
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
      parsedId = parseNumericId(id, "complaint id");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid complaint id";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const json = await request.json();
    const validated = updateSchema.parse(json);

    const complaint = await prisma.receptionComplaint.update({
      where: { id: parsedId, schoolId: "default" },
      data: validated,
    });

    await createAuditLog({
      actorUserId: session.user.id,
      schoolId: "default",
      action: "UPDATE",
      targetType: "Complaint",
      targetId: String(parsedId),
      details: `Updated complaint ${complaint.complaintNumber}`,
    });

    return NextResponse.json({ complaint });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating complaint:", error);
    return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 });
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
      parsedId = parseNumericId(id, "complaint id");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid complaint id";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await prisma.receptionComplaint.delete({
      where: { id: parsedId, schoolId: "default" },
    });

    await createAuditLog({
      actorUserId: session.user.id,
      schoolId: "default",
      action: "DELETE",
      targetType: "Complaint",
      targetId: String(parsedId),
      details: "Deleted complaint",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting complaint:", error);
    return NextResponse.json({ error: "Failed to delete complaint" }, { status: 500 });
  }
}
