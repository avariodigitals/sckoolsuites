"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentDetailModal } from "./student-detail-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import Image from "next/image";

type Student = {
  id: string;
  userId: string;
  name: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  email: string;
  gender: string;
  age: number;
  dateOfBirth: string | null;
  classId: string | null;
  className: string | null;
  parentId: string | null;
  parentName: string | null;
  sportHouse: string | null;
  coCurricular: string | null;
  responsibilities: string | null;
  passportUrl: string | null;
  isActive: boolean;
  createdAt: string;
};

type ClassOption = { id: string; name: string };
type ParentOption = { id: string; name: string; email: string };
type Gender = "MALE" | "FEMALE" | "OTHER";

type GuardianForm = {
  name: string;
  email: string;
  phone: string;
  relationship: string;
  occupation: string;
  employerName: string;
  workAddress: string;
  workPhone: string;
  homeAddress: string;
  idDocumentType: string;
  idDocumentNumber: string;
  isPrimary: boolean;
};

type StudentForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  gender: Gender;
  age: string;
  dateOfBirth: string;
  classId: string;
  parentId: string;
  sportHouse: string;
  coCurricular: string;
  responsibilities: string;
  guardian: GuardianForm;
};

const emptyGuardian: GuardianForm = {
  name: "",
  email: "",
  phone: "",
  relationship: "",
  occupation: "",
  employerName: "",
  workAddress: "",
  workPhone: "",
  homeAddress: "",
  idDocumentType: "",
  idDocumentNumber: "",
  isPrimary: true,
};

const emptyStudent: StudentForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  gender: "MALE",
  age: "",
  dateOfBirth: "",
  classId: "",
  parentId: "",
  sportHouse: "",
  coCurricular: "",
  responsibilities: "",
  guardian: emptyGuardian,
};

function AvatarCell({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return <Image src={url} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
      {name?.charAt(0)?.toUpperCase() ?? "S"}
    </div>
  );
}

function calcAgeFromDOB(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

function calcDetailedAge(dob: string): string {
  const birth = new Date(dob);
  const now = new Date();
  if (birth > now) return "0 years";

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(" ") : "0 days";
}

export function StudentManager({ sessionId, termId }: { sessionId?: string | null; termId?: string | null }) {
  const confirm = useConfirm();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<StudentForm>(emptyStudent);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [guardianSearch, setGuardianSearch] = useState("");

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.className?.toLowerCase().includes(query) ||
        s.parentName?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const params = new URLSearchParams();
      if (sessionId) params.set("sessionId", sessionId);
      if (termId) params.set("termId", termId);
      const url = `/api/admin/students${params.toString() ? "?" + params.toString() : ""}`;
      const response = await fetch(url, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Unable to load students.");
        return;
      }
      setStudents(payload.students ?? []);
      setClasses(payload.classes ?? []);
      setParents(payload.parents ?? []);
    } catch {
      setStatus("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, termId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData, sessionId, termId]);

  async function handleSubmit() {
    setStatus("");
    setSubmitting(true);

    const body = {
      firstName: form.firstName,
      middleName: form.middleName || null,
      lastName: form.lastName,
      email: form.email,
      gender: form.gender,
      age: Number(form.age) || (form.dateOfBirth ? calcAgeFromDOB(form.dateOfBirth) : 0),
      dateOfBirth: form.dateOfBirth || null,
      classId: form.classId || null,
      parentId: form.parentId || null,
      sportHouse: form.sportHouse || null,
      coCurricular: form.coCurricular || null,
      responsibilities: form.responsibilities || null,
      guardian: creating && !form.parentId && form.guardian.name.trim()
        ? {
            name: form.guardian.name.trim(),
            email: form.guardian.email.trim() || null,
            phone: form.guardian.phone.trim() || null,
            relationship: form.guardian.relationship.trim() || null,
            occupation: form.guardian.occupation.trim() || null,
            employerName: form.guardian.employerName.trim() || null,
            workAddress: form.guardian.workAddress.trim() || null,
            workPhone: form.guardian.workPhone.trim() || null,
            homeAddress: form.guardian.homeAddress.trim() || null,
            idDocumentType: form.guardian.idDocumentType.trim() || null,
            idDocumentNumber: form.guardian.idDocumentNumber.trim() || null,
            isPrimary: form.guardian.isPrimary,
          }
        : undefined,
    };

    const url = creating
      ? "/api/admin/students"
      : `/api/admin/students/${editingId}`;
    const method = creating ? "POST" : "PATCH";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? `Failed to ${creating ? "create" : "update"} student.`);
        return;
      }

      setForm(emptyStudent);
      setEditingId(null);
      setCreating(false);
      setStatus(`Student ${creating ? "created" : "updated"} successfully.`);
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setEditingId("new");
    setForm(emptyStudent);
    setStatus("");
  }

  function cancelForm() {
    setEditingId(null);
    setCreating(false);
    setForm(emptyStudent);
    setStatus("");
  }

  async function handleResend(id: string, name: string) {
    if (!(await confirm({
      title: "Resend Welcome Email",
      message: `Resend welcome email with a new temporary password to ${name}?`,
      confirmLabel: "Resend",
      variant: "info",
    }))) return;
    setStatus("");
    try {
      const response = await fetch(`/api/admin/students/${id}/resend`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to resend credentials.");
        return;
      }
      setStatus("Welcome email resent successfully.");
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleHardDelete(id: string) {
    if (!(await confirm({
      title: "Permanently Delete Student",
      message: "PERMANENTLY delete this student? This action cannot be undone. All related data (enrollments, fees, results) will be lost.",
      confirmLabel: "Delete Permanently",
      variant: "danger",
    }))) {
      return;
    }
    setDeletingId(id);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/students/${id}?hard=true`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to delete student.");
        return;
      }
      setStatus("Student deleted permanently.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeactivate(id: string) {
    if (!(await confirm({
      title: "Deactivate Student",
      message: "Deactivate this student? They will no longer be able to log in.",
      confirmLabel: "Deactivate",
      variant: "danger",
    }))) {
      return;
    }

    setStatus("");
    try {
      const response = await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to deactivate student.");
        return;
      }

      setStatus("Student deactivated.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  function startEdit(student: Student) {
    setEditingId(student.id);
    setForm({
      firstName: student.firstName ?? "",
      middleName: student.middleName ?? "",
      lastName: student.lastName ?? "",
      email: student.email,
      gender: student.gender as "MALE" | "FEMALE" | "OTHER",
      age: String(student.age),
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split("T")[0] : "",
      classId: student.classId ?? "",
      parentId: student.parentId ?? "",
      sportHouse: student.sportHouse ?? "",
      coCurricular: student.coCurricular ?? "",
      responsibilities: student.responsibilities ?? "",
      guardian: emptyGuardian,
    });
  }

  const filteredParents = useMemo(() => {
    if (!guardianSearch.trim()) return parents;
    const q = guardianSearch.toLowerCase();
    return parents.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [parents, guardianSearch]);

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading students...</div>;
  }

  return (
    <div className="space-y-4">
      {status ? (
        <div className={`rounded-lg border px-3 py-2 text-sm ${status.includes("success") || status.includes("created") || status.includes("updated") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      ) : null}

      {/* Search and Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, email, class or parent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button onClick={handleCreate} disabled={creating || editingId !== null}>
          + Add Student
        </Button>
      </div>

      {/* Create / Edit Student Form */}
      {editingId !== null && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{creating ? "Add New Student" : "Edit Student"}</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              placeholder="First name *"
            />
            <Input
              value={form.middleName}
              onChange={(e) => setForm((prev) => ({ ...prev, middleName: e.target.value }))}
              placeholder="Middle name (optional)"
            />
            <Input
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              placeholder="Last name *"
            />
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email address *"
              disabled={!creating}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.gender}
              onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as "MALE" | "FEMALE" | "OTHER" }))}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value, age: e.target.value ? String(calcAgeFromDOB(e.target.value)) : prev.age }))}
              placeholder="Date of Birth *"
              max={new Date().toISOString().split("T")[0]}
            />
            {form.dateOfBirth && (
              <div className="flex items-center text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                Age: <span className="font-medium text-slate-900 ml-1">{calcDetailedAge(form.dateOfBirth)}</span>
              </div>
            )}
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.classId}
              onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value }))}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="space-y-1">
              <Input
                placeholder="Search guardian..."
                value={guardianSearch}
                onChange={(e) => setGuardianSearch(e.target.value)}
                className="text-sm"
              />
              <select
                className="rounded-md border border-slate-300 px-3 py-2 text-sm w-full"
                value={form.parentId}
                onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
              >
                <option value="">Select parent/guardian</option>
                {filteredParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
              {parents.length > 10 && !guardianSearch && (
                <p className="text-xs text-slate-400">Type above to search {parents.length} guardians</p>
              )}
            </div>
            {creating && !form.parentId && (
              <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <h4 className="mb-2 text-xs font-semibold text-slate-700">New Guardian</h4>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <Input value={form.guardian.name} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, name: e.target.value } }))} placeholder="Guardian name *" />
                  <Input type="email" value={form.guardian.email} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, email: e.target.value } }))} placeholder="Guardian email" />
                  <Input value={form.guardian.phone} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, phone: e.target.value } }))} placeholder="Phone" />
                  <Input value={form.guardian.relationship} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, relationship: e.target.value } }))} placeholder="Relationship e.g. Father" />
                  <Input value={form.guardian.occupation} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, occupation: e.target.value } }))} placeholder="Occupation" />
                  <Input value={form.guardian.employerName} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, employerName: e.target.value } }))} placeholder="Employer / place of work" />
                  <Input value={form.guardian.workPhone} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, workPhone: e.target.value } }))} placeholder="Work phone" />
                  <Input value={form.guardian.workAddress} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, workAddress: e.target.value } }))} placeholder="Work address" />
                  <Input value={form.guardian.homeAddress} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, homeAddress: e.target.value } }))} placeholder="Home address" />
                  <Input value={form.guardian.idDocumentType} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, idDocumentType: e.target.value } }))} placeholder="ID document type" />
                  <Input value={form.guardian.idDocumentNumber} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, idDocumentNumber: e.target.value } }))} placeholder="ID document number" />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.guardian.isPrimary} onChange={(e) => setForm((prev) => ({ ...prev, guardian: { ...prev.guardian, isPrimary: e.target.checked } }))} />
                    Primary guardian
                  </label>
                </div>
              </div>
            )}
            <Input
              value={form.sportHouse}
              onChange={(e) => setForm((prev) => ({ ...prev, sportHouse: e.target.value }))}
              placeholder="Sport house (optional)"
            />
            <Input
              value={form.coCurricular}
              onChange={(e) => setForm((prev) => ({ ...prev, coCurricular: e.target.value }))}
              placeholder="Co-curricular activity (optional)"
            />
            <Input
              value={form.responsibilities}
              onChange={(e) => setForm((prev) => ({ ...prev, responsibilities: e.target.value }))}
              placeholder="Responsibilities (optional)"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (creating ? "Creating..." : "Updating...") : (creating ? "Create Student" : "Update Student")}
            </Button>
            <Button variant="outline" onClick={cancelForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Students ({filteredStudents.length} of {students.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Gender</th>
                <th className="px-2 py-2">Date of Birth</th>
                <th className="px-2 py-2">Age</th>
                <th className="px-2 py-2">Class</th>
                <th className="px-2 py-2">Parent</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-2 py-4 text-center text-slate-500">
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-2">
                      <AvatarCell url={student.passportUrl} name={student.name} />
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-900">{student.name}</td>
                    <td className="px-2 py-2 text-slate-600">{student.email}</td>
                    <td className="px-2 py-2">{student.gender}</td>
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap">
                      {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                    </td>
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap">
                      {student.dateOfBirth ? calcDetailedAge(student.dateOfBirth) : `${student.age} years`}
                    </td>
                    <td className="px-2 py-2">{student.className ?? "-"}</td>
                    <td className="px-2 py-2">{student.parentName ?? "-"}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          student.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {student.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setViewingId(student.id)}>
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(student)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResend(student.id, student.name)}
                        >
                          Resend
                        </Button>
                        {student.isActive && (
                          <Button size="sm" variant="outline" onClick={() => handleDeactivate(student.id)}>
                            Deactivate
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => handleHardDelete(student.id)} disabled={deletingId === student.id}>
                          {deletingId === student.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingId && (
        <StudentDetailModal
          studentId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}
