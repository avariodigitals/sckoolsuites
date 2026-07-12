import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "income");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.incomeCategory.findMany({
    where: { schoolId: "default" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "income");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description } = body;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const category = await prisma.incomeCategory.create({
    data: { schoolId: "default", name, description: description || null },
  });
  return NextResponse.json(category);
}

export async function DELETE(req: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "income");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "income category id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid income category id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await prisma.incomeCategory.delete({ where: { id: parsedId } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to delete category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
