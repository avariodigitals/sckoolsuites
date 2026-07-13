import { notFound } from "next/navigation";
import Image from "next/image";
import { Fragment } from "react";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { formatDate, naira } from "@/lib/utils";
import { statusLabel } from "@/lib/data";
import { PrintButton } from "@/components/print-button";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) notFound();

  const invoice: any = await prisma.invoice.findUnique({
    where: { id },
    include: {
      school: { include: { branding: true } },
      student: { include: { user: true, class: true } },
      parent: { include: { user: true } },
      term: true,
      session: true,
      items: { include: { feeItem: { include: { feeGroup: true } } } },
    },
  });

  if (!invoice) notFound();

  const groupedInvoiceItems = ((invoice.items || []) as any[]).reduce<Record<string, Array<{ name: string; category: string; amount: number; optional: boolean }>>>(
    (accumulator, item) => {
      const key = item.feeItem.feeGroup?.name ?? item.feeItem.category;
      const bucket = accumulator[key] ?? [];
      bucket.push({
        name: item.feeItem.name,
        category: item.feeItem.category,
        amount: item.amount,
        optional: item.feeItem.isOptional,
      });
      accumulator[key] = bucket;
      return accumulator;
    },
    {}
  );

  const groupedEntries = Object.entries(groupedInvoiceItems);

  const ruleText = invoice.paymentInstructions ?? invoice.school.branding?.bankInstructions ?? "";
  const paymentRules = ruleText
    .split(/\s(?=\d+\.)/)
    .map((item: string) => item.trim())
    .filter(Boolean);

  const logoUrl = invoice.school.branding?.logoUrl
    ? invoice.school.branding.logoUrl.startsWith("http://") || invoice.school.branding.logoUrl.startsWith("https://") || invoice.school.branding.logoUrl.startsWith("/")
      ? invoice.school.branding.logoUrl
      : `/${invoice.school.branding.logoUrl}`
    : null;

  const studentAvatar = invoice.student.passportUrl
    ? invoice.student.passportUrl.startsWith("http://") || invoice.student.passportUrl.startsWith("https://") || invoice.student.passportUrl.startsWith("/")
      ? invoice.student.passportUrl
      : `/${invoice.student.passportUrl}`
    : null;

  const studentInitials = invoice.student.user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="no-print mx-auto mb-3 flex max-w-[210mm] justify-end">
        <PrintButton />
      </div>
      <div className="print-sheet mx-auto max-w-[210mm] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-6 py-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <Image src={logoUrl} alt={`${invoice.school.name} logo`} width={64} height={64} unoptimized className="h-16 w-16 rounded-xl border border-white/30 bg-white object-contain p-1.5" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-sm font-semibold">
                  {invoice.school.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part: string) => part[0]?.toUpperCase() ?? "")
                    .join("") || "SCH"}
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">School Bill</p>
                <h1 className="text-2xl font-semibold leading-tight">{invoice.school.name}</h1>
                <p className="text-sm text-white/80">{invoice.school.address}</p>
                <p className="text-sm text-white/80">{invoice.school.email} | {invoice.school.phone}</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-right text-sm">
              <p className="text-xs uppercase tracking-wide text-white/75">Bill Number</p>
              <p className="text-base font-semibold">{invoice.invoiceNumber}</p>
              <p>Session: {invoice.session.name}</p>
              <p>Term: {invoice.term.name}</p>
              <p>Status: {statusLabel(invoice.status)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 px-6 py-5 text-sm md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {studentAvatar ? (
              <Image src={studentAvatar} alt={`${invoice.student.user.name} avatar`} width={56} height={56} unoptimized className="h-14 w-14 rounded-full border border-slate-200 object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">{studentInitials || "ST"}</div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
              <p className="font-semibold text-slate-900">{invoice.student.user.name}</p>
              <p className="text-slate-600">{invoice.student.class?.name ?? "-"}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Parent / Due Date</p>
            <p className="font-semibold text-slate-900">{invoice.parent?.user.name ?? "-"}</p>
            <p className="text-slate-600">Due: {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}</p>
          </div>
        </div>

        <div className="px-6 py-5">
        <table className="mb-4 w-full border-collapse overflow-hidden rounded-xl border border-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-900 text-left text-white">
              <th className="border p-2">Fee Item</th>
              <th className="border p-2">Category</th>
              <th className="border p-2 text-right">NGN</th>
            </tr>
          </thead>
          <tbody>
            {groupedEntries.map(([groupName, rows]) => (
              <Fragment key={`group-${groupName}`}>
                <tr className="bg-slate-100 font-semibold">
                  <td className="border p-2" colSpan={3}>{groupName}</td>
                </tr>
                {rows.map((row: any) => (
                  <tr key={`${groupName}-${row.name}`}>
                    <td className="border p-2">{row.name}</td>
                    <td className="border p-2">{row.optional ? "Optional" : row.category}</td>
                    <td className="border p-2 text-right">{naira(row.amount)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}

            <tr className="font-semibold">
              <td className="border p-2" colSpan={2}>BILL TOTAL</td>
              <td className="border p-2 text-right">{naira(invoice.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Outstanding Fee</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{naira(invoice.balance)}</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Total</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{naira(invoice.totalAmount)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Paid</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{naira(invoice.amountPaid)}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Balance</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{naira(invoice.balance)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3 text-sm">
            <p className="font-semibold">Bank Details</p>
            <p>{invoice.school.branding?.bankName ?? "Bank"}</p>
            <p>{invoice.school.branding?.bankAccountName ?? "Account Name"}</p>
            <p>{invoice.school.branding?.bankAccountNumber ?? "Account Number"}</p>
            {paymentRules.length ? (
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-600">
                {paymentRules.map((rule: string) => <li key={rule}>{rule.replace(/^\d+\.\s*/, "")}</li>)}
              </ol>
            ) : (
              <p className="mt-2 text-xs text-slate-600">{ruleText}</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 p-3 text-sm">
            <p className="font-semibold">Billing Notes</p>
            <p className="text-slate-600">Use your bill number as transfer narration for faster confirmation.</p>
            <p className="mt-3 text-xs text-slate-500">Generated on {formatDate(new Date())}</p>
          </div>
        </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-center text-xs text-slate-500">
          This bill is system generated and valid without signature.
        </div>
      </div>
    </div>
  );
}
