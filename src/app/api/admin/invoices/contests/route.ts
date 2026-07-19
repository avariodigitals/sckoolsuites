import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { listInvoiceContestsBySchool, type InvoiceContestRecord } from "@/lib/invoice-contest";

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "bills");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session?.user;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contests = await listInvoiceContestsBySchool("default", 100);
  const invoiceIds = contests.map((item: InvoiceContestRecord) => item.invoiceId);
  const audits = invoiceIds.length
    ? await (await import("@/lib/db")).prisma.invoiceContestAudit.findMany({
        where: { schoolId: "default", invoiceId: { in: invoiceIds } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return NextResponse.json({ contests, audits });
}
