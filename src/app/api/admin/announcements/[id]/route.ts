import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const schoolId = "default";

  // Check announcement exists
  const existing = await prisma.announcement.findFirst({
    where: { id, schoolId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  try {
    await prisma.announcement.delete({
      where: { id },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ANNOUNCEMENT_DELETED",
      targetType: "Announcement",
      targetId: id,
      metadata: {
        announcementId: id,
        title: existing.title,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete announcement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
