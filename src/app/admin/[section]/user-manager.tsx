"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { humanizeEnum } from "@/lib/utils";

type User = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
};

type Role = {
  id: string;
  name: string;
};

export function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", roleId: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", roleId: "", isActive: true });

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roleName?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const [uRes, rRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/roles", { cache: "no-store" }),
      ]);
      const uPayload = await uRes.json().catch(() => ({}));
      const rPayload = await rRes.json().catch(() => ({}));
      if (!uRes.ok) {
        setStatus(uPayload?.error ?? "Unable to load users.");
        return;
      }
      setUsers(uPayload.users ?? []);
      setRoles(rPayload.roles ?? []);
    } catch {
      setStatus("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadData(), 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleCreate() {
    setStatus("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to create user.");
        return;
      }
      setForm({ name: "", email: "", password: "", roleId: "" });
      setShowCreate(false);
      setStatus("User created successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend(id: string, name: string) {
    if (!window.confirm(`Resend welcome email with a new temporary password to ${name}?`)) return;
    setStatus("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "POST" });
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

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Deactivate ${name}? They will no longer be able to log in.`)) return;
    setStatus("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to deactivate user.");
        return;
      }
      setStatus("User deactivated.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleUpdate() {
    if (!editingId) return;
    setStatus("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: editForm.name, email: editForm.email, roleId: editForm.roleId, isActive: editForm.isActive }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to update user.");
        return;
      }
      setEditingId(null);
      setStatus("User updated successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditForm({ name: user.name, email: user.email, roleId: user.roleId, isActive: user.isActive });
    setShowCreate(false);
    setStatus("");
  }

  function cancelEdit() {
    setEditingId(null);
    setShowCreate(false);
    setStatus("");
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      {status ? (
        <div className={`rounded-lg border px-3 py-2 text-sm ${status.includes("success") || status.includes("created") || status.includes("updated") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search users by name, email or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button size="sm" variant="outline" onClick={() => { setShowCreate(true); setEditingId(null); setForm({ name: "", email: "", password: "", roleId: "" }); setStatus(""); }}>
          + New User
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Create User</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name *" />
            <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email *" />
            <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Password * (min 6)" />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.roleId} onChange={(e) => setForm((p) => ({ ...p, roleId: e.target.value }))}>
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{humanizeEnum(r.name)}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={submitting || !form.name || !form.email || !form.password || !form.roleId}>Create</Button>
            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
          </div>
        </div>
      )}

      {editingId && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Edit User</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
            <Input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email address" />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={editForm.roleId} onChange={(e) => setEditForm((p) => ({ ...p, roleId: e.target.value }))}>
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{humanizeEnum(r.name)}</option>
              ))}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={String(editForm.isActive)} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.value === "true" }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleUpdate} disabled={submitting}>Update</Button>
            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Email</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Role</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No users found.</td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatarUrl} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          u.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U"
                        )}
                      </div>
                      <span className="font-medium text-slate-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2 text-slate-600">{u.roleName}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(u)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleResend(u.id, u.name)}>Resend</Button>
                      {u.isActive && (
                        <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(u.id, u.name)}>Deactivate</Button>
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
  );
}
