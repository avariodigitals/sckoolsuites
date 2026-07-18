"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Child = { id: string; name: string };
type BillItem = { id: string; groupName?: string; name: string; amount: number; optional?: boolean };
type Bill = {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  className?: string;
  termName: string;
  sessionName: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate?: string | null;
  paymentInstructions?: string | null;
  items: BillItem[];
};

type BillContest = {
  billId: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  parentComment: string;
  staffComment: string;
  updatedAt: string;
  items?: Array<{ billItemId: string; proposedAmount: number; originalAmount: number }>;
};

const OPTIONAL_ITEM_HINTS = /(optional|elective|club|transport|lunch|meal|boarding|excursion|trip|bus|after school|textbook|taekwondo|ballet|football)/i;

function isOptionalItem(item: BillItem) {
  if (typeof item.optional === "boolean") return item.optional;
  return OPTIONAL_ITEM_HINTS.test(item.name);
}

function paymentStatusLabel(status: string) {
  switch (status) {
    case "PART_PAYMENT":
      return "Part Payment";
    case "UNPAID":
      return "Unpaid";
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "REVERSED":
      return "Reversed";
    default:
      return status
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function contestStatusLabel(status: BillContest["status"]) {
  switch (status) {
    case "SUBMITTED":
      return "Submitted";
    case "UNDER_REVIEW":
      return "Under Review";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

function money(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(value);
}

function billStatusStyle(status: string) {
  switch (status) {
    case "PAID":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "PART_PAYMENT":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "PENDING":
      return "bg-blue-100 text-blue-700 border-blue-300";
    default:
      return "bg-rose-100 text-rose-700 border-rose-300";
  }
}

export function ParentBillHub({
  childOptions,
  bills,
  bank,
}: {
  childOptions: Child[];
  bills: Bill[];
  bank: { bankName?: string | null; bankAccountName?: string | null; bankAccountNumber?: string | null; bankInstructions?: string | null };
}) {
  const [childFilter, setChildFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeBill, setActiveBill] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [activeContestBill, setActiveContestBill] = useState<string | null>(null);
  const [contestComment, setContestComment] = useState("");
  const [contestSelection, setContestSelection] = useState<Record<string, boolean>>({});
  const [contests, setContests] = useState<BillContest[]>([]);
  const [formState, setFormState] = useState({
    amountPaid: "",
    paymentMethod: "Transfer",
    bankName: "",
    transactionReference: "",
    paymentDate: "",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);

  const filtered = useMemo(() => {
    return bills.filter((bill) => {
      const childOk = childFilter === "ALL" || bill.studentId === childFilter;
      const statusOk = statusFilter === "ALL" || bill.status === statusFilter;
      return childOk && statusOk;
    });
  }, [bills, childFilter, statusFilter]);

  async function loadContests() {
    const response = await fetch("/api/parent/bills/contest", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as { contests?: BillContest[] };
    setContests(Array.isArray(payload.contests) ? payload.contests : []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadContests();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function submitPaymentNotice(billId: string) {
    const body = new FormData();
    body.set("billId", billId);
    body.set("amountPaid", formState.amountPaid);
    body.set("paymentMethod", formState.paymentMethod);
    body.set("bankName", formState.bankName);
    body.set("transactionReference", formState.transactionReference);
    body.set("paymentDate", formState.paymentDate);
    if (proofFile) {
      body.set("proofFile", proofFile);
    }

    const response = await fetch("/api/parent/payments/notify", {
      method: "POST",
      body,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast(payload?.error ?? "Could not submit payment notice.");
      return;
    }

    setToast("Payment notice submitted. Awaiting school confirmation.");
    setActiveBill(null);
    setProofFile(null);
    setTimeout(() => {
      window.location.reload();
    }, 700);
  }

  async function submitBillContest(bill: Bill) {
    const optionalItems = bill.items.filter((item) => isOptionalItem(item));
    const adjustments = optionalItems
      .filter((item) => contestSelection[item.id] === false)
      .map((item) => ({
        billItemId: item.id,
        proposedAmount: 0,
      }));

    if (optionalItems.length > 0 && !adjustments.length) {
      setToast("Toggle off at least one optional fee item to request removal.");
      return;
    }

    if (contestComment.trim().length < 5) {
      setToast("Please provide a short reason for the contest.");
      return;
    }

    const response = await fetch("/api/parent/bills/contest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billId: bill.id,
        parentComment: contestComment,
        adjustments,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setToast(payload.error ?? "Could not submit bill contest.");
      return;
    }

    setToast("Bill contest submitted. School finance team will review and finalize.");
    setActiveContestBill(null);
    setContestComment("");
    setContestSelection({});
    await loadContests();
  }

  function statusStyle(status: BillContest["status"]) {
    switch (status) {
      case "APPROVED":
        return "border-emerald-300 bg-emerald-50 text-emerald-700";
      case "UNDER_REVIEW":
        return "border-blue-300 bg-blue-50 text-blue-700";
      case "REJECTED":
        return "border-rose-300 bg-rose-50 text-rose-700";
      default:
        return "border-amber-300 bg-amber-50 text-amber-700";
    }
  }

  return (
    <section className="space-y-3">
      {toast ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{toast}</div> : null}

      <div className="glass-soft grid gap-2 rounded-xl p-3 sm:grid-cols-2">
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={childFilter} onChange={(e) => setChildFilter(e.target.value)}>
          <option value="ALL">All Children</option>
          {childOptions.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
        </select>
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PART_PAYMENT">Part Payment</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending Confirmation</option>
        </select>
      </div>

      {filtered.length ? filtered.map((bill) => {
        const completion = bill.totalAmount > 0 ? Math.min(100, (bill.amountPaid / bill.totalAmount) * 100) : 0;
        const contest = contests.find((item) => item.billId === bill.id);
        const optionalItems = bill.items.filter((item) => isOptionalItem(item));
        const removalMap = new Map((contest?.items ?? []).map((item) => [item.billItemId, item.proposedAmount === 0]));
        const groupedItems = bill.items.reduce<Record<string, BillItem[]>>((accumulator, item) => {
          const key = item.groupName?.trim() || "General";
          accumulator[key] = [...(accumulator[key] ?? []), item];
          return accumulator;
        }, {});
        const groupedEntries = Object.entries(groupedItems);

        return (
          <article key={bill.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] p-4 text-white">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Bill #{bill.invoiceNumber}</p>
                  <p className="truncate text-xs text-white/80">{bill.studentName} • {bill.className ?? "Class"} • {bill.termName} / {bill.sessionName}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${billStatusStyle(bill.status)}`}>
                  {paymentStatusLabel(bill.status)}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Outstanding Fee</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{money(bill.balance)}</p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Total</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{money(bill.totalAmount)}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Paid</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{money(bill.amountPaid)}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Balance</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{money(bill.balance)}</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Due Date: {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString("en-GB") : "Not set"}
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Payment Progress</span>
                  <span>{completion.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${completion}%` }} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
                <section className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Fee Breakdown</h4>
                  </div>
                  {bill.items.length ? (
                    <>
                      {/* Desktop table */}
                      <div className="hidden overflow-x-auto sm:block">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                              <th className="px-3 py-2">Fee Item</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                              <th className="px-3 py-2 text-right">Share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupedEntries.map(([groupName, groupItems]) => (
                              <Fragment key={`group-${bill.id}-${groupName}`}>
                                <tr className="bg-slate-100">
                                  <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700" colSpan={3}>{groupName}</td>
                                </tr>
                                {groupItems.map((item, idx) => {
                                  const share = bill.totalAmount > 0 ? (item.amount / bill.totalAmount) * 100 : 0;
                                  return (
                                    <tr key={item.id} className={idx % 2 ? "bg-white" : "bg-slate-50/70"}>
                                      <td className="px-3 py-2 font-medium text-slate-700">
                                        {item.name}
                                        {isOptionalItem(item) ? <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">Optional</span> : null}
                                        {removalMap.get(item.id) ? <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Removal Requested</span> : null}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{money(item.amount)}</td>
                                      <td className="px-3 py-2 text-right text-slate-600">{share.toFixed(1)}%</td>
                                    </tr>
                                  );
                                })}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile card list */}
                      <div className="divide-y divide-slate-100 sm:hidden">
                        {groupedEntries.map(([groupName, groupItems]) => (
                          <div key={`group-${bill.id}-${groupName}`}>
                            <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">{groupName}</div>
                            {groupItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-700">{item.name}</p>
                                  {isOptionalItem(item) && <span className="ml-1 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">Optional</span>}
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-slate-900">{money(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="px-3 py-3 text-sm text-slate-500">No line items available for this bill.</p>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <h4 className="mb-2 font-semibold uppercase tracking-wide text-slate-700">Bank Payment Instruction</h4>
                  <dl className="space-y-1.5 text-slate-600">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                      <dt className="font-medium text-slate-500">Bank</dt>
                      <dd className="text-right font-semibold text-slate-900">{bank.bankName ?? "Bank"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                      <dt className="font-medium text-slate-500">Account Name</dt>
                      <dd className="text-right font-semibold text-slate-900">{bank.bankAccountName ?? "Account Name"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                      <dt className="font-medium text-slate-500">Account Number</dt>
                      <dd className="text-right font-semibold text-slate-900">{bank.bankAccountNumber ?? "Account Number"}</dd>
                    </div>
                  </dl>
                  <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] text-blue-700">
                    {bill.paymentInstructions ?? bank.bankInstructions ?? "Use bill number as narration."}
                  </div>
                </section>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <Link href={`/bill/${bill.id}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">Open Bill</Link>
                <Link href={`/bill/${bill.id}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">Print Bill</Link>
                <button
                  type="button"
                  className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 font-medium text-blue-700"
                  onClick={() => {
                    setActiveContestBill(activeContestBill === bill.id ? null : bill.id);
                    setContestComment(contest?.parentComment ?? "");
                    const initial: Record<string, boolean> = {};
                    bill.items.forEach((item) => {
                      if (isOptionalItem(item)) {
                        const requestedRemoval = (contest?.items ?? []).some((row) => row.billItemId === item.id && row.proposedAmount === 0);
                        initial[item.id] = !requestedRemoval;
                      }
                    });
                    setContestSelection(initial);
                  }}
                >
                  Contest Bill
                </button>
                <button type="button" className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 font-medium text-white" onClick={() => setActiveBill(activeBill === bill.id ? null : bill.id)}>
                  I have paid
                </button>
              </div>

              {!optionalItems.length ? (
                <p className="mt-2 text-xs text-slate-600">
                  No optional fee item is on this bill. You can still submit a contest statement for school review.
                </p>
              ) : null}

              {contest ? (
                <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${statusStyle(contest.status)}`}>
                  <p className="font-semibold">Contest Status: {contestStatusLabel(contest.status)}</p>
                  <p>Updated: {new Date(contest.updatedAt).toLocaleString("en-GB")}</p>
                  {contest.staffComment ? <p className="mt-1">School note: {contest.staffComment}</p> : null}
                </div>
              ) : null}

              {activeContestBill === bill.id ? (
                <div className="mt-3 space-y-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Contest Bill (Optional Fees Removal)</p>
                  {optionalItems.length ? optionalItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1.5fr_1fr_1fr]">
                      <p className="text-xs font-medium text-slate-700">{item.name}</p>
                      <p className="text-xs text-slate-600">Current: {money(item.amount)}</p>
                      <button
                        type="button"
                        className={`rounded-md border px-2 py-1 text-xs font-medium ${contestSelection[item.id] === false ? "border-rose-300 bg-rose-50 text-rose-700" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}
                        onClick={() => setContestSelection((prev) => ({ ...prev, [item.id]: prev[item.id] === false }))}
                      >
                        {contestSelection[item.id] === false ? "Off (Remove Requested)" : "On (Keep)"}
                      </button>
                    </div>
                  )) : <p className="text-xs text-slate-600">No optional fee item is available on this bill. Submit a statement for admin review.</p>}

                  <textarea
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
                    placeholder="Explain why this optional fee should be adjusted"
                    value={contestComment}
                    onChange={(e) => setContestComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button type="button" className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white" onClick={() => submitBillContest(bill)}>
                      Submit Contest
                    </button>
                    <button type="button" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs" onClick={() => setActiveContestBill(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {activeBill === bill.id ? (
                <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-white/85 p-3 text-sm sm:grid-cols-2 dark:bg-slate-900/70">
                  <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Amount paid" value={formState.amountPaid} onChange={(e) => setFormState((s) => ({ ...s, amountPaid: e.target.value }))} />
                  <select className="rounded-md border border-slate-300 px-3 py-2" value={formState.paymentMethod} onChange={(e) => setFormState((s) => ({ ...s, paymentMethod: e.target.value }))}>
                    <option>Transfer</option>
                    <option>Cash</option>
                    <option>POS</option>
                  </select>
                  <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Bank name" value={formState.bankName} onChange={(e) => setFormState((s) => ({ ...s, bankName: e.target.value }))} />
                  <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Transaction reference" value={formState.transactionReference} onChange={(e) => setFormState((s) => ({ ...s, transactionReference: e.target.value }))} />
                  <input type="date" className="rounded-md border border-slate-300 px-3 py-2" value={formState.paymentDate} onChange={(e) => setFormState((s) => ({ ...s, paymentDate: e.target.value }))} />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                    className="rounded-md border border-slate-300 px-3 py-2"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                  />
                  <button type="button" className="rounded-md bg-emerald-600 px-3 py-2 font-medium text-white sm:col-span-2" onClick={() => submitPaymentNotice(bill.id)}>Submit Pending Confirmation</button>
                </div>
              ) : null}
            </div>
          </article>
        );
      }) : <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">No bills match this filter.</div>}
    </section>
  );
}
