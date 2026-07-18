"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Check, ChevronsUpDown } from "lucide-react";

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

type Option = { id: string; name: string; classGroupId?: string | null };

const emptyForm = {
  name: "",
  classGroupId: "",
  classIds: [] as string[],
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
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

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

  const filteredClasses = useMemo(() => {
    if (!form.classGroupId) return classes;
    return classes.filter((c) => c.classGroupId === form.classGroupId);
  }, [classes, form.classGroupId]);

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

  function toggleClass(id: string) {
    setForm((prev) => ({
      ...prev,
      classIds: prev.classIds.includes(id)
        ? prev.classIds.filter((c) => c !== id)
        : [...prev.classIds, id],
    }));
  }

  function selectAllClasses() {
    setForm((prev) => ({ ...prev, classIds: filteredClasses.map((c) => c.id) }));
  }

  function clearClasses() {
    setForm((prev) => ({ ...prev, classIds: [] }));
  }

  async function handleSubmit() {
    setStatus("");
    setSubmitting(true);

    const isEditing = editingId !== null;

    if (isEditing) {
      const body = {
        name: form.name,
        classId: form.classIds[0] || null,
        classGroupId: form.classGroupId || null,
        teacherId: form.teacherId || null,
      };

      try {
        const response = await fetch(`/api/admin/subjects/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setStatus(payload?.error ?? "Failed to update subject.");
          return;
        }
        setForm(emptyForm);
        setEditingId(null);
        setStatus("Subject updated successfully.");
        await loadData();
      } catch {
        setStatus("An error occurred.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const body = {
      name: form.name,
      classIds: form.classIds.length > 0 ? form.classIds.map(Number) : undefined,
      classGroupId: form.classGroupId || null,
      teacherId: form.teacherId || null,
    };

    try {
      const response = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to create subject.");
        return;
      }
      const count = payload.created ?? 1;
      setForm(emptyForm);
      setStatus(`Subject${count > 1 ? "s" : ""} created successfully (${count} ${count > 1 ? "classes" : "class"}).`);
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
      classGroupId: subject.classGroupId ?? "",
      classIds: subject.classId ? [subject.classId] : [],
      teacherId: subject.teacherId ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setStatus("");
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading subjects...</div>;
  }

  const selectedClassNames = form.classIds
    .map((id) => classes.find((c) => c.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {status ? (
        <div className={`rounded-lg border px-3 py-2 text-sm ${status.includes("success") || status.includes("created") || status.includes("updated") || status.includes("deleted") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      ) : null}

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
            setForm(emptyForm);
            setStatus("");
          }}
        >
          + New Subject
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          {editingId ? "Edit Subject" : "Add New Subject"}
        </h3>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Subject Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Mathematics"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Class Group (optional)</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.classGroupId}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, classGroupId: e.target.value, classIds: [] }));
                }}
              >
                <option value="">All class groups</option>
                {classGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">Select a class group to filter classes below</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Classes {editingId ? "(single class for this subject)" : "(multi-select — subject will be created for each selected class)"}
            </label>

            {editingId ? (
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.classIds[0] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, classIds: e.target.value ? [e.target.value] : [] }))}
              >
                <option value="">No specific class</option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setClassDropdownOpen(!classDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span className="truncate">
                    {selectedClassNames.length > 0
                      ? selectedClassNames.length === 1
                        ? selectedClassNames[0]
                        : `${selectedClassNames.length} classes selected`
                      : "Select classes (leave empty for class group only)"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 text-slate-400" />
                </button>

                {classDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setClassDropdownOpen(false)} />
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                      {filteredClasses.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">
                          {form.classGroupId ? "No classes in this group" : "No classes available"}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
                            <button
                              type="button"
                              onClick={selectAllClasses}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={clearClasses}
                              className="text-xs font-medium text-slate-500 hover:text-slate-700"
                            >
                              Clear
                            </button>
                          </div>
                          {filteredClasses.map((c) => {
                            const checked = form.classIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleClass(c.id)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <div className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`}>
                                  {checked && <Check className="h-3 w-3 text-white" />}
                                </div>
                                {c.name}
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            {form.classIds.length > 0 && !editingId && (
              <div className="mt-2 flex flex-wrap gap-1">
                {form.classIds.map((id) => {
                  const cls = classes.find((c) => c.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                      {cls?.name}
                      <button
                        type="button"
                        onClick={() => toggleClass(id)}
                        className="text-indigo-400 hover:text-indigo-600"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Subject Teacher (optional)</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.teacherId}
              onChange={(e) => setForm((prev) => ({ ...prev, teacherId: e.target.value }))}
            >
              <option value="">No teacher assigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              A subject teacher has access to this subject only. A class teacher has access to the entire class.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting || !form.name.trim()}>
              {submitting ? (editingId ? "Updating..." : "Creating...") : editingId ? "Update Subject" : `Create Subject${form.classIds.length > 1 ? ` (${form.classIds.length} classes)` : ""}`}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

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
