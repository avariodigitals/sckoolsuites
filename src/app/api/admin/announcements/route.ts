import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  audience: z.string().min(1).max(100),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "announcements");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const termId = url.searchParams.get("termId") ?? undefined;

  const where: Record<string, any> = { schoolId };
  if (sessionId) where.sessionId = sessionId;
  if (termId) where.termId = termId;

  const announcements = await prisma.announcement.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    announcements: announcements.map((a: { id: number; title: string; body: string | null; audience: string | null; sessionId: number | null; termId: number | null; createdAt: Date }) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      sessionId: a.sessionId ?? null,
      termId: a.termId ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "announcements");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  try {
    // Get current session/term for auto-scoping
    const [currentSession, currentTerm] = await Promise.all([
      prisma.session.findFirst({ where: { schoolId, isCurrent: true } }),
      prisma.term.findFirst({ where: { schoolId, isCurrent: true } }),
    ]);

    const announcement = await prisma.announcement.create({
      data: {
        schoolId,
        title: data.title.trim(),
        body: data.body.trim(),
        audience: data.audience.trim(),
        sessionId: currentSession?.id ?? null,
        termId: currentTerm?.id ?? null,
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ANNOUNCEMENT_CREATED",
      targetType: "Announcement",
      targetId: announcement.id,
      metadata: {
        announcementId: announcement.id,
        title: data.title,
        audience: data.audience,
        sessionId: currentSession?.id,
        termId: currentTerm?.id,
      },
    });

    return NextResponse.json(
      {
        announcement: {
          id: announcement.id,
          title: announcement.title,
          body: announcement.body,
          audience: announcement.audience,
          sessionId: announcement.sessionId ?? null,
          termId: announcement.termId ?? null,
          createdAt: announcement.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create announcement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
