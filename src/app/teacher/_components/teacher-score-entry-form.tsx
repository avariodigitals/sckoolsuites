"use client";

import { useMemo, useState } from "react";

type SubjectOption = {
  id: string;
  name: string;
  classId?: string | null;
};

type StudentOption = {
  id: string;
  name: string;
  classId?: string | null;
};

type ScoreRow = {
  caScore: string;
  examScore: string;
};

export function TeacherScoreEntryForm({ subjectOptions, studentOptions }: { subjectOptions: SubjectOption[]; studentOptions: StudentOption[] }) {
  const [subjectId, setSubjectId] = useState(subjectOptions[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});

  const selectedSubject = useMemo(() => subjectOptions.find((item) => item.id === subjectId) ?? null, [subjectId, subjectOptions]);
  const filteredStudents = useMemo(() => {
    if (!selectedSubject?.classId) return studentOptions;
    return studentOptions.filter((item) => item.classId === selectedSubject.classId);
  }, [selectedSubject, studentOptions]);

  function setScore(studentId: string, field: "caScore" | "examScore", value: string) {
    setScores((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId] ?? { caScore: "", examScore: "" }, [field]: value },
    }));
  }

  async function submit() {
    if (!subjectId) {
      setMessage("Select a subject first.");
      return;
    }

    const entries = filteredStudents
      .filter((s) => {
        const row = scores[s.id];
        return row && (row.caScore || row.examScore);
      })
      .map((s) => ({
        studentId: s.id,
        caScore: Number(scores[s.id]?.caScore || 0),
        examScore: Number(scores[s.id]?.examScore || 0),
      }));

    if (entries.length === 0) {
      setMessage("Enter at least one score to save.");
      return;
    }

    setSubmitting(true);
    setMessage(`Saving ${entries.length} score${entries.length !== 1 ? "s" : ""}...`);

    try {
      const response = await fetch("/api/teacher/scores/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, entries }),
      });

      const payload = await response.json().catch(() => ({}));
      setSubmitting(false);

      if (!response.ok) {
        setMessage(payload?.error ?? "Could not save scores.");
        return;
      }

      const saved = payload?.saved ?? entries.length;
      const errors = payload?.errors ?? [];
      if (errors.length > 0) {
        setMessage(`Saved ${saved} scores. ${errors.length} had errors: ${errors[0]?.error ?? "Unknown"}`);
      } else {
        setMessage(`Saved ${saved} score${saved !== 1 ? "s" : ""} successfully.`);
      }
      setScores({});
    } catch {
      setSubmitting(false);
      setMessage("Network error. Please try again.");
    }
  }

  if (!subjectOptions.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No subjects assigned to you yet. Score entry will be available once subjects are assigned.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Enter Scores</p>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={subjectId}
          onChange={(event) => {
            setSubjectId(event.target.value);
            setScores({});
          }}
        >
          {subjectOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-amber-700">Once submitted, scores cannot be edited. To make corrections, contact your head teacher or admin.</p>

      {filteredStudents.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">No students enrolled in this subject&apos;s class.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2 pr-2 font-medium">Student</th>
                <th className="px-2 py-2 font-medium whitespace-nowrap">CA Score</th>
                <th className="px-2 py-2 font-medium whitespace-nowrap">Exam Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const row = scores[student.id] ?? { caScore: "", examScore: "" };
                return (
                  <tr key={student.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-medium text-slate-800 truncate max-w-[160px]">{student.name}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        max={40}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="CA"
                        value={row.caScore}
                        onChange={(e) => setScore(student.id, "caScore", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="Exam"
                        value={row.examScore}
                        onChange={(e) => setScore(student.id, "examScore", e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredStudents.length > 0 && (
        <button
          type="button"
          disabled={submitting}
          className="w-full rounded-md bg-[var(--brand-primary)] px-3 py-2.5 text-white disabled:opacity-60 sm:w-auto"
          onClick={submit}
        >
          {submitting ? "Saving..." : "Save Scores"}
        </button>
      )}

      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
