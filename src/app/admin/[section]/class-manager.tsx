"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClassItem = {
  id: string;
  name: string;
  classGroupId: string | null;
  classGroupName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  arms: { id: string; name: string; isActive: boolean; teacherId: string | null; teacherName: string | null }[];
  students: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  assessments: { id: string; name: string; fromGroup?: boolean }[];
  studentCount: number;
  createdAt: string;
};

type Option = { id: string; name: string };

const emptyClass = {
  name: "",
  classGroupId: "",
  armIds: [] as string[],
  assessmentIds: [] as string[],
};

export function ClassManager() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classGroups, setClassGroups] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [presetArms, setPresetArms] = useState<{ id: string; name: string; capacity: number | null }[]>([]);
  const [presetAssessments, setPresetAssessments] = useState<{ id: string; name: string; headings?: any[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(emptyClass);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const query = searchQuery.toLowerCase();
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.classGroupName?.toLowerCase().includes(query) ||
        c.teacherName?.toLowerCase().includes(query)
    );
  }, [classes, searchQuery]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const [classesRes, armsRes, assessmentsRes] = await Promise.all([
        fetch("/api/admin/classes", { cache: "no-store" }),
        fetch("/api/admin/class-arms?preset=1", { cache: "no-store" }),
        fetch("/api/admin/assessments", { cache: "no-store" }),
      ]);
      const payload = await classesRes.json().catch(() => ({}));
      const armsPayload = await armsRes.json().catch(() => ({}));
      const assessmentsPayload = await assessmentsRes.json().catch(() => ({}));
      if (!classesRes.ok) {
        setStatus(typeof payload?.error === "object" ? JSON.stringify(payload.error) : (payload?.error ?? "Unable to load classes."));
        return;
      }
      setClasses(payload.classes ?? []);
      setClassGroups(payload.classGroups ?? []);
      setTeachers(payload.teachers ?? []);
      setSubjects(payload.subjects ?? []);
      setPresetArms(armsPayload.arms ?? []);
      setPresetAssessments(assessmentsPayload.assessments ?? []);
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
    if (!form.name.trim()) {
      setStatus("Class name is required.");
      return;
    }
    if (!form.classGroupId) {
      setStatus("Class group is required.");
      return;
    }
    setSubmitting(true);

    const isEditing = editingId !== null;
    const body = isEditing
      ? { name: form.name.trim(), classGroupId: form.classGroupId, armIds: form.armIds, assessmentIds: form.assessmentIds }
      : { name: form.name.trim(), classGroupId: form.classGroupId, armIds: form.armIds, assessmentIds: form.assessmentIds };

    const url = isEditing ? `/api/admin/classes/${editingId}` : "/api/admin/classes";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(typeof payload?.error === "object" ? JSON.stringify(payload.error) : (payload?.error ?? `Failed to ${isEditing ? "update" : "create"} class.`));
        return;
      }

      setForm({ name: "", classGroupId: "", armIds: [] as string[], assessmentIds: [] as string[] });
      setEditingId(null);
      setStatus(`Class ${isEditing ? "updated" : "created"} successfully.`);
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignSubject(classId: string, subjectId: string) {
    setStatus("");
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, action: "ADD_SUBJECT" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(typeof payload?.error === "object" ? JSON.stringify(payload.error) : (payload?.error ?? "Failed to add subject."));
        return;
      }

      setStatus("Subject added to class successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleRemoveSubject(classId: string, subjectId: string) {
    if (!window.confirm("Remove this subject from the class?")) return;

    setStatus("");
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, action: "REMOVE_SUBJECT" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(typeof payload?.error === "object" ? JSON.stringify(payload.error) : (payload?.error ?? "Failed to remove subject."));
        return;
      }

      setStatus("Subject removed from class successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleAssignTeacher(classId: string, teacherId: string) {
    setStatus("");
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(typeof payload?.error === "object" ? JSON.stringify(payload.error) : (payload?.error ?? "Failed to assign teacher."));
        return;
      }

      setStatus("Teacher assigned successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleAssignArmTeacher(classId: string, armId: string, teacherId: string) {
    setStatus("");
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ armId, teacherId, action: "ASSIGN_ARM_TEACHER" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(typeof payload?.error === "object" ? JSON.stringify(payload.error) : (payload?.error ?? "Failed to assign arm teacher."));
        return;
      }

      setStatus("Arm teacher assigned successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete class "${name}"? This cannot be undone.`)) {
      return;
    }

    setStatus("");
    try {
      const response = await fetch(`/api/admin/classes/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(typeof payload?.error === "object" ? JSON.stringify(payload.error) : (payload?.error ?? "Failed to delete class."));
        return;
      }

      setStatus("Class deleted.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  function startEdit(cls: ClassItem) {
    setEditingId(cls.id);
    // Match current class arms to preset arms by name for checkbox state
    const activeArmNames = new Set(cls.arms.filter((a) => a.isActive).map((a) => a.name));
    const matchedArmIds = presetArms
      .filter((p) => activeArmNames.has(p.name))
      .map((p) => String(p.id));
    setForm({
      name: cls.name,
      classGroupId: cls.classGroupId ? String(cls.classGroupId) : "",
      armIds: matchedArmIds,
      assessmentIds: cls.assessments?.map((a) => String(a.id)) ?? [],
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", classGroupId: "", armIds: [] as string[], assessmentIds: [] as string[] });
    setStatus("");
  }

  // Get unassigned subjects for a class
  const getUnassignedSubjects = (cls: ClassItem) => {
    const assignedIds = new Set(cls.subjects.map((s) => s.id));
    return subjects.filter((s) => !assignedIds.has(s.id));
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading classes...</div>;
  }

  return (
    <div className="space-y-4">
      {status ? (
        <div className={`rounded-lg border px-3 py-2 text-sm ${String(status).includes("success") || String(status).includes("created") || String(status).includes("updated") || String(status).includes("added") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {String(status)}
        </div>
      ) : null}

      {/* Search and Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, group, or teacher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingId(null);
            setForm({ name: "", classGroupId: "", armIds: [] as string[], assessmentIds: [] as string[] });
            setStatus("");
          }}
        >
          + New Class
        </Button>
      </div>

      {/* Class Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          {editingId ? "Edit Class" : "Add New Class"}
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Class name * (e.g., JSS 1, SS 2)"
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.classGroupId}
            onChange={(e) => setForm((prev) => ({ ...prev, classGroupId: e.target.value }))}
          >
            <option value="">Select class group *</option>
            {classGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        {presetArms.length > 0 && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Arms (select applicable)</label>
            <div className="flex flex-wrap gap-2">
              {presetArms.map((arm) => (
                <label
                  key={arm.id}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    form.armIds.includes(arm.id)
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={form.armIds.includes(arm.id)}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        armIds: e.target.checked
                          ? [...prev.armIds, arm.id]
                          : prev.armIds.filter((id) => id !== arm.id),
                      }));
                    }}
                  />
                  {arm.name}
                  {arm.capacity !== null && (
                    <span className="text-xs text-slate-400">({arm.capacity})</span>
                  )}
                </label>
              ))}
            </div>
            {presetArms.length === 0 && (
              <p className="text-xs text-slate-400">No preset arms available. Create arms in the Arms section first.</p>
            )}
          </div>
        )}

        {presetAssessments.length > 0 && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Assessments (select applicable)</label>
            <div className="flex flex-wrap gap-2">
              {presetAssessments.map((assessment) => (
                <label
                  key={assessment.id}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    form.assessmentIds.includes(assessment.id)
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    checked={form.assessmentIds.includes(assessment.id)}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        assessmentIds: e.target.checked
                          ? [...prev.assessmentIds, assessment.id]
                          : prev.assessmentIds.filter((id) => id !== assessment.id),
                      }));
                    }}
                  />
                  {assessment.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (editingId ? "Updating..." : "Creating...") : editingId ? "Update Class" : "Create Class"}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Classes Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Classes ({filteredClasses.length} of {classes.length})
        </h3>
        <div className="space-y-4">
          {filteredClasses.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No classes found.</p>
          ) : (
            filteredClasses.map((cls) => (
              <div key={cls.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-slate-900">{cls.name}</h4>
                    <p className="text-xs text-slate-500">
                      {cls.classGroupName ? `Group: ${cls.classGroupName}` : "No group assigned"}
                      {" • "}
                      {cls.teacherName ? `Teacher: ${cls.teacherName}` : "No class teacher"}
                      {" • "}
                      {cls.studentCount} students
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => startEdit(cls)}>
                      Edit
                    </Button>
                    {cls.studentCount === 0 && (
                      <Button size="sm" variant="outline" onClick={() => handleDelete(cls.id, cls.name)}>
                        Delete
                      </Button>
                    )}
                    <select
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      value={cls.teacherId ?? ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          void handleAssignTeacher(cls.id, e.target.value);
                        }
                      }}
                    >
                      <option value="">{cls.teacherId ? "Change teacher..." : "Assign teacher..."}</option>
                      {teachers
                        .filter((t) => t.id !== cls.teacherId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Arms Section */}
                <div className="mt-3 border-t border-slate-100 pt-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-slate-600">Arms:</span>
                    {cls.arms.filter((a) => a.isActive).length === 0 ? (
                      <span className="text-xs text-slate-400">No arms</span>
                    ) : (
                      cls.arms
                        .filter((a) => a.isActive)
                        .map((arm) => (
                          <div key={arm.id} className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {arm.name}
                            </span>
                            <select
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
                              value={arm.teacherId ?? ""}
                              onChange={(e) => handleAssignArmTeacher(cls.id, arm.id, e.target.value)}
                            >
                              <option value="">Select teacher...</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            {arm.teacherName && (
                              <span className="text-[10px] text-slate-400">{arm.teacherName}</span>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Assessments Section */}
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Assessments:</span>
                    {cls.assessments?.length === 0 ? (
                      <span className="text-xs text-slate-400">No assessments</span>
                    ) : (
                      cls.assessments.map((assessment, idx) => (
                        <span
                          key={assessment.id ?? `assessment-${idx}`}
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
                            assessment.fromGroup
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {assessment.name}
                          {assessment.fromGroup && (
                            <span className="text-[10px] text-amber-500">(group)</span>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Subjects Section */}
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Subjects:</span>
                    {cls.subjects.length === 0 ? (
                      <span className="text-xs text-slate-400">No subjects</span>
                    ) : (
                      cls.subjects.map((subj) => (
                        <span
                          key={subj.id}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs"
                        >
                          {subj.name}
                          <button
                            onClick={() => handleRemoveSubject(cls.id, subj.id)}
                            className="text-rose-500 hover:text-rose-700"
                            title="Remove subject"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                    {getUnassignedSubjects(cls).length > 0 && (
                      <select
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        onChange={(e) => {
                          if (e.target.value) {
                            void handleAssignSubject(cls.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        value=""
                      >
                        <option value="">+ Add subject...</option>
                        {getUnassignedSubjects(cls).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
