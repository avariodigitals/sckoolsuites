import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, format } from "date-fns";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "month";

  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let dateFormat = "MMM dd";

  switch (filter) {
    case "week":
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      dateFormat = "EEE";
      break;
    case "year":
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      dateFormat = "MMM";
      break;
    case "custom":
      startDate = new Date(searchParams.get("start") || subDays(now, 30));
      endDate = new Date(searchParams.get("end") || now);
      break;
    case "month":
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      dateFormat = "MMM dd";
      break;
  }

  try {
    const payments = await prisma.payment.findMany({
      where: {
        schoolId: "default",
        createdAt: { gte: startDate, lte: endDate },
        status: "PAID",
      },
      include: { invoice: true },
    });

    const expenses = await prisma.schoolSetting.findMany({
      where: {
        schoolId: "default",
        key: { startsWith: "expense_" },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const incomeByDate = new Map<string, number>();
    const expensesByDate = new Map<string, number>();

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = format(date, dateFormat);
      incomeByDate.set(dateKey, 0);
      expensesByDate.set(dateKey, 0);
    }

    payments.forEach((payment: any) => {
      const dateKey = format(payment.createdAt, dateFormat);
      incomeByDate.set(dateKey, (incomeByDate.get(dateKey) || 0) + payment.amount);
    });

    expenses.forEach((expense: any) => {
      try {
        const data = JSON.parse(expense.value) as { amount: number; date: string };
        const dateKey = format(new Date(data.date), dateFormat);
        expensesByDate.set(dateKey, (expensesByDate.get(dateKey) || 0) + data.amount);
      } catch {
        // skip
      }
    });

    const incomeData = Array.from(incomeByDate.entries())
      .map(([date, income]) => ({
        date,
        income,
        expenses: expensesByDate.get(date) || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Fee components from actual fee items, not estimates
    const feeItems = await prisma.feeItem.findMany({
      where: { schoolId: "default" },
      include: { feeGroup: true },
    });

    const feeComponents = feeItems.length > 0
      ? feeItems.map((item: any) => ({
          name: item.name,
          value: item.amount,
        })).sort((a: any, b: any) => b.value - a.value)
      : [];

    return NextResponse.json({
      incomeData,
      feeComponents,
      summary: {
        totalIncome: incomeData.reduce((sum, d) => sum + d.income, 0),
        totalExpenses: incomeData.reduce((sum, d) => sum + d.expenses, 0),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          filter,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
