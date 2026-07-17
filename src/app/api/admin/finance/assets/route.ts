import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "expenses");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assets = await prisma.asset.findMany({
    where: { schoolId: "default" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "expenses");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name,
    assetType,
    category,
    purchaseValue,
    currentValue,
    purchaseDate,
    depreciationRate,
    location,
    condition,
    description,
    serialNumber,
  } = body;

  if (!name || !assetType || !category || !purchaseValue || !purchaseDate) {
    return NextResponse.json(
      { error: "Name, asset type, category, purchase value, and purchase date are required" },
      { status: 400 }
    );
  }

  const asset = await prisma.asset.create({
    data: {
      schoolId: "default",
      name: String(name).trim(),
      assetType: String(assetType).trim(),
      category: String(category).trim(),
      purchaseValue: Number(purchaseValue),
      currentValue: Number(currentValue ?? purchaseValue),
      purchaseDate: new Date(purchaseDate),
      depreciationRate: depreciationRate ? Number(depreciationRate) : 0,
      location: location || null,
      condition: condition || "GOOD",
      description: description || null,
      serialNumber: serialNumber || null,
    },
  });

  return NextResponse.json(asset);
}

export async function PATCH(req: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "expenses");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, currentValue, condition, location, isActive, description } = body;

  if (!id) return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });

  const existing = await prisma.asset.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const asset = await prisma.asset.update({
    where: { id: Number(id) },
    data: {
      ...(currentValue !== undefined && { currentValue: Number(currentValue) }),
      ...(condition !== undefined && { condition: String(condition) }),
      ...(location !== undefined && { location: location || null }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      ...(description !== undefined && { description: description || null }),
    },
  });

  return NextResponse.json(asset);
}

export async function DELETE(req: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "expenses");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  try {
    await prisma.asset.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to delete asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
