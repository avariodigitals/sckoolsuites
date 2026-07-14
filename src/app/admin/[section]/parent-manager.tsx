"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ParentDetailModal } from "./parent-detail-modal";

type Parent = {
  id: string;
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  children: { id: string; name: string }[];
};

type StudentOption = { id: string; name: string };

const emptyParent = {
  name: "",
  email: "",
  password: "",
};

export function ParentManager() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [unlinkedStudents, setUnlinkedStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(emptyParent);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unlinkingStudentId, setUnlinkingStudentId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return parents;
    const query = searchQuery.toLowerCase();
    return parents.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.children.some((c) => c.name.toLowerCase().includes(query))
    );
  }, [parents, searchQuery]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/parents", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Unable to load parents.");
        return;
      }
      setParents(payload.parents ?? []);
      setUnlinkedStudents(payload.unlinkedStudents ?? []);
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

    const body = { ...form };

    const isEditing = editingId !== null;
    const url = isEditing ? `/api/admin/parents/${editingId}` : "/api/admin/parents";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? `Failed to ${isEditing ? "update" : "create"} parent.`);
        return;
      }

      setForm(emptyParent);
      setEditingId(null);
      setStatus(`Parent ${isEditing ? "updated" : "created"} successfully.`);
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLinkStudent(parentId: string, studentId: string) {
    setStatus("");
    try {
      const response = await fetch(`/api/admin/parents/${parentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action: "LINK" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to link student.");
        return;
      }

      setStatus("Student linked successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleUnlinkStudent(parentId: string, studentId: string) {
    if (!window.confirm("Unlink this student from the parent?")) return;

    setStatus("");
    setUnlinkingStudentId(studentId);
    try {
      const response = await fetch(`/api/admin/parents/${parentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action: "UNLINK" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to unlink student.");
        return;
      }

      setStatus("Student unlinked successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setUnlinkingStudentId(null);
    }
  }

  async function handleResend(id: string, name: string) {
    if (!window.confirm(`Resend welcome email with a new temporary password to ${name}?`)) return;
    setStatus("");
    try {
      const response = await fetch(`/api/admin/parents/${id}/resend`, { method: "POST" });
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
    if (!window.confirm(`Deactivate ${name}? They will no longer be able to log in.`)) {
      return;
    }

    setStatus("");
    try {
      const response = await fetch(`/api/admin/parents/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to deactivate parent.");
        return;
      }

      setStatus("Parent deactivated.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleHardDelete(id: string, name: string) {
    if (!window.confirm(`Permanently DELETE ${name}? This will remove the parent and their user account. This cannot be undone.`)) {
      return;
    }

    setStatus("");
    try {
      const response = await fetch(`/api/admin/parents/${id}?permanent=true`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to delete parent.");
        return;
      }

      setStatus("Parent permanently deleted.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  function startEdit(parent: Parent) {
    setEditingId(parent.id);
    setForm({
      name: parent.name,
      email: parent.email,
      password: "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyParent);
    setStatus("");
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading parents...</div>;
  }

  return (
    <div className="space-y-4">
      {status ? (
        <div className={`rounded-lg border px-3 py-2 text-sm ${typeof status === "string" && (status.includes("success") || status.includes("created") || status.includes("updated") || status.includes("linked")) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {typeof status === "string" ? status : JSON.stringify(status)}
        </div>
      ) : null}

      {/* Search and Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, email, or child's name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingId(null);
            setForm(emptyParent);
            setStatus("");
          }}
        >
          + New Parent
        </Button>
      </div>

      {/* Parent Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          {editingId ? "Edit Parent" : "Add New Parent"}
        </h3>
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
          {!editingId && (
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Password (optional, default: email prefix + 123)"
            />
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (editingId ? "Updating..." : "Creating...") : editingId ? "Update Parent" : "Create Parent"}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Parents Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Parents ({filteredParents.length} of {parents.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Children</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-slate-500">
                    No parents found.
                  </td>
                </tr>
              ) : (
                filteredParents.map((parent) => (
                  <tr key={parent.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-2 font-medium text-slate-900">{parent.name}</td>
                    <td className="px-2 py-2 text-slate-600">{parent.email}</td>
                    <td className="px-2 py-2">
                      {parent.children.length === 0 ? (
                        <span className="text-slate-400">No children linked</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {parent.children.map((child) => (
                            <span key={child.id} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs">
                              {child.name}
                              <button
                                onClick={() => handleUnlinkStudent(parent.id, child.id)}
                                disabled={unlinkingStudentId === child.id}
                                className="text-rose-500 hover:text-rose-700"
                                title="Unlink student"
                              >
                                {unlinkingStudentId === child.id ? "..." : "×"}
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          parent.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {parent.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewingId(parent.id)}>
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(parent)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResend(parent.id, parent.name)}
                        >
                          Resend
                        </Button>
                        {parent.isActive && parent.children.length === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(parent.id, parent.name)}
                          >
                            Deactivate
                          </Button>
                        )}
                        {parent.children.length === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleHardDelete(parent.id, parent.name)}
                          >
                            Delete
                          </Button>
                        )}
                        {unlinkedStudents.length > 0 && (
                          <select
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            onChange={(e) => {
                              if (e.target.value) {
                                void handleLinkStudent(parent.id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                            value=""
                          >
                            <option value="">+ Link student...</option>
                            {unlinkedStudents.map((s) => (
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
        <ParentDetailModal
          parentId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}
