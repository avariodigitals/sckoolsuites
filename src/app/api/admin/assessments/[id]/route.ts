import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  headings: z.array(z.object({ name: z.string().min(1), description: z.string().optional() })).optional(),
  gradingScale: z.array(z.object({ min: z.number(), grade: z.string(), gpa: z.number().optional(), label: z.string().optional() })).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "assessments");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "assessment id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid assessment id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const existing = await prisma.assessment.findUnique({ where: { id: parsedId } });
    if (!existing) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await prisma.assessment.findFirst({
        where: { name: data.name.trim(), schoolId: existing.schoolId, isActive: true, id: { not: parsedId } },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Assessment name already exists" }, { status: 409 });
      }
    }

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() ?? null;
    if (data.headings !== undefined) updateData.headings = data.headings;
    if (data.gradingScale !== undefined) updateData.gradingScale = data.gradingScale;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const assessment = await prisma.assessment.update({
      where: { id: parsedId },
      data: updateData,
    });

    return NextResponse.json({ assessment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update assessment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "assessments");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "assessment id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid assessment id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const existing = await prisma.assessment.findUnique({ where: { id: parsedId } });
    if (!existing) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Soft delete by deactivating
    await prisma.assessment.update({
      where: { id: parsedId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete assessment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
