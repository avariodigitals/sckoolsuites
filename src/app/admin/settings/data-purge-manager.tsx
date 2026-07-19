"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Trash2, RefreshCw, Lock } from "lucide-react";

type CategoryMeta = {
  key: string;
  label: string;
  description: string;
  danger: "high" | "medium" | "low";
};

const CATEGORIES: CategoryMeta[] = [
  { key: "admissions", label: "Admission Applications", description: "All admission applications, guardians, documents, and qualifications", danger: "medium" },
  { key: "students", label: "Students", description: "All student records, enrollments, guardians, documents, and linked user accounts", danger: "high" },
  { key: "parents", label: "Parents", description: "All parent records and linked user accounts", danger: "high" },
  { key: "teachers", label: "Teachers & Staff", description: "All teacher records, subject assignments, and linked user accounts", danger: "high" },
  { key: "finance", label: "Finance (Invoices, Payments, Receipts)", description: "All invoices, payments, receipts, payment proofs, and contest audits", danger: "high" },
  { key: "fees", label: "Fee Setup", description: "Fee groups, fee items, fee profiles, concessions, and profile mappings", danger: "medium" },
  { key: "income_expenses", label: "Income & Expenses", description: "All income records, expense records, and their categories", danger: "medium" },
  { key: "academic", label: "Academic Setup", description: "Sessions, terms, classes, arms, class groups, subjects, assessments, and subject assignments", danger: "high" },
  { key: "results", label: "Results & Scores", description: "All student scores and published/draft results", danger: "high" },
  { key: "attendance", label: "Attendance", description: "All student and staff attendance records", danger: "medium" },
  { key: "lms", label: "LMS Content", description: "Lessons, assignments, quizzes, and online classes", danger: "medium" },
  { key: "communication", label: "Communication", description: "Announcements, reactions, school events, surveys, and survey responses", danger: "medium" },
  { key: "transport", label: "Transport", description: "Vehicles, drivers, routes, and route stops", danger: "medium" },
  { key: "reception", label: "Reception", description: "Visitors, enquiries, gate passes, complaints, call logs, correspondence, and queries", danger: "low" },
  { key: "loans_assets", label: "Loans & Assets", description: "All loan records and asset records", danger: "medium" },
  { key: "audit_logs", label: "Audit Logs", description: "All audit log entries (action history)", danger: "low" },
  { key: "notifications", label: "Notifications", description: "All in-app notification records", danger: "low" },
];

const DANGER_STYLES: Record<string, string> = {
  high: "border-red-300 bg-red-50",
  medium: "border-amber-300 bg-amber-50",
  low: "border-slate-200 bg-slate-50",
};

const DANGER_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-200 text-slate-600",
};

export function DataPurgeManager() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/purge");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load counts");
      }
      const data = await res.json();
      setCounts(data.counts || {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const handlePurge = async (category: string) => {
    setPurging(category);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Purge failed");
      }
      setSuccess(`${CATEGORIES.find((c) => c.key === category)?.label ?? category}: ${data.deleted} record(s) deleted.`);
      setConfirming(null);
      setConfirmText("");
      await fetchCounts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPurging(null);
    }
  };

  const startConfirm = (key: string) => {
    setConfirming(key);
    setConfirmText("");
    setError(null);
    setSuccess(null);
  };

  const cancelConfirm = () => {
    setConfirming(null);
    setConfirmText("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-slate-700">Restricted to SUPER_ADMIN</p>
            <p className="text-xs text-slate-500">All purge actions are logged in the audit trail</p>
          </div>
        </div>
        <button
          onClick={fetchCounts}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const count = counts[cat.key] ?? 0;
          const isConfirming = confirming === cat.key;
          const isPurging = purging === cat.key;
          const canConfirm = confirmText === "DELETE";

          return (
            <div
              key={cat.key}
              className={`rounded-lg border p-4 ${DANGER_STYLES[cat.danger]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{cat.label}</h3>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${DANGER_BADGE[cat.danger]}`}>
                      {cat.danger}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{cat.description}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {loading ? (
                    "Loading…"
                  ) : (
                    <>
                      <span className="font-semibold text-slate-700">{count.toLocaleString()}</span> record{count !== 1 ? "s" : ""}
                    </>
                  )}
                </span>

                {!isConfirming ? (
                  <button
                    onClick={() => startConfirm(cat.key)}
                    disabled={loading || count === 0 || isPurging !== null}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Purge
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder='Type "DELETE"'
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
                      autoFocus
                    />
                    <button
                      onClick={() => handlePurge(cat.key)}
                      disabled={!canConfirm || isPurging !== null}
                      className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {purging === cat.key ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      Confirm
                    </button>
                    <button
                      onClick={cancelConfirm}
                      disabled={isPurging !== null}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs text-slate-600">
          <strong>Note:</strong> Purging data is permanent and cannot be undone. Each category
          only deletes records for the current school (<code className="rounded bg-slate-200 px-1">default</code>).
          System-level data (users, roles, privileges, school profile, branding, settings) is not purgeable from here.
          All purge actions are recorded in the audit log.
        </p>
      </div>
    </div>
  );
}
