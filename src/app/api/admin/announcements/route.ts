import { NextResponse } from "next/server";
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
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  const announcements = await prisma.announcement.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
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
    const announcement = await prisma.announcement.create({
      data: {
        schoolId,
        title: data.title.trim(),
        body: data.body.trim(),
        audience: data.audience.trim(),
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
      },
    });

    return NextResponse.json(
      {
        announcement: {
          id: announcement.id,
          title: announcement.title,
          body: announcement.body,
          audience: announcement.audience,
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
