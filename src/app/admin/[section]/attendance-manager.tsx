"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";

type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string | null;
  classId: string | null;
  className: string | null;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  teacherId: string | null;
  teacherName: string | null;
  sessionId: string;
  sessionName: string | null;
  termId: string;
  termName: string | null;
  createdAt: string;
};

type ClassOption = {
  id: string;
  name: string;
  students: { id: string; name: string }[];
};

type StudentOption = {
  id: string;
  name: string;
  classId: string | null;
  className: string | null;
};

type SessionOption = { id: string; name: string; isCurrent: boolean };
type TermOption = { id: string; name: string; sessionId: string; sessionName: string; isCurrent: boolean };

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const statusColors: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700",
  ABSENT: "bg-rose-100 text-rose-700",
  LATE: "bg-amber-100 text-amber-700",
  EXCUSED: "bg-blue-100 text-blue-700",
};

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};

export function AttendanceManager() {
  const confirm = useConfirm();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  
  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  
  // Bulk marking state
  const [bulkAttendance, setBulkAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [submitting, setSubmitting] = useState(false);

  // Get students for selected class
  const selectedClassStudents = useMemo(() => {
    if (!selectedClassId) return [];
    const cls = classes.find((c) => c.id === selectedClassId);
    return cls?.students ?? [];
  }, [selectedClassId, classes]);

  // Filter attendance records
  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => {
      if (selectedClassId && a.classId !== selectedClassId) return false;
      if (selectedStudentId && a.studentId !== selectedStudentId) return false;
      return true;
    });
  }, [attendance, selectedClassId, selectedStudentId]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter((a) => a.status === "PRESENT").length;
    const absent = filteredAttendance.filter((a) => a.status === "ABSENT").length;
    const late = filteredAttendance.filter((a) => a.status === "LATE").length;
    const excused = filteredAttendance.filter((a) => a.status === "EXCUSED").length;
    return { total, present, absent, late, excused };
  }, [filteredAttendance]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const query = new URLSearchParams();
      if (selectedDate) query.set("date", selectedDate);
      if (selectedClassId) query.set("classId", selectedClassId);
      if (selectedStudentId) query.set("studentId", selectedStudentId);
      if (selectedSessionId) query.set("sessionId", selectedSessionId);
      if (selectedTermId) query.set("termId", selectedTermId);

      const response = await fetch(`/api/admin/attendance?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Unable to load attendance.");
        return;
      }
      setAttendance(payload.attendance ?? []);
      setClasses(payload.classes ?? []);
      setStudents(payload.students ?? []);
      setSessions(payload.sessions ?? []);
      setTerms(payload.terms ?? []);

      // Set default session/term if not selected
      if (!selectedSessionId && payload.sessions?.length > 0) {
        const currentSession = payload.sessions.find((s: SessionOption) => s.isCurrent);
        if (currentSession) setSelectedSessionId(currentSession.id);
      }
      if (!selectedTermId && payload.terms?.length > 0) {
        const currentTerm = payload.terms.find((t: TermOption) => t.isCurrent);
        if (currentTerm) setSelectedTermId(currentTerm.id);
      }
    } catch {
      setStatus("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedClassId, selectedStudentId, selectedSessionId, selectedTermId]);

  async function handleMarkAttendance(studentId: string, attendanceStatus: AttendanceStatus) {
    setStatus("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          classId: selectedClassId || null,
          date: selectedDate,
          status: attendanceStatus,
          sessionId: selectedSessionId || null,
          termId: selectedTermId || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to mark attendance.");
        return;
      }

      setStatus(`Attendance marked for ${payload.attendance?.studentName ?? "student"}.`);
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkMarkAll(status: AttendanceStatus) {
    if (!selectedClassId) {
      setStatus("Please select a class first.");
      return;
    }

    const studentsToMark = selectedClassStudents;
    if (studentsToMark.length === 0) {
      setStatus("No students in selected class.");
      return;
    }

    if (!(await confirm({
      title: "Bulk Mark Attendance",
      message: `Mark all ${studentsToMark.length} students as ${statusLabels[status]}?`,
      confirmLabel: "Mark All",
      variant: "info",
    }))) {
      return;
    }

    setStatus("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: studentsToMark.map((s) => ({ studentId: s.id, status })),
          classId: selectedClassId,
          date: selectedDate,
          sessionId: selectedSessionId || null,
          termId: selectedTermId || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to mark attendance.");
        return;
      }

      setStatus(`Marked attendance for ${payload.count ?? studentsToMark.length} students.`);
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkSubmit() {
    if (!selectedClassId) {
      setStatus("Please select a class first.");
      return;
    }

    const entries = Object.entries(bulkAttendance);
    if (entries.length === 0) {
      setStatus("No attendance records to submit.");
      return;
    }

    setStatus("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: entries.map(([studentId, status]) => ({ studentId, status })),
          classId: selectedClassId,
          date: selectedDate,
          sessionId: selectedSessionId || null,
          termId: selectedTermId || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to mark attendance.");
        return;
      }

      setStatus(`Marked attendance for ${payload.count ?? entries.length} students.`);
      setBulkAttendance({});
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading attendance...</div>;
  }

  return (
    <div className="space-y-4">
      {status ? (
        <div className={`rounded-lg border px-3 py-2 text-sm ${status.includes("success") || status.includes("Marked") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      ) : null}

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Filters</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Class</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setBulkAttendance({});
              }}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.students.length} students)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Student</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.className ? `(${s.className})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Session</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
            >
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Term</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
            >
              <option value="">Select term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-2 sm:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-500">Total Records</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
          <p className="text-xs text-slate-500">Present</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-rose-600">{stats.absent}</p>
          <p className="text-xs text-slate-500">Absent</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.late}</p>
          <p className="text-xs text-slate-500">Late</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.excused}</p>
          <p className="text-xs text-slate-500">Excused</p>
        </div>
      </div>

      {/* Bulk Marking for Selected Class */}
      {selectedClassId && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Take Attendance - {classes.find((c) => c.id === selectedClassId)?.name}
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-emerald-50"
                onClick={() => handleBulkMarkAll("PRESENT")}
                disabled={submitting}
              >
                Mark All Present
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkSubmit()} disabled={submitting || Object.keys(bulkAttendance).length === 0}>
                Submit Selected ({Object.keys(bulkAttendance).length})
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {selectedClassStudents.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No students in this class.</p>
            ) : (
              selectedClassStudents.map((student) => {
                const existingRecord = attendance.find(
                  (a) => a.studentId === student.id && a.date === selectedDate
                );
                const selectedStatus = bulkAttendance[student.id];

                return (
                  <div key={student.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
                    <span className="font-medium text-slate-900">{student.name}</span>
                    <div className="flex gap-1">
                      {existingRecord && (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[existingRecord.status]}`}>
                          {statusLabels[existingRecord.status]} (Saved)
                        </span>
                      )}
                      {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setBulkAttendance((prev) => ({
                              ...prev,
                              [student.id]: s,
                            }));
                          }}
                          className={`rounded px-2 py-1 text-xs ${
                            selectedStatus === s
                              ? statusColors[s]
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {statusLabels[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Attendance Records ({filteredAttendance.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Student</th>
                <th className="px-2 py-2">Class</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Marked By</th>
                <th className="px-2 py-2">Session/Term</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-slate-500">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-2">{record.date}</td>
                    <td className="px-2 py-2 font-medium text-slate-900">{record.studentName}</td>
                    <td className="px-2 py-2 text-slate-600">{record.studentClass ?? "-"}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[record.status]}`}>
                        {statusLabels[record.status]}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{record.teacherName ?? "-"}</td>
                    <td className="px-2 py-2 text-xs text-slate-500">
                      {record.sessionName ?? "-"} / {record.termName ?? "-"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleMarkAttendance(record.studentId, s)}
                            disabled={submitting}
                            className={`rounded px-2 py-0.5 text-xs ${
                              record.status === s
                                ? statusColors[s]
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {s[0]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
