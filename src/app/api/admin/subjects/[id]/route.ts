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
  const allowed = await crudPrivilege(session, "PATCH", "subjects");
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
    parsedId = parseNumericId(id, "subject id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid subject id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, teacherId, classId, classGroupId } = body;

    // Check if subject exists and belongs to this school
    const existing = await prisma.subject.findFirst({
      where: { id: parsedId, schoolId: "default" },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    const data: Prisma.SubjectUpdateInput = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { error: "Subject name is required" },
          { status: 400 }
        );
      }
      // Check for duplicate name
      const duplicate = await prisma.subject.findFirst({
        where: {
          schoolId: "default",
          name: name.trim(),
          id: { not: parsedId },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Subject with this name already exists" },
          { status: 409 }
        );
      }
      data.name = name.trim();
    }

    if (teacherId !== undefined) {
      const parsedTeacherId = teacherId ? Number(teacherId) : null;
      if (parsedTeacherId && Number.isNaN(parsedTeacherId)) {
        return NextResponse.json({ error: "Invalid teacher ID" }, { status: 400 });
      }
      if (parsedTeacherId) {
        const teacher = await prisma.teacher.findFirst({
          where: { id: parsedTeacherId, schoolId: "default" },
        });
        if (!teacher) {
          return NextResponse.json(
            { error: "Invalid teacher selected" },
            { status: 400 }
          );
        }
      }
      data.teacher = parsedTeacherId ? { connect: { id: parsedTeacherId } } : { disconnect: true };
    }

    if (classId !== undefined) {
      const parsedClassId = classId ? Number(classId) : null;
      if (parsedClassId && Number.isNaN(parsedClassId)) {
        return NextResponse.json({ error: "Invalid class ID" }, { status: 400 });
      }
      if (parsedClassId) {
        const cls = await prisma.class.findFirst({
          where: { id: parsedClassId, schoolId: "default" },
        });
        if (!cls) {
          return NextResponse.json(
            { error: "Invalid class selected" },
            { status: 400 }
          );
        }
      }
      data.class = parsedClassId ? { connect: { id: parsedClassId } } : { disconnect: true };
    }

    if (classGroupId !== undefined) {
      const parsedClassGroupId = classGroupId ? Number(classGroupId) : null;
      if (parsedClassGroupId && Number.isNaN(parsedClassGroupId)) {
        return NextResponse.json({ error: "Invalid class group ID" }, { status: 400 });
      }
      if (parsedClassGroupId) {
        const group = await prisma.classGroup.findFirst({
          where: { id: parsedClassGroupId, schoolId: "default" },
        });
        if (!group) {
          return NextResponse.json(
            { error: "Invalid class group selected" },
            { status: 400 }
          );
        }
      }
      data.classGroup = parsedClassGroupId ? { connect: { id: parsedClassGroupId } } : { disconnect: true };
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.subject.update({
      where: { id: parsedId },
      data,
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
  const allowed = await crudPrivilege(session, "DELETE", "subjects");
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
    parsedId = parseNumericId(id, "subject id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid subject id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    // Check if subject exists and belongs to this school
    const subject = await prisma.subject.findFirst({
      where: { id: parsedId, schoolId: "default" },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    // Check if subject is assigned to a class or class group
    if (subject.classId !== null || subject.classGroupId !== null) {
      return NextResponse.json(
        { error: "Cannot delete subject assigned to classes. Remove assignments first." },
        { status: 409 }
      );
    }

    await prisma.subject.delete({
      where: { id: parsedId },
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
