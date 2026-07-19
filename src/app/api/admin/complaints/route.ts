import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkPrivilege } from "@/lib/privileges";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkPrivilege(session.user.id, "announcements.view");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const complaints = await prisma.parentComplaint.findMany({
      where: { schoolId: "default" },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const parentIds = [...new Set(complaints.map((c) => c.parentId))];
    const parents = parentIds.length
      ? await prisma.parent.findMany({ where: { id: { in: parentIds } } })
      : [];
    const userIds = [...new Set(parents.map((p) => p.userId).filter(Boolean))] as number[];
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } } })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const parentById = new Map(parents.map((p) => [p.id, p]));

    return NextResponse.json({
      complaints: complaints.map((c) => {
        const parent = parentById.get(c.parentId);
        const user = parent?.userId ? userById.get(parent.userId) : null;
        return {
          id: c.id,
          parentId: c.parentId,
          parentName: user?.name ?? `Parent #${c.parentId}`,
          category: c.category,
          subject: c.subject,
          complaint: c.complaint,
          status: c.status,
          resolutionNote: c.resolutionNote,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        };
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
