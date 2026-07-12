import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { ComplaintStatus } from "@/lib/db-types";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  category: z.string().min(2),
  subject: z.string().min(3),
  complaint: z.string().min(10),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT" ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parent = await prisma.parent.findFirst({
    where: { schoolId: "default", userId: session.user.id },
  });

  if (!parent) return NextResponse.json([]);

  const items = await prisma.parentComplaint.findMany({
    where: { schoolId: "default", parentId: parent.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const complaints = items.map((item: any) => ({
    id: item.id,
    category: item.category,
    subject: item.subject,
    complaint: item.complaint,
    status: item.status,
    resolutionNote: item.resolutionNote,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return NextResponse.json(complaints);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT" ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parent = await prisma.parent.findFirst({
    where: { schoolId: "default", userId: session.user.id },
  });

  if (!parent) {
    return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.parentComplaint.create({
    data: {
      schoolId: "default",
      parentId: parent.id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      complaint: parsed.data.complaint,
      status: ComplaintStatus.OPEN,
    },
  });

  await createAuditLog({
    schoolId: "default",
    actorUserId: session.user.id,
    action: "PARENT_COMPLAINT_CREATED",
    targetType: "ParentComplaint",
    targetId: created.id,
    metadata: {
      category: created.category,
      subject: created.subject,
      status: created.status,
    },
  });

  return NextResponse.json({
    ok: true,
    complaint: {
      id: created.id,
      category: created.category,
      subject: created.subject,
      complaint: created.complaint,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
  });
}
