import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  source: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  stage: z.string().min(1).optional(),
  subject: z.string().min(1).max(200).optional(),
  notes: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  try {
    const existing = await prisma.enquiry.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const enquiry = await prisma.enquiry.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.source && { source: data.source }),
        ...(data.type && { type: data.type }),
        ...(data.stage && { stage: data.stage }),
        ...(data.subject && { subject: data.subject.trim() }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.followUpDate !== undefined && { followUpDate: data.followUpDate ? new Date(data.followUpDate) : null }),
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ENQUIRY_UPDATED",
      targetType: "Enquiry",
      targetId: enquiry.id,
      metadata: { enquiryNumber: enquiry.enquiryNumber },
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update enquiry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const schoolId = "default";

  try {
    const existing = await prisma.enquiry.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    await prisma.enquiry.delete({ where: { id } });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ENQUIRY_DELETED",
      targetType: "Enquiry",
      targetId: id,
      metadata: { enquiryNumber: existing.enquiryNumber },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete enquiry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
