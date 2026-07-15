"use client";

import { useEffect, useMemo, useState } from "react";

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

export function TeacherScoreEntryForm({ subjectOptions, studentOptions }: { subjectOptions: SubjectOption[]; studentOptions: StudentOption[] }) {
  const [subjectId, setSubjectId] = useState(subjectOptions[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [caScore, setCaScore] = useState("");
  const [examScore, setExamScore] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedSubject = useMemo(() => subjectOptions.find((item) => item.id === subjectId) ?? null, [subjectId, subjectOptions]);
  const filteredStudents = useMemo(() => {
    if (!selectedSubject?.classId) return studentOptions;
    return studentOptions.filter((item) => item.classId === selectedSubject.classId);
  }, [selectedSubject, studentOptions]);

  useEffect(() => {
    const nextStudentId = filteredStudents[0]?.id ?? "";
    const timer = setTimeout(() => {
      setStudentId(nextStudentId);
    }, 0);

    return () => clearTimeout(timer);
  }, [subjectId, filteredStudents]);

  async function submit() {
    if (!subjectId || !studentId) {
      setMessage("Select subject and student first.");
      return;
    }

    setSubmitting(true);
    setMessage("Saving score...");

    const response = await fetch("/api/teacher/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        studentId,
        caScore,
        examScore,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not save score.");
      return;
    }

    setMessage(`Score saved. Grade: ${payload.grade} (GPA ${Number(payload.gpa).toFixed(2)})`);
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Enter Score</p>
      <p className="text-xs text-amber-700">Once submitted, scores cannot be edited. To make corrections, contact your head teacher or admin.</p>
      <div className="grid gap-2 md:grid-cols-2">
        <select className="rounded-md border border-slate-300 px-3 py-2" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
          {subjectOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <select className="rounded-md border border-slate-300 px-3 py-2" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          {filteredStudents.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <input type="number" min={0} max={40} className="rounded-md border border-slate-300 px-3 py-2" placeholder="CA score" value={caScore} onChange={(event) => setCaScore(event.target.value)} />
        <input type="number" min={0} max={100} className="rounded-md border border-slate-300 px-3 py-2" placeholder="Exam score" value={examScore} onChange={(event) => setExamScore(event.target.value)} />
      </div>

      <button type="button" disabled={submitting} className="rounded-md bg-[var(--brand-primary)] px-3 py-2 text-white disabled:opacity-60" onClick={submit}>
        {submitting ? "Saving..." : "Save Score"}
      </button>

      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
