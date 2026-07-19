"use client";

import { useState } from "react";

type SubjectOption = { id: string; name: string; classId?: string | null };
type ClassOption = { id: string; name: string };

export function TeacherAssignmentForm({ subjectOptions, classOptions }: { subjectOptions: SubjectOption[]; classOptions: ClassOption[] }) {
  const [subjectId, setSubjectId] = useState(subjectOptions[0]?.id ?? "");
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim() || !instruction.trim()) {
      setMessage("Title and instruction are required.");
      return;
    }

    setSubmitting(true);
    setMessage("Saving assignment...");

    try {
      const response = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: subjectId ? Number(subjectId) : undefined,
          classId: classId ? Number(classId) : undefined,
          title: title.trim(),
          instruction: instruction.trim(),
          dueDate,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      setSubmitting(false);

      if (!response.ok) {
        setMessage(payload?.error ?? "Could not save assignment.");
        return;
      }

      setMessage("Assignment saved successfully.");
      setTitle("");
      setInstruction("");
      setClassId("");
    } catch {
      setSubmitting(false);
      setMessage("Network error. Please try again.");
    }
  }

  if (!subjectOptions.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No subjects assigned to you yet. Assignments can be created once subjects are assigned.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Create Assignment</p>
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
        placeholder="Assignment title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[80px]"
        placeholder="Instructions for students"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-xs text-slate-600">
          Due date:
          <input
            type="date"
            className="ml-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={submitting}
          className="rounded-md bg-[var(--brand-primary)] px-3 py-2.5 text-white disabled:opacity-60"
          onClick={submit}
        >
          {submitting ? "Saving..." : "Save Assignment"}
        </button>
      </div>
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
