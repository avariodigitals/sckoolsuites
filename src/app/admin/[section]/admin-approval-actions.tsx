"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { getCloudinaryInlineUrl } from "@/lib/utils";

type PaymentProofRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote?: string | null;
  paymentDate: string;
  proofUrl?: string | null;
  invoice: {
    invoiceNumber: string;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    status: string;
  };
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
  };
  student: {
    name: string;
  };
  parent: {
    name: string;
    email: string;
  } | null;
};

type ResultRow = {
  id: string;
  status: "DRAFT" | "APPROVED" | "PUBLISHED" | "REJECTED";
  reviewNote?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  student: {
    id: string;
    name: string;
    className: string;
  };
  term: {
    id: string;
    name: string;
  };
  session: {
    id: string;
    name: string;
  };
  summary: {
    percentage: number | null;
    grade: string | null;
    gpa: number | null;
  };
};

function money(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(amount);
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("en-GB");
}

export function AdminApprovalActions({
  mode,
  sessionId,
  termId,
}: {
  mode: "payments" | "results";
  sessionId?: string;
  termId?: string;
}) {
  const confirm = useConfirm();
  const [paymentRows, setPaymentRows] = useState<PaymentProofRow[]>([]);
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [resultFilter, setResultFilter] = useState<"pending" | "publish" | "all">("pending");

  const title = useMemo(() => {
    if (mode === "payments") return "Payment Proof Review";
    return "Result Approval & Publishing";
  }, [mode]);

  const loadPaymentProofs = useCallback(async () => {
    setLoading(true);
    setError("");
    setToast("");

    const response = await fetch("/api/admin/payments/proofs?status=PENDING&take=100", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = payload?.error;
      setError(typeof err === "object" ? JSON.stringify(err) : (err ?? "Could not load payment proofs."));
      setLoading(false);
      return;
    }

    setPaymentRows(Array.isArray(payload) ? payload : []);
    setLoading(false);
  }, []);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError("");
    setToast("");

    const query = new URLSearchParams();
    query.set("take", "100");
    if (sessionId) query.set("sessionId", sessionId);
    if (termId) query.set("termId", termId);

    const response = await fetch(`/api/admin/results/review?${query.toString()}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = payload?.error;
      setError(typeof err === "object" ? JSON.stringify(err) : (err ?? "Could not load result queue."));
      setLoading(false);
      return;
    }

    setResultRows(Array.isArray(payload) ? payload : []);
    setLoading(false);
  }, [sessionId, termId]);

  const loadData = useCallback(async () => {
    if (mode === "payments") {
      await loadPaymentProofs();
      return;
    }

    await loadResults();
  }, [mode, loadPaymentProofs, loadResults]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  async function reviewPayment(paymentId: string, action: "APPROVE" | "REJECT") {
    const note = (notes[paymentId] ?? "").trim();

    if (action === "REJECT" && !note) {
      setError("Rejection requires a review note.");
      return;
    }

    if (action === "APPROVE" && !(await confirm({
      title: "Approve Payment",
      message: "Approve this payment proof and generate/update receipt?",
      confirmLabel: "Approve",
      variant: "success",
    }))) {
      return;
    }

    if (action === "REJECT" && !(await confirm({
      title: "Reject Payment",
      message: "Reject this payment proof?",
      confirmLabel: "Reject",
      variant: "danger",
    }))) {
      return;
    }

    setSubmittingKey(`payment-${paymentId}-${action}`);
    setError("");
    setToast("");

    const response = await fetch(`/api/admin/payments/proofs/${paymentId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNote: note || undefined }),
    });

    const payload = await response.json().catch(() => ({}));
    setSubmittingKey(null);

    if (!response.ok) {
      setError(payload?.error ?? "Payment proof review failed.");
      return;
    }

    setToast(action === "APPROVE" ? "Payment approved and receipt updated." : "Payment rejected and parent notified.");
    await loadPaymentProofs();
  }

  async function reviewResult(studentId: string, action: "APPROVE" | "PUBLISH" | "REJECT") {
    const note = (notes[studentId] ?? "").trim();

    if (action === "REJECT" && !note) {
      setError("Rejection/return requires a review note.");
      return;
    }

    if (action === "APPROVE" && !(await confirm({
      title: "Approve Result",
      message: "Approve this result for possible publishing?",
      confirmLabel: "Approve",
      variant: "success",
    }))) {
      return;
    }

    if (action === "PUBLISH" && !(await confirm({
      title: "Publish Result",
      message: "Publish this approved result to parent/student/report views?",
      confirmLabel: "Publish",
      variant: "info",
    }))) {
      return;
    }

    if (action === "REJECT" && !(await confirm({
      title: "Return Result",
      message: "Return this result for correction?",
      confirmLabel: "Return",
      variant: "danger",
    }))) {
      return;
    }

    setSubmittingKey(`result-${studentId}-${action}`);
    setError("");
    setToast("");

    const response = await fetch("/api/admin/results/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        action,
        reviewNote: note || undefined,
        sessionId,
        termId,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSubmittingKey(null);

    if (!response.ok) {
      setError(payload?.error ?? "Result action failed.");
      return;
    }

    if (action === "APPROVE") {
      setToast("Result approved.");
    } else if (action === "PUBLISH") {
      setToast("Result published.");
    } else {
      setToast("Result returned for correction.");
    }

    await loadResults();
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading {title.toLowerCase()}...</div>;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <button type="button" onClick={() => void loadData()} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
          Refresh
        </button>
      </div>

      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      {toast ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{toast}</p> : null}

      {mode === "payments" ? (
        paymentRows.length ? (
          <div className="space-y-3">
            {paymentRows.map((row) => {
              const approveKey = `payment-${row.payment.id}-APPROVE`;
              const rejectKey = `payment-${row.payment.id}-REJECT`;
              const busy = submittingKey === approveKey || submittingKey === rejectKey;

              return (
                <article key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                    <p><strong>Student:</strong> {row.student.name}</p>
                    <p><strong>Parent:</strong> {row.parent?.name ?? "-"}</p>
                    <p><strong>Invoice:</strong> {row.invoice.invoiceNumber}</p>
                    <p><strong>Amount:</strong> {money(row.payment.amount)}</p>
                    <p><strong>Submitted:</strong> {dateTime(row.paymentDate)}</p>
                    <p><strong>Status:</strong> {row.status}</p>
                    <p className="sm:col-span-2"><strong>Proof:</strong> {row.proofUrl ? <a className="text-blue-700 underline" href={row.proofUrl} target="_blank" rel="noreferrer">Open proof file</a> : "No proof file"}</p>
                  </div>

                  <textarea
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                    placeholder="Review note (required for rejection, optional for approval)"
                    value={notes[row.payment.id] ?? ""}
                    onChange={(event) => setNotes((prev) => ({ ...prev, [row.payment.id]: event.target.value }))}
                    disabled={busy}
                  />

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                      onClick={() => void reviewPayment(row.payment.id, "APPROVE")}
                      disabled={busy}
                    >
                      {submittingKey === approveKey ? "Approving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                      onClick={() => void reviewPayment(row.payment.id, "REJECT")}
                      disabled={busy}
                    >
                      {submittingKey === rejectKey ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">No pending payment proofs for this school context.</p>
        )
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setResultFilter("pending")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${resultFilter === "pending" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              Pending Approval ({resultRows.filter((r) => r.status === "DRAFT" || r.status === "REJECTED").length})
            </button>
            <button
              type="button"
              onClick={() => setResultFilter("publish")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${resultFilter === "publish" ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              Ready to Publish ({resultRows.filter((r) => r.status === "APPROVED").length})
            </button>
            <button
              type="button"
              onClick={() => setResultFilter("all")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${resultFilter === "all" ? "bg-slate-700 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              All ({resultRows.length})
            </button>
          </div>
          {(() => {
          const filteredResults = resultRows.filter((row) => {
            if (resultFilter === "pending") return row.status === "DRAFT" || row.status === "REJECTED";
            if (resultFilter === "publish") return row.status === "APPROVED";
            return true;
          });
          return filteredResults.length ? (
            <div className="space-y-3">
              {filteredResults.map((row) => {
            const approveKey = `result-${row.student.id}-APPROVE`;
            const publishKey = `result-${row.student.id}-PUBLISH`;
            const rejectKey = `result-${row.student.id}-REJECT`;
            const busy = submittingKey === approveKey || submittingKey === publishKey || submittingKey === rejectKey;

            const canApprove = row.status === "DRAFT" || row.status === "REJECTED";
            const canPublish = row.status === "APPROVED";
            const canReject = row.status !== "PUBLISHED";

            return (
              <article key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  <p><strong>Student:</strong> {row.student.name}</p>
                  <p><strong>Class:</strong> {row.student.className}</p>
                  <p><strong>Term/Session:</strong> {row.term.name} / {row.session.name}</p>
                  <p><strong>Status:</strong> {row.status}</p>
                  <p><strong>Summary:</strong> {row.summary.percentage !== null ? `${row.summary.percentage.toFixed(1)}% • ${row.summary.grade ?? "-"} • GPA ${row.summary.gpa?.toFixed(2) ?? "-"}` : "Uploaded PDF (no computed summary)"}</p>
                  <p><strong>Note:</strong> {row.reviewNote ?? "-"}</p>
                  {row.fileUrl ? (
                    <p className="sm:col-span-2">
                      <strong>Uploaded PDF:</strong>{" "}
                      <a className="text-blue-700 underline" href={getCloudinaryInlineUrl(row.fileUrl)} target="_blank" rel="noreferrer">
                        {row.fileName || "Open result PDF"}
                      </a>
                    </p>
                  ) : null}
                </div>

                <textarea
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  placeholder="Review note (required for return/reject, optional for approve/publish)"
                  value={notes[row.student.id] ?? ""}
                  onChange={(event) => setNotes((prev) => ({ ...prev, [row.student.id]: event.target.value }))}
                  disabled={busy}
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    onClick={() => void reviewResult(row.student.id, "APPROVE")}
                    disabled={busy || !canApprove}
                  >
                    {submittingKey === approveKey ? "Approving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    onClick={() => void reviewResult(row.student.id, "PUBLISH")}
                    disabled={busy || !canPublish}
                  >
                    {submittingKey === publishKey ? "Publishing..." : "Publish"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    onClick={() => void reviewResult(row.student.id, "REJECT")}
                    disabled={busy || !canReject}
                  >
                    {submittingKey === rejectKey ? "Returning..." : "Reject/Return"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">
          {resultFilter === "pending" ? "No results pending approval." : resultFilter === "publish" ? "No approved results ready for publishing." : "No results in this academic context."}
        </p>
      );
          })()}
        </>
      )}
    </section>
  );
}
