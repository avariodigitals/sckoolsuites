import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  purpose: z.string().min(1).max(100),
  whomToSee: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const checkoutSchema = z.object({
  id: z.string().min(1),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "reception");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  // Get status filter from query params
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");
  const searchQuery = url.searchParams.get("q");

  const where: Record<string, unknown> = { schoolId };

  if (statusFilter && ["CHECKED_IN", "CHECKED_OUT"].includes(statusFilter)) {
    where.status = statusFilter;
  }

  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { purpose: { contains: searchQuery, mode: "insensitive" } },
      { whomToSee: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const visitors = await prisma.visitor.findMany({
    where,
    orderBy: { checkInTime: "desc" },
  });

  // Get stats
  const [checkedInCount, checkedOutCount, todayCount] = await Promise.all([
    prisma.visitor.count({ where: { schoolId, status: "CHECKED_IN" } }),
    prisma.visitor.count({ where: { schoolId, status: "CHECKED_OUT" } }),
    prisma.visitor.count({
      where: {
        schoolId,
        checkInTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return NextResponse.json({
    visitors: visitors.map((v: any) => ({
      id: v.id,
      name: v.name,
      phone: v.phone,
      email: v.email,
      purpose: v.purpose,
      whomToSee: v.whomToSee,
      department: v.department,
      status: v.status,
      checkInTime: v.checkInTime.toISOString(),
      checkOutTime: v.checkOutTime?.toISOString() ?? null,
      notes: v.notes,
    })),
    stats: {
      checkedIn: checkedInCount,
      checkedOut: checkedOutCount,
      today: todayCount,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "reception");
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
    const visitor = await prisma.visitor.create({
      data: {
        schoolId,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        purpose: data.purpose.trim(),
        whomToSee: data.whomToSee?.trim() || null,
        department: data.department?.trim() || null,
        notes: data.notes?.trim() || null,
        status: "CHECKED_IN",
        checkInTime: new Date(),
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "VISITOR_CHECKED_IN",
      targetType: "Visitor",
      targetId: visitor.id,
      metadata: {
        visitorId: visitor.id,
        name: data.name,
        purpose: data.purpose,
      },
    });

    return NextResponse.json(
      {
        visitor: {
          id: visitor.id,
          name: visitor.name,
          phone: visitor.phone,
          email: visitor.email,
          purpose: visitor.purpose,
          whomToSee: visitor.whomToSee,
          department: visitor.department,
          status: visitor.status,
          checkInTime: visitor.checkInTime.toISOString(),
          notes: visitor.notes,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check in visitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "reception");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const { id } = parsed.data;

  // Check visitor exists and belongs to school
  const existing = await prisma.visitor.findFirst({
    where: { id, schoolId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
  }

  if (existing.status === "CHECKED_OUT") {
    return NextResponse.json({ error: "Visitor already checked out" }, { status: 400 });
  }

  try {
    const visitor = await prisma.visitor.update({
      where: { id },
      data: {
        status: "CHECKED_OUT",
        checkOutTime: new Date(),
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "VISITOR_CHECKED_OUT",
      targetType: "Visitor",
      targetId: visitor.id,
      metadata: {
        visitorId: visitor.id,
        name: visitor.name,
        duration: visitor.checkOutTime
          ? Math.round((visitor.checkOutTime.getTime() - visitor.checkInTime.getTime()) / 60000)
          : null,
      },
    });

    return NextResponse.json({
      visitor: {
        id: visitor.id,
        name: visitor.name,
        status: visitor.status,
        checkOutTime: visitor.checkOutTime?.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check out visitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
