"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Send } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Assignment = {
  id: number;
  title: string;
  instruction: string;
  dueDate: string;
  submittedAt: string | null;
  submissionNote: string | null;
  subject?: { name: string } | null;
};

export function StudentAssignmentList({ assignments }: { assignments: Assignment[] }) {
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNote, setShowNote] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [localAssignments, setLocalAssignments] = useState(assignments);

  const handleSubmit = async (assignmentId: number) => {
    setError(null);
    setSuccess(null);
    setSubmitting(assignmentId);
    try {
      const res = await fetch("/api/student/assignments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          submissionNote: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit assignment");
      setSuccess(`"${localAssignments.find((a) => a.id === assignmentId)?.title}" submitted successfully.`);
      setLocalAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? { ...a, submittedAt: data.assignment.submittedAt, submissionNote: data.assignment.submissionNote }
            : a
        )
      );
      setShowNote(null);
      setNote("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  if (!localAssignments.length) {
    return <p className="text-sm text-slate-500">No assignments available.</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}
      {localAssignments.map((assignment) => {
        const isSubmitted = !!assignment.submittedAt;
        const isOverdue = !isSubmitted && new Date(assignment.dueDate) < new Date();

        return (
          <div key={assignment.id} className="glass-soft rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">{assignment.title}</p>
                <p className="text-xs text-slate-500">
                  {assignment.subject?.name ?? "Subject"} • Due: {formatDate(assignment.dueDate)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isSubmitted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Submitted
                  </span>
                ) : isOverdue ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    <Clock className="h-3 w-3" />
                    Overdue
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600">{assignment.instruction}</p>

            {isSubmitted && assignment.submissionNote && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-600">Your submission note:</p>
                <p className="text-xs text-slate-500 mt-0.5">{assignment.submissionNote}</p>
              </div>
            )}

            {!isSubmitted && (
              <div className="space-y-2">
                {showNote === assignment.id ? (
                  <>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a submission note (optional)…"
                      rows={2}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmit(assignment.id)}
                        disabled={submitting === assignment.id}
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" />
                        {submitting === assignment.id ? "Submitting…" : "Confirm Submit"}
                      </button>
                      <button
                        onClick={() => {
                          setShowNote(null);
                          setNote("");
                        }}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setShowNote(assignment.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Send className="h-3 w-3" />
                    Submit Assignment
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
