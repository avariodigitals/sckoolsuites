import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

const componentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "BURSAR", "ACCOUNTANT"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "fees");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const components = await prisma.feeComponent.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ components });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "fees");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
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
        name: data.name.trim(),
        description: data.description?.trim() || null,
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "FEE_COMPONENT_CREATED",
      targetType: "FeeComponent",
      targetId: String(component.id),
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
  const allowed = await crudPrivilege(session, "DELETE", "fees");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  let parsedId: number;
  try {
    parsedId = parseNumericId(id ?? undefined, "fee component id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid fee component id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  try {
    await prisma.feeComponent.update({
      where: { id: parsedId },
      data: { isActive: false },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "FEE_COMPONENT_DELETED",
      targetType: "FeeComponent",
      targetId: String(parsedId),
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete fee component";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
