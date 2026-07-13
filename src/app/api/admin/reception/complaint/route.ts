import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const complaintSchema = z.object({
  complainantName: z.string().min(1).max(100),
  complainantType: z.string().min(1),
  complaintType: z.string().min(1),
  subject: z.string().min(1).max(200),
  description: z.string().min(1),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

async function generateComplaintNumber(schoolId: string): Promise<string> {
  const config = await prisma.schoolSetting.findUnique({
    where: { schoolId_key: { schoolId, key: "receptionConfig" } },
  });
  
  let prefix = "COMP";
  let digit = 3;
  
  if (config?.value) {
    try {
      const parsed = JSON.parse(config.value);
      if (parsed.complaint) {
        prefix = parsed.complaint.prefix || "COMP";
        digit = parsed.complaint.digit || 3;
      }
    } catch {}
  }

  const last = await prisma.receptionComplaint.findFirst({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
  });

  let nextNumber = 1;
  if (last?.complaintNumber) {
    const match = last.complaintNumber.match(/(\d+)$/);
    if (match) nextNumber = parseInt(match[1]) + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(digit, "0")}`;
}

export async function GET(_request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "reception");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const complaints = await prisma.receptionComplaint.findMany({
      where: { schoolId: "default" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ complaints });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
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

  try {
    const json = await request.json();
    const validated = complaintSchema.parse(json);
    
    const complaintNumber = await generateComplaintNumber("default");

    const complaint = await prisma.receptionComplaint.create({
      data: {
        ...validated,
        complaintNumber,
        schoolId: "default",
        status: "OPEN",
      },
    });

    await createAuditLog({
      actorUserId: session.user.id!,
      schoolId: "default",
      action: "CREATE",
      targetType: "Complaint",
      targetId: complaint.id,
      details: `Created complaint ${complaintNumber}`,
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating complaint:", error);
    return NextResponse.json({ error: "Failed to create complaint" }, { status: 500 });
  }
}
