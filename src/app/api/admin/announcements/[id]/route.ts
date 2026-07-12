import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "announcements");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "announcement id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid announcement id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  // Check announcement exists
  const existing = await prisma.announcement.findFirst({
    where: { id: parsedId, schoolId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  try {
    await prisma.announcement.delete({
      where: { id: parsedId },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ANNOUNCEMENT_DELETED",
      targetType: "Announcement",
      targetId: String(parsedId),
      metadata: {
        announcementId: parsedId,
        title: existing.title,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete announcement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
