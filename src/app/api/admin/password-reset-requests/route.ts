import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function isAuthorized(role?: string) {
  return role ? ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";
  const settings = await prisma.schoolSetting.findMany({
    where: {
      schoolId,
      key: { startsWith: "pwd_reset_" },
    },
    orderBy: { createdAt: "desc" },
  });

  const requests = settings.map((s) => {
    try {
      return JSON.parse(s.value);
    } catch {
      return null;
    }
  }).filter(Boolean);

  return NextResponse.json({ requests });
}
