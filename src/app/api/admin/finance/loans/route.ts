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

  const loans = await prisma.loan.findMany({
    where: { schoolId: "default" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(loans);
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
    lenderName,
    principalAmount,
    interestRate,
    amountPaid,
    startDate,
    dueDate,
    description,
  } = body;

  if (!lenderName || !principalAmount || !startDate) {
    return NextResponse.json(
      { error: "Lender name, principal amount, and start date are required" },
      { status: 400 }
    );
  }

  const principal = Number(principalAmount);
  const paid = Number(amountPaid ?? 0);
  const rate = interestRate ? Number(interestRate) : null;
  const outstanding = principal + (rate ? (principal * rate) / 100 : 0) - paid;

  const loan = await prisma.loan.create({
    data: {
      schoolId: "default",
      lenderName: String(lenderName).trim(),
      principalAmount: principal,
      interestRate: rate,
      amountPaid: paid,
      outstandingBalance: outstanding,
      startDate: new Date(startDate),
      dueDate: dueDate ? new Date(dueDate) : null,
      description: description || null,
    },
  });

  return NextResponse.json(loan);
}

export async function PATCH(req: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "expenses");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, amountPaid, status } = body;

  if (!id) return NextResponse.json({ error: "Loan ID is required" }, { status: 400 });

  const existing = await prisma.loan.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

  const newAmountPaid = existing.amountPaid + Number(amountPaid ?? 0);
  const outstanding =
    existing.principalAmount +
    (existing.interestRate ? (existing.principalAmount * existing.interestRate) / 100 : 0) -
    newAmountPaid;

  const loan = await prisma.loan.update({
    where: { id: Number(id) },
    data: {
      amountPaid: newAmountPaid,
      outstandingBalance: outstanding,
      status: status || (outstanding <= 0 ? "PAID_OFF" : "ACTIVE"),
    },
  });

  return NextResponse.json(loan);
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
    await prisma.loan.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to delete loan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
