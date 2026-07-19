"use client";

import { useMemo, useState } from "react";

type ClassOption = {
  id: string;
  name: string;
  students: Array<{ id: string; name: string }>;
};

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-600 text-white",
  ABSENT: "bg-rose-600 text-white",
  LATE: "bg-amber-500 text-white",
  EXCUSED: "bg-sky-600 text-white",
};

const STATUS_INACTIVE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ABSENT: "bg-rose-50 text-rose-700 border-rose-200",
  LATE: "bg-amber-50 text-amber-700 border-amber-200",
  EXCUSED: "bg-sky-50 text-sky-700 border-sky-200",
};

export function TeacherAttendanceForm({ classOptions }: { classOptions: ClassOption[] }) {
  const [classId, setClassId] = useState(classOptions[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});

  const selectedClass = useMemo(() => classOptions.find((item) => item.id === classId) ?? null, [classId, classOptions]);
  const students = selectedClass?.students ?? [];

  function setStudentStatus(studentId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAllPresent() {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s) => { next[s.id] = "PRESENT"; });
    setStatuses(next);
  }

  async function submit() {
    if (!classId) {
      setMessage("Select a class first.");
      return;
    }
    if (students.length === 0) {
      setMessage("No students in this class.");
      return;
    }

    const entries = students.map((s) => ({
      studentId: s.id,
      status: statuses[s.id] ?? "PRESENT",
    }));

    setSubmitting(true);
    setMessage("Saving attendance...");

    try {
      const response = await fetch("/api/teacher/attendance/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, date, entries }),
      });

      const payload = await response.json().catch(() => ({}));
      setSubmitting(false);

      if (!response.ok) {
        setMessage(payload?.error ?? "Could not save attendance.");
        return;
      }

      const saved = payload?.saved ?? entries.length;
      setMessage(`Attendance saved for ${saved} student${saved !== 1 ? "s" : ""}.`);
    } catch {
      setSubmitting(false);
      setMessage("Network error. Please try again.");
    }
  }

  if (!classOptions.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No classes assigned to you yet. Attendance will be available once classes are assigned.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Mark Attendance</p>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setStatuses({});
            }}
          >
            {classOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </div>

      {students.length > 0 && (
        <button
          type="button"
          onClick={markAllPresent}
          className="rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
        >
          Mark All Present
        </button>
      )}

      {students.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">No students enrolled in this class.</p>
      ) : (
        <div className="space-y-2">
          {students.map((student) => {
            const current = statuses[student.id] ?? "PRESENT";
            return (
              <div key={student.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-slate-800 truncate">{student.name}</p>
                <div className="flex flex-wrap gap-1">
                  {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStudentStatus(student.id, s)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                        current === s ? STATUS_COLORS[s] : STATUS_INACTIVE[s]
                      }`}
                    >
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {students.length > 0 && (
        <button
          type="button"
          disabled={submitting}
          className="w-full rounded-md bg-[var(--brand-primary)] px-3 py-2.5 text-white disabled:opacity-60 sm:w-auto"
          onClick={submit}
        >
          {submitting ? "Saving..." : "Save Attendance"}
        </button>
      )}

      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
