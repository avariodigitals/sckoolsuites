import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { slugifyFinanceCode } from "@/lib/finance";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(60).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "SUPER_ADMIN"].includes(role) : false;
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
  const groups = await prisma.feeGroup.findMany({
    where: { schoolId },
    include: { _count: { select: { feeItems: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    groups: groups.map((group: any) => ({
      id: String(group.id),
      name: group.name,
      code: group.code,
      description: group.description,
      isActive: group.isActive,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
      feeItemCount: group._count.feeItems,
    })),
  });
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
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const code = slugifyFinanceCode(parsed.data.code?.trim() || name);

  const schoolId = session.user.schoolId || "default";

  try {
    const created = await prisma.feeGroup.create({
      data: {
        schoolId,
        name,
        code,
        description: parsed.data.description?.trim() || null,
        isActive: parsed.data.isActive !== false,
      },
    });

    return NextResponse.json({
      group: {
        id: created.id,
        name: created.name,
        code: created.code,
        description: created.description,
        isActive: created.isActive,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create fee group";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
