import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { MessageStatus } from "@/lib/db-types";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  recipient: z.string().min(2),
  subject: z.string().min(3),
  message: z.string().min(5),
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

  const items = await prisma.parentMessage.findMany({
    where: { schoolId: "default", parentId: parent.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const messages = items.map((item) => ({
    id: item.id,
    recipient: item.recipient,
    subject: item.subject,
    message: item.message,
    status: item.status.toLowerCase(),
    createdAt: item.createdAt.toISOString(),
  }));

  return NextResponse.json(messages);
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

  const created = await prisma.parentMessage.create({
    data: {
      schoolId: "default",
      parentId: parent.id,
      recipient: parsed.data.recipient,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: MessageStatus.SENT,
    },
  });

  await createAuditLog({
    schoolId: "default",
    actorUserId: session.user.id,
    action: "PARENT_MESSAGE_CREATED",
    targetType: "ParentMessage",
    targetId: created.id,
    metadata: {
      recipient: created.recipient,
      subject: created.subject,
    },
  });

  return NextResponse.json({
    ok: true,
    message: {
      id: created.id,
      recipient: created.recipient,
      subject: created.subject,
      message: created.message,
      status: created.status.toLowerCase(),
      createdAt: created.createdAt.toISOString(),
    },
  });
}
