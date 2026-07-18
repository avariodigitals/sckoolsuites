"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRightLeft, Search, RefreshCw, CheckCircle, AlertCircle, Users } from "lucide-react";

type Student = {
  id: number;
  name: string;
  admissionNo: string | null;
  className: string | null;
  armName: string | null;
  classId: number | null;
  armId: number | null;
};

type ClassOption = {
  id: number;
  name: string;
  arms: { id: number; name: string }[];
};

export function TransferClient({ schoolId }: { schoolId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [targetArmId, setTargetArmId] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [studentsRes, classesRes] = await Promise.all([
        fetch("/api/admin/students?limit=500"),
        fetch("/api/admin/classes"),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        const list: Student[] = (data.students ?? data ?? []).map((s: any) => ({
          id: s.id,
          name: s.name ?? `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim(),
          admissionNo: s.admissionNo ?? null,
          className: s.className ?? null,
          armName: s.armName ?? null,
          classId: s.classId ?? null,
          armId: s.armId ?? null,
        }));
        setStudents(list);
      }

      if (classesRes.ok) {
        const data = await classesRes.json();
        const list: ClassOption[] = (data.classes ?? data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          arms: (c.arms ?? []).map((a: any) => ({ id: a.id, name: a.name })),
        }));
        setClasses(list);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.admissionNo ?? "").toLowerCase().includes(q) ||
        (s.className ?? "").toLowerCase().includes(q),
    );
  }, [students, search]);

  const targetClass = classes.find((c) => String(c.id) === targetClassId);
  const targetArms = targetClass?.arms ?? [];

  async function handleTransfer() {
    if (!selectedStudent || !targetClassId) return;
    setTransferring(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/students/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          classId: Number(targetClassId),
          armId: targetArmId ? Number(targetArmId) : null,
        }),
      });

      if (res.ok) {
        setMessage(`Successfully transferred ${selectedStudent.name} to ${targetClass?.name ?? "new class"}.`);
        setSelectedStudent(null);
        setTargetClassId("");
        setTargetArmId("");
        await loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error ?? "Transfer failed. Please try again.");
      }
    } catch {
      setMessage("An error occurred during transfer.");
    } finally {
      setTransferring(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.includes("Successfully")
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.includes("Successfully") ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by student name, admission number, or class..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Students</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{students.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Available Classes</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{classes.length}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Filtered Results</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{filteredStudents.length}</p>
        </div>
      </div>

      {/* Transfer panel */}
      {selectedStudent && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">Transfer Student</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Student</p>
              <p className="text-sm font-semibold text-slate-900">{selectedStudent.name}</p>
              <p className="text-xs text-slate-500">
                From: {selectedStudent.className ?? "Unassigned"}
                {selectedStudent.armName ? ` - ${selectedStudent.armName}` : ""}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Transfer To Class</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={targetClassId}
                onChange={(e) => {
                  setTargetClassId(e.target.value);
                  setTargetArmId("");
                }}
              >
                <option value="">Select class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Select Arm (optional)</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={targetArmId}
                onChange={(e) => setTargetArmId(e.target.value)}
                disabled={!targetClassId || targetArms.length === 0}
              >
                <option value="">No arm / All sections</option>
                {targetArms.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={handleTransfer}
              disabled={transferring || !targetClassId}
              className="bg-indigo-600 hover:bg-indigo-700"
              size="sm"
            >
              {transferring ? (
                <>
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-1 h-3 w-3" />
                  Confirm Transfer
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedStudent(null);
                setTargetClassId("");
                setTargetArmId("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Student list */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Student Directory</h3>
            <span className="text-xs text-slate-400">({filteredStudents.length})</span>
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No students found. Try adjusting your search.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{student.name}</p>
                    <p className="text-xs text-slate-500">
                      {student.admissionNo ? `${student.admissionNo} • ` : ""}
                      {student.className ?? "No class assigned"}
                      {student.armName ? ` - ${student.armName}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      setSelectedStudent(student);
                      setTargetClassId("");
                      setTargetArmId("");
                      setMessage("");
                    }}
                  >
                    <ArrowRightLeft className="mr-1 h-3 w-3" />
                    Transfer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
