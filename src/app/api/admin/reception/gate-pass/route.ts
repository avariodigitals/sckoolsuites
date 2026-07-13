import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const gatePassSchema = z.object({
  personName: z.string().min(1).max(100),
  personType: z.string().min(1),
  purpose: z.string().min(1),
  destination: z.string().optional().nullable(),
  exitTime: z.string(),
  expectedReturn: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

async function generatePassNumber(schoolId: string): Promise<string> {
  const config = await prisma.schoolSetting.findUnique({
    where: { schoolId_key: { schoolId, key: "receptionConfig" } },
  });
  
  let prefix = "RGPSM";
  let digit = 3;
  
  if (config?.value) {
    try {
      const parsed = JSON.parse(config.value);
      if (parsed.gatePass) {
        prefix = parsed.gatePass.prefix || "RGPSM";
        digit = parsed.gatePass.digit || 3;
      }
    } catch {}
  }

  const lastPass = await prisma.gatePass.findFirst({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
  });

  let nextNumber = 1;
  if (lastPass?.passNumber) {
    const match = lastPass.passNumber.match(/(\d+)$/);
    if (match) nextNumber = parseInt(match[1]) + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(digit, "0")}`;
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

  const { searchParams } = new URL(request.url);
  const schoolId = "default";
  const status = searchParams.get("status");

  try {
    const where: Record<string, unknown> = { schoolId };
    if (status && status !== "ALL") where.status = status;

    const passes = await prisma.gatePass.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { issuedBy: { select: { name: true } } },
    });

    return NextResponse.json({
      passes: passes.map((p: any) => ({
        id: p.id,
        passNumber: p.passNumber,
        personName: p.personName,
        personType: p.personType,
        purpose: p.purpose,
        destination: p.destination,
        exitTime: p.exitTime.toISOString(),
        expectedReturn: p.expectedReturn?.toISOString() ?? null,
        actualReturn: p.actualReturn?.toISOString() ?? null,
        status: p.status,
        issuedBy: p.issuedBy?.name ?? null,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load gate passes" }, { status: 500 });
  }
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

  const body = await request.json();
  const parsed = gatePassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  try {
    const passNumber = await generatePassNumber(schoolId);

    const pass = await prisma.gatePass.create({
      data: {
        schoolId,
        passNumber,
        personName: data.personName.trim(),
        personType: data.personType,
        purpose: data.purpose,
        destination: data.destination?.trim() || null,
        exitTime: new Date(data.exitTime),
        expectedReturn: data.expectedReturn ? new Date(data.expectedReturn) : null,
        notes: data.notes?.trim() || null,
        issuedById: session.user.id,
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "GATEPASS_CREATED",
      targetType: "GatePass",
      targetId: pass.id,
      metadata: { passNumber },
    });

    return NextResponse.json({ pass: { ...pass, exitTime: pass.exitTime.toISOString() } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create gate pass" }, { status: 500 });
  }
}
