import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { listBillContestsBySchool, type BillContestRecord } from "@/lib/bill-contest";

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "bills");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session?.user;
  if (!user?.id || !user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contests = await listBillContestsBySchool("default", 100);
  const billIds = contests.map((item: BillContestRecord) => item.invoiceId);
  const audits = billIds.length
    ? await (await import("@/lib/db")).prisma.invoiceContestAudit.findMany({
        where: { schoolId: "default", invoiceId: { in: billIds } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return NextResponse.json({ contests, audits });
}
