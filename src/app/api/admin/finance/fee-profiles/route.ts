import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

const profileSchema = z.object({
  feeGroupId: z.coerce.number().int().min(1),
  name: z.string().min(1).max(200),
  sessionId: z.coerce.number().int().min(1),
  termId: z.coerce.number().int().min(1),
  dueDate: z.string().optional(),
  classIds: z.array(z.coerce.number().int().min(1)).min(1, "Select at least one class"),
  armIds: z.array(z.coerce.number().int().min(1)).optional(),
  items: z.array(
    z.object({
      feeComponentId: z.coerce.number().int().min(1),
      amount: z.number().min(0),
      isOptional: z.boolean().default(false),
    })
  ).min(1, "Add at least one fee item"),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "BURSAR", "ACCOUNTANT"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "fees");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";

  const profiles = await prisma.feeProfile.findMany({
    where: { schoolId, isActive: true },
    include: {
      feeGroup: true,
      session: true,
      term: true,
      items: {
        include: { feeComponent: true },
        orderBy: { sortOrder: "asc" },
      },
      classes: { include: { class: true } },
      arms: { include: { arm: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get counts for activation check
  const profileCount = await prisma.feeProfile.count({ where: { schoolId, isActive: true } });

  return NextResponse.json({
    profiles: profiles.map((p) => ({
      id: p.id,
      name: p.name,
      feeGroupId: p.feeGroupId,
      feeGroupName: p.feeGroup.name,
      sessionId: p.sessionId,
      sessionName: p.session.name,
      termId: p.termId,
      termName: p.term.name,
      dueDate: p.dueDate?.toISOString() ?? null,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      items: p.items?.map((i) => ({
        id: i.id,
        feeComponentId: i.feeComponentId,
        feeComponentName: i.feeComponent?.name,
        amount: i.amount,
        isOptional: i.isOptional,
      })) ?? [],
      classes: p.classes?.map((c) => ({ id: c.classId, name: c.class?.name })) ?? [],
      arms: p.arms?.map((a) => ({ id: a.armId, name: a.arm?.name })) ?? [],
    })),
    stats: {
      totalProfiles: profileCount,
      isActivated: profileCount > 0,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "fees");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = profileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";
  const data = parsed.data;

  try {
    // Validate all fee component IDs exist
    const componentIds = data.items.map((i) => i.feeComponentId);
    const existingComponents = await prisma.feeComponent.count({
      where: { id: { in: componentIds } },
    });
    if (existingComponents !== componentIds.length) {
      return NextResponse.json({ error: "One or more fee components not found" }, { status: 400 });
    }

    // Create the profile with all relations
    const profile = await prisma.feeProfile.create({
      data: {
        schoolId,
        feeGroupId: data.feeGroupId,
        name: data.name.trim(),
        sessionId: data.sessionId,
        termId: data.termId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        items: {
          create: data.items.map((item, index) => ({
            feeComponentId: item.feeComponentId,
            amount: item.amount,
            isOptional: item.isOptional,
            sortOrder: index,
          })),
        },
        classes: {
          create: data.classIds.map((classId) => ({ classId })),
        },
        arms: {
          create: (data.armIds || []).map((armId) => ({ armId })),
        },
      },
      include: {
        feeGroup: true,
        items: { include: { feeComponent: true } },
        classes: { include: { class: true } },
        arms: { include: { arm: true } },
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "FEE_PROFILE_CREATED",
      targetType: "FeeProfile",
      targetId: String(profile.id),
      metadata: {
        name: data.name,
        classes: data.classIds.length,
        items: data.items.length,
      },
    });

    return NextResponse.json(
      {
        profile: {
          id: profile.id,
          name: profile.name,
          feeGroupName: profile.feeGroup.name,
          itemCount: profile.items.length,
          classCount: profile.classes.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create fee profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "fees");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  let parsedId: number;
  try {
    parsedId = parseNumericId(id ?? undefined, "fee profile id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid fee profile id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";

  try {
    // Check if any students have been billed with this profile
    // For now, just soft delete
    await prisma.feeProfile.update({
      where: { id: parsedId, schoolId },
      data: { isActive: false },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "FEE_PROFILE_DELETED",
      targetType: "FeeProfile",
      targetId: String(parsedId),
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete fee profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
