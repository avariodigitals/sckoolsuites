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
    const { name, isActive, capacity } = body;

    // Check if arm exists and belongs to this school
    const existing = await prisma.classArm.findFirst({
      where: { id, schoolId: "default" },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Class arm not found" },
        { status: 404 }
      );
    }

    // If updating name, check for duplicates in the same class
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.classArm.findFirst({
        where: {
          schoolId: "default",
          classId: existing.classId,
          name: name.trim(),
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Arm with this name already exists in this class" },
          { status: 409 }
        );
      }
    }

    const updateData: { name?: string; isActive?: boolean } = {};
    if (name?.trim()) updateData.name = name.trim();
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const updated = await prisma.classArm.update({
      where: { id },
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
  const user = session?.user;
  const { id } = await params;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if arm exists and belongs to this school
    const arm = await prisma.classArm.findFirst({
      where: { id, schoolId: "default" },
      include: { 
        class: { include: { students: true } }
      },
    });

    if (!arm) {
      return NextResponse.json(
        { error: "Class arm not found" },
        { status: 404 }
      );
    }

    await prisma.classArm.delete({
      where: { id },
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
