"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Subject = {
  id: string;
  name: string;
  classId: string | null;
  className: string | null;
  classGroupId: string | null;
  classGroupName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  createdAt: string;
};

type Option = { id: string; name: string };

const emptySubject = {
  name: "",
  classId: "",
  classGroupId: "",
  teacherId: "",
};

export function SubjectManager() {
  const confirm = useConfirm();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [classGroups, setClassGroups] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(emptySubject);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const query = searchQuery.toLowerCase();
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.className?.toLowerCase().includes(query) ||
        s.classGroupName?.toLowerCase().includes(query) ||
        s.teacherName?.toLowerCase().includes(query)
    );
  }, [subjects, searchQuery]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/subjects", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Unable to load subjects.");
        return;
      }
      setSubjects(payload.subjects ?? []);
      setClasses(payload.classes ?? []);
      setClassGroups(payload.classGroups ?? []);
      setTeachers(payload.teachers ?? []);
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
      ...form,
      classId: form.classId || null,
      classGroupId: form.classGroupId || null,
      teacherId: form.teacherId || null,
    };

    const isEditing = editingId !== null;
    const url = isEditing ? `/api/admin/subjects/${editingId}` : "/api/admin/subjects";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? `Failed to ${isEditing ? "update" : "create"} subject.`);
        return;
      }

      setForm(emptySubject);
      setEditingId(null);
      setStatus(`Subject ${isEditing ? "updated" : "created"} successfully.`);
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!(await confirm({
      title: "Delete Subject",
      message: `Delete subject "${name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    }))) {
      return;
    }

    setStatus("");
    try {
      const response = await fetch(`/api/admin/subjects/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to delete subject.");
        return;
      }

      setStatus("Subject deleted.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  function startEdit(subject: Subject) {
    setEditingId(subject.id);
    setForm({
      name: subject.name,
      classId: subject.classId ?? "",
      classGroupId: subject.classGroupId ?? "",
      teacherId: subject.teacherId ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptySubject);
    setStatus("");
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading subjects...</div>;
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
          placeholder="Search by name, class, group, or teacher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingId(null);
            setForm(emptySubject);
            setStatus("");
          }}
        >
          + New Subject
        </Button>
      </div>

      {/* Subject Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          {editingId ? "Edit Subject" : "Add New Subject"}
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Subject name * (e.g., Mathematics)"
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.classId}
            onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value }))}
          >
            <option value="">Select class (optional)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.classGroupId}
            onChange={(e) => setForm((prev) => ({ ...prev, classGroupId: e.target.value }))}
          >
            <option value="">Select class group (optional)</option>
            {classGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.teacherId}
            onChange={(e) => setForm((prev) => ({ ...prev, teacherId: e.target.value }))}
          >
            <option value="">Select subject teacher (optional)</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (editingId ? "Updating..." : "Creating...") : editingId ? "Update Subject" : "Create Subject"}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Subjects Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Subjects ({filteredSubjects.length} of {subjects.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Class</th>
                <th className="px-2 py-2">Class Group</th>
                <th className="px-2 py-2">Teacher</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-slate-500">
                    No subjects found.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-2 font-medium text-slate-900">{subject.name}</td>
                    <td className="px-2 py-2 text-slate-600">{subject.className ?? "-"}</td>
                    <td className="px-2 py-2 text-slate-600">{subject.classGroupName ?? "-"}</td>
                    <td className="px-2 py-2 text-slate-600">{subject.teacherName ?? "-"}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => startEdit(subject)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(subject.id, subject.name)}>
                          Delete
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
    </div>
  );
}
