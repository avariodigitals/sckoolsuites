import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const records = await prisma.notificationRecord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        isRead: true,
        readAt: true,
        createdAt: true,
        metadata: true,
      },
    });

    const unreadCount = records.filter((r) => !r.isRead).length;

    return NextResponse.json({
      notifications: records.map((r) => ({
        id: `nr-${r.id}`,
        recordId: r.id,
        type: r.type,
        title: r.title,
        description: r.body,
        link: r.link,
        isRead: r.isRead,
        readAt: r.readAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        metadata: r.metadata ? JSON.parse(r.metadata) : null,
      })),
      unreadCount,
    });
  } catch (err) {
    console.error("[api/notifications/records] Error:", err);
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }
}
