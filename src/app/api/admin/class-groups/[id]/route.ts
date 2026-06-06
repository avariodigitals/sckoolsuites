import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user;
  const { id } = await params;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      where: { id, schoolId: "default" },
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
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Class group with this name already exists" },
        { status: 409 }
      );
    }

    const updated = await prisma.classGroup.update({
      where: { id },
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
  const user = session?.user;
  const { id } = await params;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if class group exists and belongs to this school
    const classGroup = await prisma.classGroup.findFirst({
      where: { id, schoolId: "default" },
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
      where: { id },
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
