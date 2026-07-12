import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";

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
    parsedId = parseNumericId(id, "class group id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid class group id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Class group name is required" },
        { status: 400 }
      );
    }

    // Check if class group exists and belongs to this school
    const existing = await prisma.classGroup.findFirst({
      where: { id: parsedId, schoolId: "default" },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Class group not found" },
        { status: 404 }
      );
    }

    // Check for duplicate name
    const duplicate = await prisma.classGroup.findFirst({
      where: {
        schoolId: "default",
        name: name.trim(),
        id: { not: parsedId },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Class group with this name already exists" },
        { status: 409 }
      );
    }

    const updated = await prisma.classGroup.update({
      where: { id: parsedId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ classGroup: updated });
  } catch (error) {
    console.error("Failed to update class group:", error);
    return NextResponse.json(
      { error: "Failed to update class group" },
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
    parsedId = parseNumericId(id, "class group id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid class group id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    // Check if class group exists and belongs to this school
    const classGroup = await prisma.classGroup.findFirst({
      where: { id: parsedId, schoolId: "default" },
      include: { classes: true },
    });

    if (!classGroup) {
      return NextResponse.json(
        { error: "Class group not found" },
        { status: 404 }
      );
    }

    // Check if there are classes using this group
    if (classGroup.classes.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete class group with existing classes. Reassign classes first." },
        { status: 409 }
      );
    }

    await prisma.classGroup.delete({
      where: { id: parsedId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete class group:", error);
    return NextResponse.json(
      { error: "Failed to delete class group" },
      { status: 500 }
    );
  }
}
