import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const profileSchema = z.object({
  feeGroupId: z.string().min(1),
  name: z.string().min(1).max(200),
  sessionId: z.string().min(1),
  termId: z.string().min(1),
  dueDate: z.string().optional(),
  classIds: z.array(z.string()).min(1, "Select at least one class"),
  armIds: z.array(z.string()).optional(),
  items: z.array(
    z.object({
      feeComponentId: z.string().min(1),
      amount: z.number().min(0),
      isOptional: z.boolean().default(false),
    })
  ).min(1, "Add at least one fee item"),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN", "BURSAR", "ACCOUNTANT"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

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
      items: p.items?.map((i: any) => ({
        id: i.id,
        feeComponentId: i.feeComponentId,
        feeComponentName: i.feeComponent?.name,
        amount: i.amount,
        isOptional: i.isOptional,
      })) ?? [],
      classes: p.classes?.map((c: any) => ({ id: c.classId, name: c.class?.name })) ?? [],
      arms: p.arms?.map((a: any) => ({ id: a.armId, name: a.arm?.name })) ?? [],
    })),
    stats: {
      totalProfiles: profileCount,
      isActivated: profileCount > 0,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = profileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  try {
    // Validate all fee component IDs exist
    const componentIds = data.items.map((i) => i.feeComponentId);
    const existingComponents = await prisma.feeComponent.count({
      where: { id: { in: componentIds }, schoolId },
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
      targetId: profile.id,
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
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const schoolId = "default";

  try {
    // Check if any students have been billed with this profile
    // For now, just soft delete
    await prisma.feeProfile.update({
      where: { id, schoolId },
      data: { isActive: false },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "FEE_PROFILE_DELETED",
      targetType: "FeeProfile",
      targetId: id,
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete fee profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
