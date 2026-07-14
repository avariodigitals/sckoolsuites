"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";

type ChildOption = {
  id: number;
  name: string;
  className: string;
};

export function ParentAttendanceNotify({ children }: { children: ChildOption[] }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    studentId: children[0]?.id ?? 0,
    date: new Date().toISOString().split("T")[0],
    reason: "Illness",
    notes: "",
  });

  async function submit() {
    if (!form.studentId) {
      setToast("Please select a child.");
      return;
    }
    setBusy(true);
    setToast("");
    try {
      const response = await fetch("/api/parent/attendance-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setToast("Notification sent to the school successfully.");
        setForm((s) => ({ ...s, notes: "" }));
        setTimeout(() => setOpen(false), 1500);
      } else {
        setToast(payload?.error ?? "Could not send notification.");
      }
    } catch {
      setToast("An error occurred while sending notification.");
    } finally {
      setBusy(false);
    }
  }

  if (!children.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm ring-1 ring-white/30 transition-colors hover:bg-white/25"
      >
        <Send className="h-4 w-4" />
        Notify School of Absence
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Notify School of Absence</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Child</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.studentId}
                  onChange={(e) => setForm((s) => ({ ...s, studentId: Number(e.target.value) }))}
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>{child.name} - {child.className}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Date of Absence</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.date}
                  onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Reason</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.reason}
                  onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
                >
                  <option>Illness</option>
                  <option>Family Emergency</option>
                  <option>Medical Appointment</option>
                  <option>Travel</option>
                  <option>Religious Observance</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Additional Notes (optional)</label>
                <textarea
                  className="h-20 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Any additional information for the school..."
                  value={form.notes}
                  onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                />
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="w-full rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Sending..." : "Send Notification"}
              </button>

              {toast && (
                <p className={`text-xs ${toast.includes("success") ? "text-emerald-600" : "text-rose-600"}`}>{toast}</p>
              )}

              <p className="text-xs text-slate-500">
                This will notify the class teacher, admin, head of school and principal about your child's absence.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
