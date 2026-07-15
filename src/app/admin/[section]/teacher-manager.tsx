"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeacherDetailModal } from "./teacher-detail-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Teacher = {
  id: string;
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  assignedClasses: { id: string; name: string }[];
  assignedSubjects: { id: string; name: string }[];
  studentCount: number;
  designation: string | null;
  reportsTo: { id: number; name: string } | null;
  classGroupId: number | null;
  classGroupName: string | null;
};

type Option = { id: string; name: string };

const emptyTeacher = {
  name: "",
  email: "",
  designation: "",
  reportsToId: "",
  classGroupId: "",
};

export function TeacherManager() {
  const confirm = useConfirm();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [unassignedClasses, setUnassignedClasses] = useState<Option[]>([]);
  const [unassignedSubjects, setUnassignedSubjects] = useState<Option[]>([]);
  const [, setAllClasses] = useState<Option[]>([]);
  const [, setAllSubjects] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(emptyTeacher);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unassigningClassId, setUnassigningClassId] = useState<string | null>(null);
  const [unassigningSubjectId, setUnassigningSubjectId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [classGroups, setClassGroups] = useState<{ id: number; name: string }[]>([]);

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const query = searchQuery.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query) ||
        t.assignedClasses.some((c) => c.name.toLowerCase().includes(query)) ||
        t.assignedSubjects.some((s) => s.name.toLowerCase().includes(query))
    );
  }, [teachers, searchQuery]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/teachers", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Unable to load teachers.");
        return;
      }
      setTeachers(payload.teachers ?? []);
      setUnassignedClasses(payload.unassignedClasses ?? []);
      setUnassignedSubjects(payload.unassignedSubjects ?? []);
      setAllClasses(payload.allClasses ?? []);
      setAllSubjects(payload.allSubjects ?? []);
      setClassGroups(payload.classGroups ?? []);
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
  }, []);

  async function handleSubmit() {
    setStatus("");
    setSubmitting(true);

    const body = {
      name: form.name,
      email: form.email,
      ...(form.designation ? { designation: form.designation } : {}),
      ...(form.reportsToId ? { reportsToId: Number(form.reportsToId) } : {}),
      ...(form.classGroupId ? { classGroupId: Number(form.classGroupId) } : {}),
    };

    const isEditing = editingId !== null;
    const url = isEditing ? `/api/admin/teachers/${editingId}` : "/api/admin/teachers";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? `Failed to ${isEditing ? "update" : "create"} teacher.`);
        return;
      }

      setForm(emptyTeacher);
      setEditingId(null);
      setStatus(`Teacher ${isEditing ? "updated" : "created"} successfully.`);
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignClass(teacherId: string, classId: string) {
    setStatus("");
    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, action: "ASSIGN" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to assign class.");
        return;
      }

      setStatus("Class assigned successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleUnassignClass(teacherId: string, classId: string) {
    if (!(await confirm({
      title: "Unassign Class",
      message: "Unassign this class from the teacher?",
      confirmLabel: "Unassign",
      variant: "warning",
    }))) return;

    setStatus("");
    setUnassigningClassId(classId);
    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, action: "UNASSIGN" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to unassign class.");
        return;
      }

      setStatus("Class unassigned successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setUnassigningClassId(null);
    }
  }

  async function handleAssignSubject(teacherId: string, subjectId: string) {
    setStatus("");
    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, action: "ASSIGN" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to assign subject.");
        return;
      }

      setStatus("Subject assigned successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleUnassignSubject(teacherId: string, subjectId: string) {
    if (!(await confirm({
      title: "Unassign Subject",
      message: "Unassign this subject from the teacher?",
      confirmLabel: "Unassign",
      variant: "warning",
    }))) return;

    setStatus("");
    setUnassigningSubjectId(subjectId);
    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, action: "UNASSIGN" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to unassign subject.");
        return;
      }

      setStatus("Subject unassigned successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setUnassigningSubjectId(null);
    }
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
      const response = await fetch(`/api/admin/teachers/${id}/resend`, { method: "POST" });
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

  async function handleDeactivate(id: string, name: string) {
    if (!(await confirm({
      title: "Deactivate Teacher",
      message: `Deactivate ${name}? They will no longer be able to log in.`,
      confirmLabel: "Deactivate",
      variant: "danger",
    }))) {
      return;
    }

    setStatus("");
    try {
      const response = await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to deactivate teacher.");
        return;
      }

      setStatus("Teacher deactivated.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  function startEdit(teacher: Teacher) {
    setEditingId(teacher.id);
    setForm({
      name: teacher.name,
      email: teacher.email,
      designation: teacher.designation ?? "",
      reportsToId: teacher.reportsTo ? String(teacher.reportsTo.id) : "",
      classGroupId: teacher.classGroupId ? String(teacher.classGroupId) : "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyTeacher);
    setStatus("");
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading teachers...</div>;
  }

  return (
    <div className="space-y-4">
      {status ? (
        <div className={`rounded-lg border px-3 py-2 text-sm ${status.includes("success") || status.includes("created") || status.includes("updated") || status.includes("assigned") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      ) : null}

      {/* Search and Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, email, class or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingId(null);
            setForm(emptyTeacher);
            setStatus("");
          }}
        >
          + New Teacher
        </Button>
      </div>

      {/* Teacher Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          {editingId ? "Edit Teacher" : "Add New Teacher"}
        </h3>
        {!editingId && (
          <p className="mb-3 text-xs text-slate-500">A temporary password will be auto-generated and emailed to the teacher. They will be prompted to change it on first login.</p>
        )}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Full name *"
          />
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email address *"
            disabled={editingId !== null}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.designation}
            onChange={(e) => setForm((prev) => ({ ...prev, designation: e.target.value }))}
          >
            <option value="">Designation...</option>
            <option value="CLASS_TEACHER">Class Teacher</option>
            <option value="SUBJECT_TEACHER">Subject Teacher</option>
            <option value="HEAD_OF_DEPARTMENT">Head of Department</option>
            <option value="HEAD_TEACHER">Head Teacher</option>
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.reportsToId}
            onChange={(e) => setForm((prev) => ({ ...prev, reportsToId: e.target.value }))}
          >
            <option value="">Reports to...</option>
            {teachers.filter((t) => t.id !== editingId).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {classGroups.length > 0 && (
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.classGroupId}
              onChange={(e) => setForm((prev) => ({ ...prev, classGroupId: e.target.value }))}
            >
              <option value="">Class Group (for HOD/HT)...</option>
              {classGroups.map((cg) => (
                <option key={cg.id} value={cg.id}>{cg.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={handleSubmit} disabled={submitting || (!editingId && (!form.name || !form.email))}>
            {submitting ? (editingId ? "Updating..." : "Creating...") : editingId ? "Update Teacher" : "Create Teacher"}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Teachers Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Teachers ({filteredTeachers.length} of {teachers.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Designation</th>
                <th className="px-2 py-2">Reports To</th>
                <th className="px-2 py-2">Classes</th>
                <th className="px-2 py-2">Subjects</th>
                <th className="px-2 py-2">Students</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-4 text-center text-slate-500">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-2 font-medium text-slate-900">{teacher.name}</td>
                    <td className="px-2 py-2 text-slate-600">{teacher.email}</td>
                    <td className="px-2 py-2">
                      {teacher.designation ? (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{teacher.designation.replace(/_/g, " ")}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-slate-600">{teacher.reportsTo?.name ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-2 py-2">
                      {teacher.assignedClasses.length === 0 ? (
                        <span className="text-slate-400">No classes</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {teacher.assignedClasses.map((cls) => (
                            <span key={cls.id} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs">
                              {cls.name}
                              <button
                                onClick={() => handleUnassignClass(teacher.id, cls.id)}
                                disabled={unassigningClassId === cls.id}
                                className="text-rose-500 hover:text-rose-700"
                                title="Unassign class"
                              >
                                {unassigningClassId === cls.id ? "..." : "×"}
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {teacher.assignedSubjects.length === 0 ? (
                        <span className="text-slate-400">No subjects</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {teacher.assignedSubjects.map((subj) => (
                            <span key={subj.id} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs">
                              {subj.name}
                              <button
                                onClick={() => handleUnassignSubject(teacher.id, subj.id)}
                                disabled={unassigningSubjectId === subj.id}
                                className="text-rose-500 hover:text-rose-700"
                                title="Unassign subject"
                              >
                                {unassigningSubjectId === subj.id ? "..." : "×"}
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">{teacher.studentCount}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          teacher.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {teacher.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewingId(teacher.id)}>
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(teacher)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResend(teacher.id, teacher.name)}
                        >
                          Resend
                        </Button>
                        {teacher.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(teacher.id, teacher.name)}
                          >
                            Deactivate
                          </Button>
                        )}
                        {unassignedClasses.length > 0 && (
                          <select
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            onChange={(e) => {
                              if (e.target.value) {
                                void handleAssignClass(teacher.id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                            value=""
                          >
                            <option value="">+ Assign class...</option>
                            {unassignedClasses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {unassignedSubjects.length > 0 && (
                          <select
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            onChange={(e) => {
                              if (e.target.value) {
                                void handleAssignSubject(teacher.id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                            value=""
                          >
                            <option value="">+ Assign subject...</option>
                            {unassignedSubjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        )}
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
        <TeacherDetailModal
          teacherId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}
