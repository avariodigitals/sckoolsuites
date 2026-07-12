import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
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
      parsedId = parseNumericId(id, "call log id");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid call log id";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await prisma.callLog.delete({
      where: { id: parsedId, schoolId: "default" },
    });

    await createAuditLog({
      actorUserId: session.user.id,
      schoolId: "default",
      action: "DELETE",
      targetType: "CallLog",
      targetId: String(parsedId),
      details: "Deleted call log",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting call log:", error);
    return NextResponse.json({ error: "Failed to delete call log" }, { status: 500 });
  }
}
