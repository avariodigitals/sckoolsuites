import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { APP_POWERED_BY } from "@/lib/constants";
import { formatDate, naira } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) notFound();

  const receipt: any = await prisma.receipt.findFirst({
    where: { OR: [{ id }, { invoiceId: id }] },
    include: {
      school: { include: { branding: true } },
      invoice: {
        include: {
          items: { include: { feeItem: { include: { feeGroup: true } } } },
        },
      },
      student: { include: { user: true } },
      parent: { include: { user: true } },
    },
  });

  if (!receipt) notFound();

  const brandPrimary = receipt.school.branding?.primaryColor ?? "#0B1F4D";
  const brandSecondary = receipt.school.branding?.secondaryColor ?? "#0E9F6E";
  const groupedBreakdown = ((receipt.invoice?.items || []) as any[]).reduce<Record<string, Array<{ name: string; amount: number; optional: boolean }>>>(
    (accumulator, item) => {
      const key = item.feeItem.feeGroup?.name ?? item.feeItem.category;
      const bucket = accumulator[key] ?? [];
      bucket.push({ name: item.feeItem.name, amount: item.amount, optional: item.feeItem.isOptional });
      accumulator[key] = bucket;
      return accumulator;
    },
    {}
  );

  return (
    <div className="p-4" style={{ "--brand-primary": brandPrimary, "--brand-secondary": brandSecondary } as Record<string, string>}>
      <div className="no-print mx-auto mb-3 flex max-w-[210mm] justify-end">
        <PrintButton />
      </div>
      <div className="print-sheet overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm">
        <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/85">Official Payment Receipt</p>
              <h1 className="mt-1 text-2xl font-semibold">{receipt.school.name}</h1>
              <p className="text-sm text-white/80">{receipt.school.address}</p>
            </div>
            <div className="rounded-xl bg-white/15 p-3 text-right text-sm">
              <p className="font-semibold">{receipt.receiptNumber}</p>
              <p>Date: {formatDate(receipt.paymentDate)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
              <p className="font-semibold text-slate-900">{receipt.student.user.name}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Parent</p>
              <p className="font-semibold text-slate-900">{receipt.parent?.user.name ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Bill Reference</p>
              <p className="font-semibold text-slate-900">{receipt.invoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-semibold">Transaction Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Amount Paid</span><strong>{naira(receipt.amount)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Payment Method</span><span>{receipt.paymentMethod}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Balance Remaining</span><strong>{naira(receipt.balance)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Received By</span><span>{receipt.receivedBy}</span></div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-semibold">Audit Trail</p>
              <div className="space-y-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">Recorded on {formatDate(receipt.createdAt)}</div>
                <div className="rounded-lg bg-slate-50 p-2">Payment date {formatDate(receipt.paymentDate)}</div>
                <div className="rounded-lg bg-slate-50 p-2">School ID #{receipt.schoolId.slice(0, 8).toUpperCase()}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-sm font-semibold">Linked Invoice Breakdown</p>
            <div className="space-y-3">
              {Object.entries(groupedBreakdown).map(([groupName, rows]) => (
                <div key={`receipt-group-${groupName}`} className="rounded-lg border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">{groupName}</div>
                  <div className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <div key={`receipt-row-${groupName}-${row.name}`} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>{row.name}{row.optional ? " (Optional)" : ""}</span>
                        <strong>{naira(row.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="rounded-xl border p-3">Signature: {receipt.school.branding?.teacherSignature ?? "Not on file"}</div>
            <div className="rounded-xl border p-3">Stamp: {receipt.school.branding?.schoolStamp ?? "Not on file"}</div>
          </div>

          <p className="text-right text-xs text-slate-500">{APP_POWERED_BY}</p>
        </div>
      </div>
    </div>
  );
}
