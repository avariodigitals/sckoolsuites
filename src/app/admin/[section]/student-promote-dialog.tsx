"use client";

import { useEffect, useState } from "react";
import { X, ArrowRight, RotateCcw, UserMinus, Loader2 } from "lucide-react";
import { useActiveSession } from "@/components/active-session-provider";

type Enrollment = {
  session?: { id: string | number; name?: string } | null;
  term?: { id: string | number; name?: string } | null;
  class?: { id: string | number; name?: string } | null;
  promotionStatus?: string | null;
};

type ClassOption = { id: string; name: string };

export function StudentPromoteDialog({
  studentId,
  latestEnrollment,
  onClose,
  onSuccess,
}: {
  studentId: string;
  latestEnrollment?: Enrollment | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { sessions, terms, activeSession, activeTerm } = useActiveSession();

  const [action, setAction] = useState<"PROMOTE" | "REPEAT" | "WITHDRAW">("PROMOTE");
  const [sourceSessionId, setSourceSessionId] = useState<string>("");
  const [sourceTermId, setSourceTermId] = useState<string>("");
  const [targetSessionId, setTargetSessionId] = useState<string>("");
  const [targetTermId, setTargetTermId] = useState<string>("");
  const [nextClassId, setNextClassId] = useState<string>("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const sourceSession = latestEnrollment?.session?.id ? String(latestEnrollment.session.id) : (activeSession?.id ?? "");
    const sourceTerm = latestEnrollment?.term?.id ? String(latestEnrollment.term.id) : (activeTerm?.id ?? "");
    setSourceSessionId(sourceSession);
    setSourceTermId(sourceTerm);
    setTargetSessionId(activeSession?.id ?? sourceSession);
    setTargetTermId(activeTerm?.id ?? sourceTerm);
  }, [latestEnrollment, activeSession, activeTerm]);

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch("/api/admin/classes", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const list: ClassOption[] = (data.classes ?? []).map((c: any) => ({ id: String(c.id), name: c.name }));
        setClasses(list);
      } catch {
        // ignore
      } finally {
        setLoadingClasses(false);
      }
    }
    void loadClasses();
  }, []);

  const targetSessionTerms = terms.filter((t) => t.sessionId === targetSessionId);

  function handleTargetSessionChange(nextSessionId: string) {
    setTargetSessionId(nextSessionId);
    const nextTerms = terms.filter((t) => t.sessionId === nextSessionId);
    const nextTerm = nextTerms.find((t) => t.isCurrent) ?? nextTerms[0] ?? null;
    setTargetTermId(nextTerm?.id ?? "");
  }

  async function submit() {
    if (!sourceSessionId || !sourceTermId || !targetSessionId || !targetTermId) {
      setMsg("Select source and target session/term.");
      return;
    }
    if (action === "PROMOTE" && !nextClassId) {
      setMsg("Select the next class for promotion.");
      return;
    }

    setSubmitting(true);
    setMsg("");

    try {
      const res = await fetch("/api/admin/students/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promotions: [
            {
              studentId,
              action,
              nextClassId: action === "PROMOTE" ? nextClassId : null,
            },
          ],
          sourceSessionId,
          sourceTermId,
          targetSessionId,
          targetTermId,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(payload?.error?.message ?? payload?.error ?? "Promotion failed.");
        setSubmitting(false);
        return;
      }

      const results = payload?.results ?? [];
      const studentResult = results[0];
      if (studentResult && !studentResult.success) {
        setMsg(studentResult.error ?? "Promotion failed for this student.");
        setSubmitting(false);
        return;
      }

      setMsg("Student promoted successfully.");
      setSubmitting(false);
      onSuccess();
      setTimeout(() => onClose(), 800);
    } catch {
      setMsg("An error occurred while promoting.");
      setSubmitting(false);
    }
  }

  const isBusy = submitting || loadingClasses;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 pt-16"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900">Promote / Repeat / Withdraw Student</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-4">
          {msg && (
            <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${msg.includes("successfully") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              {msg}
            </div>
          )}

          <div className="mb-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAction("PROMOTE")}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-sm font-medium transition ${action === "PROMOTE" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <ArrowRight className="h-4 w-4" />
              Promote
            </button>
            <button
              type="button"
              onClick={() => setAction("REPEAT")}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-sm font-medium transition ${action === "REPEAT" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <RotateCcw className="h-4 w-4" />
              Repeat
            </button>
            <button
              type="button"
              onClick={() => setAction("WITHDRAW")}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-sm font-medium transition ${action === "WITHDRAW" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <UserMinus className="h-4 w-4" />
              Withdraw
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Source Session</label>
                <select
                  value={sourceSessionId}
                  onChange={(e) => setSourceSessionId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select session</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Source Term</label>
                <select
                  value={sourceTermId}
                  onChange={(e) => setSourceTermId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select term</option>
                  {terms.filter((t) => t.sessionId === sourceSessionId).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Target Session</label>
                <select
                  value={targetSessionId}
                  onChange={(e) => handleTargetSessionChange(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select session</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Target Term</label>
                <select
                  value={targetTermId}
                  onChange={(e) => setTargetTermId(e.target.value)}
                  disabled={!targetSessionId || targetSessionTerms.length === 0}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">
                    {!targetSessionId ? "Select session first" : targetSessionTerms.length === 0 ? "No terms" : "Select term"}
                  </option>
                  {targetSessionTerms.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {action === "PROMOTE" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Next Class</label>
                <select
                  value={nextClassId}
                  onChange={(e) => setNextClassId(e.target.value)}
                  disabled={loadingClasses}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">
                    {loadingClasses ? "Loading classes…" : "Select next class"}
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {latestEnrollment?.class && (
                  <p className="mt-1 text-xs text-slate-500">Current class: {latestEnrollment.class.name}</p>
                )}
              </div>
            )}

            {action === "REPEAT" && latestEnrollment?.class && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Student will remain in <span className="font-medium text-slate-900">{latestEnrollment.class.name}</span> for the target session/term.
              </p>
            )}

            {action === "WITHDRAW" && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                This will mark the student as withdrawn for the source session/term. No new enrollment will be created.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Saving…" : action === "PROMOTE" ? "Promote Student" : action === "REPEAT" ? "Repeat Student" : "Withdraw Student"}
          </button>
        </div>
      </div>
    </div>
  );
}
