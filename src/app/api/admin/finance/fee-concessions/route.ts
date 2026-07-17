import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";

const concessionSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  value: z.number().min(0),
  description: z.string().max(500).optional(),
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

  const schoolId = session.user.schoolId || "default";

  try {
    const concessions = await prisma.feeConcession.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      concessions: concessions.map((c) => ({
        id: String(c.id),
        name: c.name,
        type: c.type,
        value: c.value,
        description: c.description,
        isActive: c.isActive,
      })),
    });
  } catch (error) {
    console.error("FeeConcession fetch error:", error);
    return NextResponse.json({ concessions: [] });
  }
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
  const parsed = concessionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const data = parsed.data;

  try {
    const concession = await prisma.feeConcession.create({
      data: {
        schoolId,
        name: data.name.trim(),
        type: data.type,
        value: data.value,
        description: data.description?.trim() || null,
      },
    });

    return NextResponse.json({ concession }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create concession";
    return NextResponse.json({ error: message }, { status: 400 });
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
    parsedId = parseNumericId(id ?? undefined, "fee concession id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid fee concession id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";

  try {
    await prisma.feeConcession.update({
      where: { id: parsedId },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete concession";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
