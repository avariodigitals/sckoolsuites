import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { crudPrivilege } from "@/lib/route-auth";

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "HEAD_OF_SCHOOL",
  "PRINCIPAL",
];

function isAuthorized(role?: string) {
  return role ? ADMIN_ROLES.includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "teachers");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const type = searchParams.get("type");
  const userId = searchParams.get("userId");
  const take = parseInt(searchParams.get("take") ?? "200", 10);

  const where: Record<string, unknown> = { schoolId };
  if (type) where.type = type;
  if (userId) where.userId = parseInt(userId, 10);

  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    where.timestamp = { gte: dayStart, lte: dayEnd };
  }

  const records = await prisma.staffAttendance.findMany({
    where: where as any,
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      },
      teacher: {
        select: { id: true, designation: true },
      },
    },
    orderBy: { timestamp: "desc" },
    take,
  });

  return NextResponse.json(
    records.map((r) => ({
      id: r.id,
      type: r.type,
      timestamp: r.timestamp.toISOString(),
      latitude: r.latitude,
      longitude: r.longitude,
      facePhotoUrl: r.facePhotoUrl,
      note: r.note,
      user: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        role: r.user.role,
        avatarUrl: r.user.avatarUrl,
      },
      teacher: r.teacher
        ? { id: r.teacher.id, designation: r.teacher.designation }
        : null,
    }))
  );
}
