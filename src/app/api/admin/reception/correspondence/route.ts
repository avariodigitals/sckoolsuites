import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const correspondenceSchema = z.object({
  senderName: z.string().min(1).max(100),
  type: z.enum(["INCOMING", "OUTGOING"]),
  subject: z.string().min(1).max(200),
  description: z.string().min(1),
  senderAddress: z.string().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

async function generateRefNumber(schoolId: string): Promise<string> {
  const config = await prisma.schoolSetting.findUnique({
    where: { schoolId_key: { schoolId, key: "receptionConfig" } },
  });
  
  let prefix = "CORR";
  let digit = 3;
  
  if (config?.value) {
    try {
      const parsed = JSON.parse(config.value);
      if (parsed.correspondence) {
        prefix = parsed.correspondence.prefix || "CORR";
        digit = parsed.correspondence.digit || 3;
      }
    } catch {}
  }

  const last = await prisma.correspondence.findFirst({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
  });

  let nextNumber = 1;
  if (last?.refNumber) {
    const match = last.refNumber.match(/(\d+)$/);
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

  try {
    const items = await prisma.correspondence.findMany({
      where: { schoolId: "default" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching correspondence:", error);
    return NextResponse.json({ error: "Failed to fetch correspondence" }, { status: 500 });
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
    const validated = correspondenceSchema.parse(json);
    
    const refNumber = await generateRefNumber("default");

    const item = await prisma.correspondence.create({
      data: {
        ...validated,
        refNumber,
        schoolId: "default",
        status: "PENDING",
      },
    });

    await createAuditLog({
      actorUserId: session.user.id!,
      schoolId: "default",
      action: "CREATE",
      targetType: "Correspondence",
      targetId: item.id,
      details: `Recorded correspondence ${refNumber}`,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating correspondence:", error);
    return NextResponse.json({ error: "Failed to create correspondence" }, { status: 500 });
  }
}
