import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkPrivilege } from "@/lib/privileges";
import { humanizeEnum } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "roles.view");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    roles: roles.map((r: any) => ({
      id: r.id,
      name: humanizeEnum(r.name),
      label: r.label ?? humanizeEnum(r.name),
      description: r.description,
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
  });
}
