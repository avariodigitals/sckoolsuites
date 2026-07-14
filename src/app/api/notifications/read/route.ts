import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { recordIds, markAll } = body as { recordIds?: number[]; markAll?: boolean };

    if (markAll) {
      await prisma.notificationRecord.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true, markedAll: true });
    }

    if (recordIds?.length) {
      await prisma.notificationRecord.updateMany({
        where: { id: { in: recordIds }, userId: user.id },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true, marked: recordIds.length });
    }

    return NextResponse.json({ success: true, marked: 0 });
  } catch (err) {
    console.error("[api/notifications/read] Error:", err);
    return NextResponse.json({ error: "Failed to mark notifications" }, { status: 500 });
  }
}
