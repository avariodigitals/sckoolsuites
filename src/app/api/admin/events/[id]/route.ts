import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

const allowedRoles = ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"];

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parsedId = parseNumericId(id, "event id");

    const deleted = await prisma.schoolEvent.deleteMany({
      where: { id: parsedId, schoolId: "default" },
    });

    if (!deleted.count) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await createAuditLog({
      schoolId: "default",
      actorUserId: session.user.id,
      action: "SCHOOL_EVENT_DELETED",
      targetType: "SchoolEvent",
      targetId: id,
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
