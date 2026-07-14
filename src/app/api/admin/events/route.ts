import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const allowedRoles = ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"];

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  eventType: z.string().default("general"),
  startDate: z.string().min(2),
  endDate: z.string().optional(),
  location: z.string().optional(),
  isAllDay: z.boolean().default(true),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const events = await prisma.schoolEvent.findMany({
      where: { schoolId: "default" },
      orderBy: { startDate: "asc" },
      take: 200,
    });

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        eventType: e.eventType,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
        location: e.location,
        isAllDay: e.isAllDay,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, description, eventType, startDate, endDate, location, isAllDay } = parsed.data;

    const event = await prisma.schoolEvent.create({
      data: {
        schoolId: "default",
        title,
        description: description || null,
        eventType,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        location: location || null,
        isAllDay,
        createdBy: session.user.id,
      },
    });

    await createAuditLog({
      schoolId: "default",
      actorUserId: session.user.id,
      action: "SCHOOL_EVENT_CREATED",
      targetType: "SchoolEvent",
      targetId: String(event.id),
      metadata: { title, eventType, startDate },
    });

    return NextResponse.json({
      ok: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString() ?? null,
        location: event.location,
        isAllDay: event.isAllDay,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
