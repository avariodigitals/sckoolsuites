import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const updateSchema = z.object({
  status: z.enum(["PENDING", "ANSWERED", "CLOSED"]).optional(),
  response: z.string().optional().nullable(),
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

    const query = await prisma.query.update({
      where: { id, schoolId: "default" },
      data: validated,
    });

    await createAuditLog({
      actorUserId: session.user.id!,
      schoolId: "default",
      action: "UPDATE",
      targetType: "Query",
      targetId: id,
      details: `Updated query ${query.queryNumber}`,
    });

    return NextResponse.json({ query });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating query:", error);
    return NextResponse.json({ error: "Failed to update query" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    await prisma.query.delete({
      where: { id, schoolId: "default" },
    });

    await createAuditLog({
      actorUserId: session.user.id!,
      schoolId: "default",
      action: "DELETE",
      targetType: "Query",
      targetId: id,
      details: "Deleted query",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting query:", error);
    return NextResponse.json({ error: "Failed to delete query" }, { status: 500 });
  }
}
