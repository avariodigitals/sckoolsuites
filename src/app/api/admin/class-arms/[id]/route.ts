import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";
import { Prisma } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "classes");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session?.user;
  const { id } = await params;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "class arm id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid class arm id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = user.schoolId || "default";

  try {
    const body = await request.json();
    const { name, isActive, capacity } = body;

    // Check if arm exists and belongs to this school
    const existing = await prisma.classArm.findFirst({
      where: { id: parsedId, schoolId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Class arm not found" },
        { status: 404 }
      );
    }

    // If updating name, check for duplicates
    if (name && name.trim() !== existing.name) {
      const dupWhere: Prisma.ClassArmWhereInput = {
        schoolId,
        name: name.trim(),
        id: { not: parsedId },
      };
      // Preset arms (classId null) must be unique across school
      // Assigned arms must be unique within their class
      if (existing.classId === null) {
        dupWhere.classId = null;
      } else {
        dupWhere.classId = existing.classId;
      }
      const duplicate = await prisma.classArm.findFirst({ where: dupWhere });

      if (duplicate) {
        return NextResponse.json(
          { error: existing.classId === null ? "An arm with this name already exists" : "Arm with this name already exists in this class" },
          { status: 409 }
        );
      }
    }

    const updateData: { name?: string; isActive?: boolean; capacity?: number | null } = {};
    if (name?.trim()) updateData.name = name.trim();
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity, 10) : null;

    const updated = await prisma.classArm.update({
      where: { id: parsedId },
      data: updateData,
    });

    return NextResponse.json({ arm: updated });
  } catch (error) {
    console.error("Failed to update class arm:", error);
    return NextResponse.json(
      { error: "Failed to update class arm" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "classes");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session?.user;
  const { id } = await params;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "class arm id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid class arm id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = user.schoolId || "default";

  try {
    // Check if arm exists and belongs to this school
    const arm = await prisma.classArm.findFirst({
      where: { id: parsedId, schoolId },
    });

    if (!arm) {
      return NextResponse.json(
        { error: "Class arm not found" },
        { status: 404 }
      );
    }

    await prisma.classArm.delete({
      where: { id: parsedId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete class arm:", error);
    return NextResponse.json(
      { error: "Failed to delete class arm" },
      { status: 500 }
    );
  }
}
