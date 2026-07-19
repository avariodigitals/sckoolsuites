import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";
import { Prisma } from "@prisma/client";

const addSchema = z.object({
  parentId: z.coerce.number().int().min(1).optional(),
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  relationship: z.string().max(50).optional(),
  occupation: z.string().max(100).optional(),
  employerName: z.string().max(120).optional(),
  workAddress: z.string().max(300).optional(),
  workPhone: z.string().max(20).optional(),
  homeAddress: z.string().max(300).optional(),
  idDocumentType: z.string().max(50).optional(),
  idDocumentNumber: z.string().max(50).optional(),
  isPrimary: z.boolean().default(false),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "REGISTRAR"].includes(role) : false;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const schoolId = "default";

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const student = await prisma.student.findFirst({
    where: { id: parsedId, schoolId },
    include: { parent: { include: { user: true } } },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Primary guardian (from student.parent_id)
  const primary = student.parent
    ? {
        id: student.parent.id,
        userId: student.parent.userId,
        title: student.parent.title ?? null,
        name: [student.parent.title, student.parent.user.name].filter(Boolean).join(" "),
        email: student.parent.user.email,
        phone: student.parent.user.phone,
        address: student.parent.user.address,
        relationship: "Primary Guardian",
        isPrimary: true,
      }
    : null;

  // Additional guardians from student_guardian junction (if table exists)
  let additional: Array<{
    id: number;
    userId: number;
    title: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    relationship: string;
    isPrimary: boolean;
  }> = [];
  try {
    const rows = await prisma.studentGuardian.findMany({
      where: { studentId: parsedId },
      include: { parent: { include: { user: true } } },
    });
    if (rows) {
      additional = rows.map((row) => ({
        id: row.parent.id,
        userId: row.parent.userId,
        title: row.parent.title ?? null,
        name: [row.parent.title, row.parent.user.name].filter(Boolean).join(" "),
        email: row.parent.user.email,
        phone: row.parent.user.phone,
        address: row.parent.user.address,
        relationship: row.relationship ?? "Guardian",
        isPrimary: false,
      }));
    }
  } catch {
    // Table may not exist yet
  }

  return NextResponse.json({ primary, additional });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const schoolId = "default";
  const payload = await request.json();
  const parsed = addSchema.safeParse(payload);

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student id";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const student = await prisma.student.findFirst({ where: { id: parsedId, schoolId } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    let parentId: number;

    if (data.parentId) {
      // Link existing parent
      const existing = await prisma.parent.findFirst({ where: { id: data.parentId, schoolId } });
      if (!existing) {
        return NextResponse.json({ error: "Parent not found" }, { status: 404 });
      }
      parentId = existing.id;
    } else if (data.name && data.email) {
      // Create new parent user
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }

      const parentRole = await prisma.role.findUnique({ where: { name: "PARENT" } });
      if (!parentRole) {
        return NextResponse.json({ error: "Parent role not found" }, { status: 500 });
      }

      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: {
            roleId: parentRole.id,
            name: data.name!.trim(),
            email: data.email!.trim(),
            phone: data.phone?.trim() || null,
            address: data.address?.trim() || null,
            password: await hashPassword(data.email!.split("@")[0] + "123"),
            isActive: true,
          },
        });
        const parent = await tx.parent.create({
          data: {
            userId: user.id,
            occupation: data.occupation?.trim() || null,
            employerName: data.employerName?.trim() || null,
            workAddress: data.workAddress?.trim() || null,
            workPhone: data.workPhone?.trim() || null,
            homeAddress: data.homeAddress?.trim() || null,
            idDocumentType: data.idDocumentType?.trim() || null,
            idDocumentNumber: data.idDocumentNumber?.trim() || null,
          },
        });
        return parent;
      });
      parentId = result.id;
    } else {
      return NextResponse.json({ error: "Provide either parentId or name+email" }, { status: 400 });
    }

    // If student has no primary parent, or this guardian is marked primary,
    // set them as the student's parentId so the student is properly connected.
    if (!student.parentId || data.isPrimary) {
      await prisma.student.update({
        where: { id: parsedId },
        data: { parentId },
      });
    }

    // Create junction record (if table exists)
    try {
      await prisma.studentGuardian.create({
        data: {
          studentId: parsedId,
          parentId,
          relationship: data.relationship ?? "Guardian",
          isPrimary: data.isPrimary || !student.parentId,
        },
      });
    } catch {
      // Table may not exist; just ignore for now
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "STUDENT_GUARDIAN_ADDED",
      targetType: "Student",
      targetId: String(parsedId),
      metadata: { studentId: parsedId, parentId },
    });

    return NextResponse.json({ ok: true, parentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add guardian";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const parentIdRaw = url.searchParams.get("parentId");
  if (!parentIdRaw) {
    return NextResponse.json({ error: "parentId required" }, { status: 400 });
  }

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let parentId: number;
  try {
    parentId = parseNumericId(parentIdRaw, "parent id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid parent id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  try {
    await prisma.studentGuardian.deleteMany({
      where: { studentId: parsedId, parentId },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "STUDENT_GUARDIAN_REMOVED",
      targetType: "Student",
      targetId: String(parsedId),
      metadata: { studentId: parsedId, parentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove guardian";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
