import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listBillContestsBySchool } from "@/lib/bill-contest";

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "ACCOUNTANT"];
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contests = await listBillContestsBySchool("default", 100);
  const billIds = contests.map((item) => item.invoiceId);
  const audits = billIds.length
    ? await (await import("@/lib/db")).prisma.invoiceContestAudit.findMany({
        where: { schoolId: "default", invoiceId: { in: billIds } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return NextResponse.json({ contests, audits });
}
