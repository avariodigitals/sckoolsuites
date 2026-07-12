import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "income");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = { schoolId: "default" };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const incomes = await prisma.income.findMany({
    where,
    orderBy: { date: "desc" },
    include: { category: true },
  });

  return NextResponse.json(incomes);
}

export async function POST(req: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "income");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { categoryId, amount, description, source, date, paymentMethod } = body;

  if (!categoryId || !amount || !date) {
    return NextResponse.json({ error: "Category, amount and date are required" }, { status: 400 });
  }

  const income = await prisma.income.create({
    data: {
      schoolId: "default",
      categoryId: Number(categoryId),
      amount: Number(amount),
      description: description || null,
      source: source || "Manual",
      date: new Date(date),
      isFromPayment: false,
      paymentMethod: paymentMethod || null,
    },
  });

  return NextResponse.json(income);
}
