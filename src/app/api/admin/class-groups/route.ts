import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "classes");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schoolId = user.schoolId || "default";
    const classGroups = await prisma.classGroup.findMany({
      where: { schoolId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ classGroups });
  } catch (error) {
    console.error("Failed to fetch class groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch class groups" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "classes");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schoolId = user.schoolId || "default";

    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Class group name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await prisma.classGroup.findUnique({
      where: { schoolId_name: { schoolId, name: name.trim() } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Class group with this name already exists" },
        { status: 409 }
      );
    }

    const classGroup = await prisma.classGroup.create({
      data: {
        schoolId,
        name: name.trim(),
      },
    });

    return NextResponse.json({ classGroup }, { status: 201 });
  } catch (error) {
    console.error("Failed to create class group:", error);
    return NextResponse.json(
      { error: "Failed to create class group" },
      { status: 500 }
    );
  }
}
