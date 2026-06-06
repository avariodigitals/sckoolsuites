import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const updateSchema = z.object({
  status: z.enum(["PENDING", "PROCESSED", "ARCHIVED"]).optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const json = await request.json();
    const validated = updateSchema.parse(json);

    const item = await prisma.correspondence.update({
      where: { id, schoolId: "default" },
      data: validated,
    });

    await createAuditLog({
      actorUserId: session.user.id!,
      schoolId: "default",
      action: "UPDATE",
      targetType: "Correspondence",
      targetId: id,
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
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    await prisma.correspondence.delete({
      where: { id, schoolId: "default" },
    });

    await createAuditLog({
      actorUserId: session.user.id!,
      schoolId: "default",
      action: "DELETE",
      targetType: "Correspondence",
      targetId: id,
      details: "Deleted correspondence",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting correspondence:", error);
    return NextResponse.json({ error: "Failed to delete correspondence" }, { status: 500 });
  }
}
