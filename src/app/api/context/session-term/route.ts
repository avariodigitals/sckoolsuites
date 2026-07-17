import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";

const setContextSchema = z.object({
  sessionId: z.string().optional(),
  termId: z.string().optional(),
});

const service = new AcademicCalendarService();

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const context = await service.getUserContext(schoolId, session.user.id);

  let [sessions, terms] = await Promise.all([
    prisma.session.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } }),
    prisma.term.findMany({ where: { schoolId }, include: { session: true }, orderBy: { createdAt: "desc" } }),
  ]);

  // For parents: filter to only sessions/terms where their children have data
  if (session.user.role === "PARENT") {
    const parent = await prisma.parent.findFirst({
      where: { userId: session.user.id, schoolId },
      select: { id: true },
    });

    if (parent) {
      const children = await prisma.student.findMany({
        where: { parentId: parent.id, schoolId },
        select: { id: true },
      });
      const childIds = children.map((c) => c.id);

      if (childIds.length > 0) {
        // Find sessionIds where children have enrollment, results, invoices, or attendance
        const [enrollmentSessionIds, resultSessionIds, invoiceSessionIds, attendanceSessionIds] = await Promise.all([
          prisma.studentEnrollment.findMany({
            where: { studentId: { in: childIds } },
            select: { sessionId: true },
            distinct: ["sessionId"],
          }).catch(() => []),
          prisma.result.findMany({
            where: { studentId: { in: childIds }, schoolId },
            select: { sessionId: true },
            distinct: ["sessionId"],
          }).catch(() => []),
          prisma.invoice.findMany({
            where: { studentId: { in: childIds }, schoolId },
            select: { sessionId: true },
            distinct: ["sessionId"],
          }).catch(() => []),
          prisma.attendance.findMany({
            where: { studentId: { in: childIds }, schoolId },
            select: { sessionId: true },
            distinct: ["sessionId"],
          }).catch(() => []),
        ]);

        const validSessionIds = new Set<number>([
          ...enrollmentSessionIds.map((r: any) => r.sessionId),
          ...resultSessionIds.map((r: any) => r.sessionId),
          ...invoiceSessionIds.map((r: any) => r.sessionId),
          ...attendanceSessionIds.map((r: any) => r.sessionId),
        ]);

        // Always include the current session even if no data yet
        const currentSession = sessions.find((s) => s.isCurrent);
        if (currentSession) validSessionIds.add(currentSession.id);

        sessions = sessions.filter((s) => validSessionIds.has(s.id));
        const validSessionIdSet = new Set(sessions.map((s) => s.id));
        terms = terms.filter((t) => validSessionIdSet.has(t.sessionId));
      } else {
        // No children linked - show only current session
        const currentSession = sessions.find((s) => s.isCurrent);
        sessions = currentSession ? [currentSession] : [];
        terms = terms.filter((t) => t.sessionId === currentSession?.id);
      }
    } else {
      // No parent profile - show empty
      sessions = [];
      terms = [];
    }
  }

  return NextResponse.json({
    ...context,
    sessions: sessions.map((s) => ({ id: String(s.id), name: s.name, isCurrent: s.isCurrent })),
    terms: terms.map((t) => ({ id: String(t.id), name: t.name, sessionId: String(t.sessionId), sessionName: t.session?.name ?? null, isCurrent: t.isCurrent })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const payload = await request.json();
  const parsed = setContextSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await service.setUserContext(schoolId, session.user.id, parsed.data.sessionId, parsed.data.termId);
  const context = await service.getUserContext(schoolId, session.user.id);
  return NextResponse.json(context);
}
