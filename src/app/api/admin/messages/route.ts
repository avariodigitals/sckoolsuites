import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkPrivilege } from "@/lib/privileges";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkPrivilege(session.user.id, "announcements.view");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const messages = await prisma.parentMessage.findMany({
      where: { schoolId: "default" },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const parentIds = [...new Set(messages.map((m) => m.parentId))];
    const parents = parentIds.length
      ? await prisma.parent.findMany({ where: { id: { in: parentIds } } })
      : [];
    const userIds = [...new Set(parents.map((p) => p.userId).filter(Boolean))];
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds as number[] } } })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const parentById = new Map(parents.map((p) => [p.id, p]));

    return NextResponse.json({
      messages: messages.map((m) => {
        const parent = parentById.get(m.parentId);
        const user = parent?.userId ? userById.get(parent.userId) : null;
        return {
          id: m.id,
          parentId: m.parentId,
          parentName: user?.name ?? `Parent #${m.parentId}`,
          recipient: m.recipient,
          subject: m.subject,
          message: m.message,
          status: m.status.toLowerCase(),
          createdAt: m.createdAt.toISOString(),
        };
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
