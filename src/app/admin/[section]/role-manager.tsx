"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Role = {
  id: string;
  name: string;
  label?: string | null;
  description: string | null;
  createdAt: string;
};

type Privilege = {
  id: string;
  code: string;
  name: string;
  category: string;
  isGranted: boolean;
};

function isSuccessStatus(text: string) {
  return text.includes("success") || text.includes("updated") || text.includes("saved");
}

export function RoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedRole = useMemo(
    () => roles.find((r) => String(r.id) === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  const categories = useMemo(() => {
    const cats = new Set(privileges.map((p) => p.category));
    return Array.from(cats).sort();
  }, [privileges]);

  const groupedPrivileges = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = privileges.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
    const map: Record<string, Privilege[]> = {};
    for (const p of filtered) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [privileges, searchQuery]);

  const loadRoles = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/roles", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const list = (payload.roles ?? []) as Role[];
        setRoles(list);
        // Default to the first editable role (skip SUPER_ADMIN)
        const firstEditable = list.find((r) => r.name !== "SUPER_ADMIN");
        if (firstEditable && !selectedRoleId) {
          setSelectedRoleId(String(firstEditable.id));
        }
      }
    } catch {
      // ignore
    }
  }, [selectedRoleId]);

  const loadRolePrivileges = useCallback(async (roleId: string) => {
    if (!roleId) return;
    try {
      const response = await fetch(`/api/admin/roles/privileges?roleId=${roleId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setPrivileges((payload.privileges ?? []) as Privilege[]);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus("");
    await loadRoles();
    setLoading(false);
  }, [loadRoles]);

  useEffect(() => {
    const timer = setTimeout(() => void loadData(), 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!selectedRoleId) {
      const timer = setTimeout(() => setPrivileges([]), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => void loadRolePrivileges(selectedRoleId), 0);
    return () => clearTimeout(timer);
  }, [selectedRoleId, loadRolePrivileges]);

  async function seedDefaults() {
    setStatus("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/privileges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setStatus(payload?.error ?? "Failed to seed defaults.");
        return;
      }
      setStatus("Defaults seeded successfully.");
      await loadData();
      if (selectedRoleId) await loadRolePrivileges(selectedRoleId);
    } catch {
      setStatus("An error occurred while seeding.");
    } finally {
      setLoading(false);
    }
  }

  async function togglePrivilege(privilegeId: string, isGranted: boolean) {
    if (!selectedRoleId || selectedRole?.name === "SUPER_ADMIN") return;
    setStatus("");
    setPrivileges((prev) =>
      prev.map((p) => (String(p.id) === privilegeId ? { ...p, isGranted } : p))
    );
    try {
      const response = await fetch("/api/admin/roles/privileges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: selectedRoleId, privilegeId, isGranted }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setStatus(payload?.error ?? "Failed to update privilege.");
        await loadRolePrivileges(selectedRoleId);
        return;
      }
      setStatus("Privilege updated.");
    } catch {
      setStatus("An error occurred.");
      await loadRolePrivileges(selectedRoleId);
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading roles...</div>;
  }

  return (
    <div className="space-y-4">
      {status ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            isSuccessStatus(status)
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {status}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Choose a role, then toggle the privileges it should have. Super Admin is always full access.
        </p>
        <Button size="sm" variant="outline" onClick={seedDefaults} disabled={loading}>
          Seed Default Roles & Privileges
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Select Role</h3>
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {roles.length === 0 ? (
              <p className="text-sm text-slate-500">No roles found.</p>
            ) : (
              roles.map((r) => {
                const isSuperAdmin = r.name === "SUPER_ADMIN";
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleId(String(r.id))}
                    disabled={isSuperAdmin}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedRoleId === String(r.id)
                        ? "bg-blue-50 text-blue-700"
                        : isSuperAdmin
                        ? "cursor-not-allowed text-slate-400"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-medium">{r.label ?? r.name}</div>
                    <div className="text-xs text-slate-500">
                      {isSuperAdmin ? "Full access (locked)" : r.description ?? "—"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            {selectedRole ? `Privileges: ${selectedRole.label ?? selectedRole.name}` : "Privileges"}
          </h3>

          {selectedRole?.name === "SUPER_ADMIN" ? (
            <p className="text-sm text-slate-500">
              Super Admin always has full access. Individual privileges cannot be changed.
            </p>
          ) : selectedRole ? (
            <div className="space-y-4">
              <Input
                placeholder="Search privileges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
              <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const items = groupedPrivileges[cat] ?? [];
                  if (!items.length) return null;
                  return (
                    <div key={cat}>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {cat}
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {items.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                          >
                            <div>
                              <div className="text-sm font-medium text-slate-800">{p.name}</div>
                              <div className="text-xs text-slate-500">{p.code}</div>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={p.isGranted}
                                onChange={(e) => togglePrivilege(String(p.id), e.target.checked)}
                                className="peer sr-only"
                              />
                              <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a role to view and edit its privileges.</p>
          )}
        </div>
      </div>
    </div>
  );
}
