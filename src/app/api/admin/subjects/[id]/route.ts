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
        { error: "Subject name is required" },
        { status: 400 }
      );
    }

    // Check if subject exists and belongs to this school
    const existing = await prisma.subject.findFirst({
      where: { id, schoolId: "default" },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    // Check for duplicate name
    const duplicate = await prisma.subject.findFirst({
      where: {
        schoolId: "default",
        name: name.trim(),
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Subject with this name already exists" },
        { status: 409 }
      );
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ subject: updated });
  } catch (error) {
    console.error("Failed to update subject:", error);
    return NextResponse.json(
      { error: "Failed to update subject" },
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
    // Check if subject exists and belongs to this school
    const subject = await prisma.subject.findFirst({
      where: { id, schoolId: "default" },
      include: { classes: true },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    // Check if subject is assigned to classes
    if (subject.classes.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete subject assigned to classes. Remove assignments first." },
        { status: 409 }
      );
    }

    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete subject:", error);
    return NextResponse.json(
      { error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}
