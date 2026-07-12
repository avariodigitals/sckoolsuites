import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

const querySchema = z.object({
  querierName: z.string().min(1).max(100),
  querierContact: z.string().optional().nullable(),
  queryType: z.string().min(1),
  subject: z.string().min(1).max(200),
  description: z.string().min(1),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

async function generateQueryNumber(schoolId: string): Promise<string> {
  const config = await prisma.schoolSetting.findUnique({
    where: { schoolId_key: { schoolId, key: "receptionConfig" } },
  });
  
  let prefix = "QUER";
  let digit = 3;
  
  if (config?.value) {
    try {
      const parsed = JSON.parse(config.value);
      if (parsed.query) {
        prefix = parsed.query.prefix || "QUER";
        digit = parsed.query.digit || 3;
      }
    } catch {}
  }

  const last = await prisma.query.findFirst({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
  });

  let nextNumber = 1;
  if (last?.queryNumber) {
    const match = last.queryNumber.match(/(\d+)$/);
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
    const queries = await prisma.query.findMany({
      where: { schoolId: "default" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ queries });
  } catch (error) {
    console.error("Error fetching queries:", error);
    return NextResponse.json({ error: "Failed to fetch queries" }, { status: 500 });
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
    const validated = querySchema.parse(json);
    
    const queryNumber = await generateQueryNumber("default");

    const query = await prisma.query.create({
      data: {
        ...validated,
        queryNumber,
        schoolId: "default",
        status: "PENDING",
      },
    });

    await createAuditLog({
      actorUserId: session.user.id!,
      schoolId: "default",
      action: "CREATE",
      targetType: "Query",
      targetId: query.id,
      details: `Recorded query ${queryNumber}`,
    });

    return NextResponse.json({ query }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating query:", error);
    return NextResponse.json({ error: "Failed to create query" }, { status: 500 });
  }
}
