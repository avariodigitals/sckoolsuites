import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkPrivilege } from "@/lib/privileges";
import { createAuditLog } from "@/lib/audit-log";

const assignSchema = z.object({
  roleId: z.string().min(1),
  privilegeId: z.string().min(1),
  isGranted: z.boolean(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "roles.view");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get("roleId");
  if (!roleId) return NextResponse.json({ error: "Missing roleId" }, { status: 400 });

  const role = await prisma.role.findUnique({ where: { id: Number(roleId) } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const [privileges, rolePrivs] = await Promise.all([
    prisma.privilege.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.rolePrivilege.findMany({ where: { roleId: Number(roleId) } }),
  ]);

  const granted = new Set<number>(rolePrivs.filter((rp: any) => rp.isGranted).map((rp: any) => rp.privilegeId));

  return NextResponse.json({
    role: {
      id: role.id,
      name: role.name,
      label: role.label,
      description: role.description,
    },
    privileges: privileges.map((p: any) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      isGranted: granted.has(p.id),
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "roles.manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await request.json();
  const parsed = assignSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { roleId, privilegeId, isGranted } = parsed.data;

  const role = await prisma.role.findUnique({ where: { id: Number(roleId) } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  // Prevent modifying the SUPER_ADMIN role from this UI; it always has full access.
  if (role.name === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Super Admin privileges cannot be changed" }, { status: 403 });
  }

  await prisma.rolePrivilege.upsert({
    where: {
      roleId_privilegeId: {
        roleId: Number(roleId),
        privilegeId: Number(privilegeId),
      },
    },
    update: { isGranted },
    create: { roleId: Number(roleId), privilegeId: Number(privilegeId), isGranted },
  });

  await createAuditLog({
    schoolId: "default",
    actorUserId: Number(session.user.id),
    action: "ROLE_PRIVILEGE_ASSIGNED",
    targetType: "RolePrivilege",
    targetId: roleId,
    metadata: { roleId, privilegeId, isGranted },
  });

  return NextResponse.json({ success: true });
}
