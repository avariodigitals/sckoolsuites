import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "BURSAR"].includes(role) : false;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "bills");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const schoolId = "default";

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "bill id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid bill id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Check invoice exists
  const existing = await prisma.invoice.findFirst({
    where: { id: parsedId, schoolId },
    include: { payments: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  // Prevent deletion if payments exist
  if (existing.payments.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete bill with recorded payments. Please void instead." },
      { status: 400 }
    );
  }

  try {
    // Delete invoice items first
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: parsedId },
    });

    // Delete invoice
    await prisma.invoice.delete({ where: { id: parsedId } });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "BILL_DELETED",
      targetType: "Invoice",
      targetId: String(parsedId),
      metadata: {
        invoiceId: parsedId,
        invoiceNumber: existing.invoiceNumber,
        totalAmount: existing.totalAmount,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete bill";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
