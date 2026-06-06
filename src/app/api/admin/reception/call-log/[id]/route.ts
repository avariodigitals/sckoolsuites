import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    await prisma.callLog.delete({
      where: { id, schoolId: "default" },
    });

    await createAuditLog({
      actorUserId: session.user.id!,
      schoolId: "default",
      action: "DELETE",
      targetType: "CallLog",
      targetId: id,
      details: "Deleted call log",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting call log:", error);
    return NextResponse.json({ error: "Failed to delete call log" }, { status: 500 });
  }
}
