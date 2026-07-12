import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const enquirySchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  source: z.string().min(1),
  type: z.string().min(1),
  stage: z.string().min(1),
  subject: z.string().min(1).max(200),
  notes: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

async function generateEnquiryNumber(schoolId: string): Promise<string> {
  // Get config for prefix
  const config = await prisma.schoolSetting.findUnique({
    where: { schoolId_key: { schoolId, key: "receptionConfig" } },
  });
  
  let prefix = "RESM";
  let digit = 3;
  
  if (config?.value) {
    try {
      const parsed = JSON.parse(config.value);
      if (parsed.enquiry) {
        prefix = parsed.enquiry.prefix || "RESM";
        digit = parsed.enquiry.digit || 3;
      }
    } catch {
      // use defaults
    }
  }

  // Get last enquiry number
  const lastEnquiry = await prisma.enquiry.findFirst({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
  });

  let nextNumber = 1;
  if (lastEnquiry?.enquiryNumber) {
    const match = lastEnquiry.enquiryNumber.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
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
  const stage = searchParams.get("stage");
  const search = searchParams.get("q");

  try {
    const where: Record<string, unknown> = { schoolId };
    
    if (stage && stage !== "ALL") {
      where.stage = stage;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { enquiryNumber: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const enquiries = await prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      enquiries: enquiries.map((e: any) => ({
        id: e.id,
        enquiryNumber: e.enquiryNumber,
        name: e.name,
        phone: e.phone,
        email: e.email,
        source: e.source,
        type: e.type,
        stage: e.stage,
        subject: e.subject,
        notes: e.notes,
        followUpDate: e.followUpDate?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load enquiries";
    return NextResponse.json({ error: message }, { status: 500 });
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
  const parsed = enquirySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  try {
    const enquiryNumber = await generateEnquiryNumber(schoolId);

    const enquiry = await prisma.enquiry.create({
      data: {
        schoolId,
        enquiryNumber,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        source: data.source,
        type: data.type,
        stage: data.stage,
        subject: data.subject.trim(),
        notes: data.notes?.trim() || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ENQUIRY_CREATED",
      targetType: "Enquiry",
      targetId: enquiry.id,
      metadata: { enquiryNumber, name: data.name },
    });

    return NextResponse.json({
      enquiry: {
        id: enquiry.id,
        enquiryNumber: enquiry.enquiryNumber,
        name: enquiry.name,
        phone: enquiry.phone,
        email: enquiry.email,
        source: enquiry.source,
        type: enquiry.type,
        stage: enquiry.stage,
        subject: enquiry.subject,
        notes: enquiry.notes,
        followUpDate: enquiry.followUpDate?.toISOString() ?? null,
        createdAt: enquiry.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create enquiry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
