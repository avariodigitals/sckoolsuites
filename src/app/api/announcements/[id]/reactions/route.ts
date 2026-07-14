import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idRaw } = await params;
  const announcementId = Number(idRaw);
  if (Number.isNaN(announcementId)) {
    return NextResponse.json({ error: "Invalid announcement ID" }, { status: 400 });
  }

  try {
    const reactions = await prisma.announcementReaction.findMany({
      where: { announcementId },
      select: { id: true, userId: true, emoji: true },
    });

    const grouped: Record<string, { count: number; userIds: number[] }> = {};
    for (const r of reactions) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, userIds: [] };
      grouped[r.emoji].count++;
      grouped[r.emoji].userIds.push(r.userId);
    }

    return NextResponse.json({
      reactions: Object.entries(grouped).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        reactedByMe: data.userIds.includes(session.user!.id),
      })),
    });
  } catch (err) {
    console.error("[reactions GET]", err);
    return NextResponse.json({ reactions: [] }, { status: 200 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idRaw } = await params;
  const announcementId = Number(idRaw);
  if (Number.isNaN(announcementId)) {
    return NextResponse.json({ error: "Invalid announcement ID" }, { status: 400 });
  }

  try {
    const { emoji } = await req.json();
    if (!emoji || typeof emoji !== "string") {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    const allowed = ["👍", "❤️", "🎉", "🙏", "💡", "😮"];
    if (!allowed.includes(emoji)) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }

    const existing = await prisma.announcementReaction.findUnique({
      where: {
        announcementId_userId_emoji: {
          announcementId,
          userId: session.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.announcementReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed", emoji });
    }

    await prisma.announcementReaction.create({
      data: { announcementId, userId: session.user.id, emoji },
    });
    return NextResponse.json({ action: "added", emoji });
  } catch (err) {
    console.error("[reactions POST]", err);
    return NextResponse.json({ error: "Failed to toggle reaction" }, { status: 500 });
  }
}
