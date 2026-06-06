import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const componentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN", "BURSAR", "ACCOUNTANT"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  const components = await prisma.feeComponent.findMany({
    where: { schoolId, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ components });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = componentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  try {
    const component = await prisma.feeComponent.create({
      data: {
        schoolId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "FEE_COMPONENT_CREATED",
      targetType: "FeeComponent",
      targetId: component.id,
      metadata: { name: data.name },
    });

    return NextResponse.json({ component }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create fee component";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const schoolId = "default";

  try {
    await prisma.feeComponent.update({
      where: { id, schoolId },
      data: { isActive: false },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "FEE_COMPONENT_DELETED",
      targetType: "FeeComponent",
      targetId: id,
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete fee component";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
