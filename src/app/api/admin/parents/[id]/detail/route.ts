import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth, hashPassword } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  password: z.string().min(6).optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "ACCOUNTANT", "TEACHER"].includes(role) : false;
}

function canEdit(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "parents");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parentId: number;
  try {
    parentId = parseNumericId(id, "parent id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid parent id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  try {
    const parent = await prisma.parent.findFirst({
      where: { id: parentId, schoolId },
      include: {
        user: true,
        students: {
          include: { user: true, class: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    const studentIds = parent.students.map((s) => s.id);

    const [invoices, payments, receipts, messages, complaints, additionalGuardians] = await Promise.all([
      prisma.invoice.findMany({
        where: { parentId, schoolId },
        include: { term: true, session: true, student: { include: { user: true } }, class: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.payment.findMany({
        where: { studentId: { in: studentIds }, schoolId },
        include: { invoice: true, student: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.receipt.findMany({
        where: { parentId, schoolId },
        include: { student: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.parentMessage.findMany({
        where: { parentId, schoolId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.parentComplaint.findMany({
        where: { parentId, schoolId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.studentGuardian.findMany({
        where: { studentId: { in: studentIds } },
        include: { student: { include: { user: true } }, parent: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const outstanding = invoices.reduce((sum: any, item: any) => sum + (Number(item.balance) || 0), 0);
    const totalPaid = payments.reduce((sum: any, item: any) => sum + (Number(item.amount) || 0), 0);

    const profileKeys = {
      phone: `parent_profile_phone_${parent.id}`,
      address: `parent_profile_address_${parent.id}`,
      emergencyContact: `parent_profile_emergency_${parent.id}`,
    };

    const settings = await prisma.schoolSetting.findMany({
      where: { key: { in: [profileKeys.phone, profileKeys.address, profileKeys.emergencyContact] } },
    });

    const settingMap = new Map(settings.map((s: any) => [s.key, s.value]));

    return NextResponse.json({
      parent,
      studentIds,
      invoices,
      payments,
      receipts,
      messages,
      complaints,
      additionalGuardians,
      outstanding,
      totalPaid,
      profile: {
        phone: settingMap.get(profileKeys.phone) ?? "",
        address: settingMap.get(profileKeys.address) ?? "",
        emergencyContact: settingMap.get(profileKeys.emergencyContact) ?? "",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch parent details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "parents");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !canEdit(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parentId: number;
  try {
    parentId = parseNumericId(id, "parent id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid parent id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  try {
    const parent = await prisma.parent.findFirst({
      where: { id: parentId, schoolId },
      include: { user: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const userData: { name?: string; email?: string; isActive?: boolean; password?: string } = {};
    if (data.name !== undefined) userData.name = data.name.trim();
    if (data.email !== undefined) userData.email = data.email.trim();
    if (data.isActive !== undefined) userData.isActive = data.isActive;
    if (data.password !== undefined) userData.password = await hashPassword(data.password);

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: parent.userId }, data: userData });
    }

    const profileKeys = {
      phone: `parent_profile_phone_${parent.id}`,
      address: `parent_profile_address_${parent.id}`,
      emergencyContact: `parent_profile_emergency_${parent.id}`,
    };

    const settingUpdates = [
      { key: profileKeys.phone, value: data.phone ?? data.phone },
      { key: profileKeys.address, value: data.address ?? data.address },
      { key: profileKeys.emergencyContact, value: data.emergencyContact ?? data.emergencyContact },
    ].filter((item): item is { key: string; value: string } => item.value !== undefined);

    await Promise.all(
      settingUpdates.map((item) =>
        prisma.schoolSetting.upsert({
          where: { key: item.key },
          update: { value: item.value },
          create: { key: item.key, value: item.value, school: { connect: { id: "default" } } },
        })
      )
    );

    const updatedParent = await prisma.parent.findFirst({
      where: { id: parentId, schoolId },
      include: {
        user: true,
        students: { include: { user: true, class: true }, orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json({ parent: updatedParent, message: "Updated" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update parent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
