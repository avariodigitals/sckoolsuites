import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkPrivilege, seedPrivileges, seedRolePrivileges, seedRoles } from "@/lib/privileges";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "privileges.view");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const privileges = await prisma.privilege.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    privileges: privileges.map((p: any) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      category: p.category,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "privileges.manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action } = await request.json();

  if (action === "seed") {
    await seedRoles();
    await seedPrivileges();
    await seedRolePrivileges();
    return NextResponse.json({ message: "Roles and privileges seeded" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
