import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  const [school, activeSessionSetting, activeTermSetting, sessions, terms, setupStatus] = await Promise.all([
    prisma.school.findUnique({ 
      where: { id: schoolId },
      select: { id: true, name: true, email: true, phone: true, address: true, website: true, motto: true, isActive: true }
    }),
    prisma.schoolSetting.findFirst({ where: { schoolId, key: "active_session_id" }, select: { value: true } }),
    prisma.schoolSetting.findFirst({ where: { schoolId, key: "active_term_id" }, select: { value: true } }),
    prisma.session.findMany({ where: { schoolId }, orderBy: { createdAt: "asc" } }),
    prisma.term.findMany({ where: { schoolId }, include: { session: true }, orderBy: { createdAt: "asc" } }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { isActive: true } }),
  ]);

  return NextResponse.json({
    school,
    academic: {
      sessions: sessions.map((s: any) => ({
        id: s.id,
        name: s.name,
        startDate: s.startDate?.toISOString().split("T")[0] || "",
        endDate: s.endDate?.toISOString().split("T")[0] || "",
      })),
      terms: terms.map((t: any) => ({
        id: t.id,
        name: t.name,
        sessionId: t.sessionId,
        startDate: t.startDate?.toISOString().split("T")[0] || "",
        endDate: t.endDate?.toISOString().split("T")[0] || "",
      })),
      currentSessionId: activeSessionSetting?.value || sessions[0]?.id || "",
      currentTermId: activeTermSetting?.value || terms[0]?.id || "",
    },
    isActive: setupStatus?.isActive ?? false,
  });
}
