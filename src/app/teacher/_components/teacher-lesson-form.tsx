"use client";

import { useState } from "react";

type SubjectOption = { id: string; name: string; classId?: string | null };
type ClassOption = { id: string; name: string };

export function TeacherLessonForm({ subjectOptions, classOptions }: { subjectOptions: SubjectOption[]; classOptions: ClassOption[] }) {
  const [subjectId, setSubjectId] = useState(subjectOptions[0]?.id ?? "");
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!subjectId || !title.trim()) {
      setMessage("Subject and title are required.");
      return;
    }

    setSubmitting(true);
    setMessage("Saving lesson note...");

    try {
      const response = await fetch("/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: Number(subjectId),
          classId: classId ? Number(classId) : undefined,
          title: title.trim(),
          note: note.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      setSubmitting(false);

      if (!response.ok) {
        setMessage(payload?.error ?? "Could not save lesson note.");
        return;
      }

      setMessage("Lesson note saved successfully.");
      setTitle("");
      setNote("");
      setClassId("");
    } catch {
      setSubmitting(false);
      setMessage("Network error. Please try again.");
    }
  }

  if (!subjectOptions.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No subjects assigned to you yet. Lesson notes can be created once subjects are assigned.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Create Lesson Note</p>
      <div className="grid gap-2 md:grid-cols-2">
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
        >
          {subjectOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">No specific class</option>
          {classOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>
      <input
        type="text"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="Lesson title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[100px]"
        placeholder="Lesson notes / content"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        type="button"
        disabled={submitting}
        className="w-full rounded-md bg-[var(--brand-primary)] px-3 py-2.5 text-white disabled:opacity-60 sm:w-auto"
        onClick={submit}
      >
        {submitting ? "Saving..." : "Save Lesson Note"}
      </button>
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
