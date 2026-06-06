import { NextResponse } from "next/server";
import { ComplaintStatus } from "@/lib/db-types";
import { z } from "zod";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";

const schema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  resolutionNote: z.string().max(1000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !["SCHOOL_ADMIN", "PRINCIPAL", "ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const updated = await prisma.parentComplaint.updateMany({
    where: { id, schoolId: "default" },
    data: {
      status: parsed.data.status,
      reviewedById: session.user.id,
      resolutionNote: parsed.data.resolutionNote ?? null,
    },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  const complaint = await prisma.parentComplaint.findFirst({ where: { id, schoolId: "default" } });
  if (!complaint) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  await createAuditLog({
    schoolId: "default",
    actorUserId: session.user.id,
    action: "PARENT_COMPLAINT_STATUS_UPDATED",
    targetType: "ParentComplaint",
    targetId: complaint.id,
    metadata: {
      status: complaint.status,
      resolutionNote: complaint.resolutionNote,
    },
  });

  return NextResponse.json({
    ok: true,
    complaint: {
      id: complaint.id,
      status: complaint.status,
      resolutionNote: complaint.resolutionNote,
      updatedAt: complaint.updatedAt.toISOString(),
    },
  });
}
