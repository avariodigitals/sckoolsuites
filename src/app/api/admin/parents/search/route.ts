import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const schoolId = session.user.schoolId || "default";

  if (q.length < 1) {
    return NextResponse.json({ parents: [] });
  }

  const parents = await prisma.parent.findMany({
    where: {
      schoolId,
      OR: [
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { phone: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { user: true },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    parents: parents.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name,
      email: p.user.email,
      phone: p.user.phone ?? null,
    })),
  });
}
