import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkPrivilege } from "@/lib/privileges";
import { createAuditLog } from "@/lib/audit-log";

const assignSchema = z.object({
  userId: z.coerce.number().int().min(1),
  privilegeId: z.coerce.number().int().min(1),
  isGranted: z.boolean(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "privileges.view");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const rawUserId = url.searchParams.get("userId");
  if (!rawUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  const userId = Number(rawUserId);

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [allPrivileges, rolePrivs, userPrivs] = await Promise.all([
    prisma.privilege.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.rolePrivilege.findMany({ where: { roleId: user.roleId ?? undefined } }),
    prisma.userPrivilege.findMany({ where: { userId } }),
  ]);

  const roleDefaultByPrivId = new Map<number, boolean>(rolePrivs.map((rp: any) => [rp.privilegeId, rp.isGranted]));
  const overrideByPrivId = new Map<number, { id: number; isGranted: boolean }>(
    userPrivs.map((up: any) => [up.privilegeId, { id: up.id, isGranted: up.isGranted }])
  );

  return NextResponse.json({
    privileges: allPrivileges.map((p: any) => {
      const roleDefault = roleDefaultByPrivId.get(p.id) ?? false;
      const override = overrideByPrivId.get(p.id);
      const effective = override ? override.isGranted : roleDefault;
      return {
        id: p.id,
        privilegeId: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        roleDefault,
        isGranted: effective,
        hasOverride: !!override,
      };
    }),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "privileges.manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await request.json();
  const parsed = assignSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, privilegeId, isGranted } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { roleId: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const rolePriv = user.roleId
    ? await prisma.rolePrivilege.findFirst({ where: { roleId: user.roleId, privilegeId } })
    : null;
  const roleDefault = rolePriv?.isGranted ?? false;

  // If the requested value matches the role default, remove any per-user override
  // so the user follows the role default. Otherwise store the override.
  if (isGranted === roleDefault) {
    await prisma.userPrivilege.deleteMany({ where: { userId, privilegeId } });
  } else {
    const existing = await prisma.userPrivilege.findFirst({
      where: { userId, privilegeId },
    });
    if (existing) {
      await prisma.userPrivilege.update({
        where: { id: existing.id },
        data: { isGranted },
      });
    } else {
      await prisma.userPrivilege.create({
        data: { userId, privilegeId, isGranted, grantedBy: Number(session.user.id) },
      });
    }
  }

  await createAuditLog({
    schoolId: "default",
    actorUserId: session.user.id,
    action: "USER_PRIVILEGE_ASSIGNED",
    targetType: "UserPrivilege",
    targetId: userId,
    metadata: { userId, privilegeId, isGranted },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPrivilege(session.user.id, "privileges.manage");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await request.json();
  const userId = Number(payload.userId);
  const privilegeId = Number(payload.privilegeId);
  if (!userId || !privilegeId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await prisma.userPrivilege.deleteMany({
    where: { userId, privilegeId },
  });

  return NextResponse.json({ success: true });
}
