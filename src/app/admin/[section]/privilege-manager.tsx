"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Privilege = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  roleName: string;
};

type UserPrivilege = Privilege & {
  privilegeId: string;
  roleDefault: boolean;
  isGranted: boolean;
  hasOverride: boolean;
};

export function PrivilegeManager() {
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userPrivileges, setUserPrivileges] = useState<UserPrivilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const activePrivileges = useMemo(
    () => (selectedUserId ? userPrivileges : privileges),
    [selectedUserId, userPrivileges, privileges]
  );

  const categories = useMemo(() => {
    const cats = new Set(activePrivileges.map((p) => p.category));
    return Array.from(cats).sort();
  }, [activePrivileges]);

  const groupedPrivileges = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = privileges.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
    const map: Record<string, Privilege[]> = {};
    for (const p of filtered) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [privileges, searchQuery]);

  const groupedUserPrivileges = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = userPrivileges.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
    const map: Record<string, UserPrivilege[]> = {};
    for (const p of filtered) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [userPrivileges, searchQuery]);

  const loadPrivileges = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/privileges", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setPrivileges(payload.privileges ?? []);
    } catch {
      // ignore
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setUsers(payload.users ?? []);
    } catch {
      // ignore
    }
  }, []);

  const loadUserPrivileges = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/admin/users/privileges?userId=${userId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setUserPrivileges(payload.privileges ?? []);
    } catch {
      // ignore
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus("");
    await Promise.all([loadPrivileges(), loadUsers()]);
    setLoading(false);
  }, [loadPrivileges, loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => void loadData(), 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    if (!selectedUserId) return;
    let cancelled = false;
    fetch(`/api/admin/users/privileges?userId=${selectedUserId}`, { cache: "no-store" })
      .then((r) => r.json().catch(() => ({})))
      .then((payload) => {
        if (!cancelled) setUserPrivileges(payload.privileges ?? []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedUserId]);

  const userPrivMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const up of userPrivileges) {
      map[up.privilegeId] = up.isGranted;
    }
    return map;
  }, [userPrivileges]);

  async function togglePrivilege(privilegeId: string, isGranted: boolean) {
    if (!selectedUserId) return;
    setStatus("");
    try {
      const response = await fetch("/api/admin/users/privileges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, privilegeId, isGranted }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setStatus(payload?.error ?? "Failed to update privilege.");
        return;
      }
      await loadUserPrivileges(selectedUserId);
      setStatus("Privilege updated.");
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function seedPrivileges() {
    setStatus("");
    try {
      const response = await fetch("/api/admin/privileges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to seed privileges.");
        return;
      }
      setStatus("Privileges seeded successfully. Refreshing...");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading privileges...</div>;
  }

  return (
    <div className="space-y-4">
      {status ? (
        <div className={`rounded-lg border px-3 py-2 text-sm ${status.includes("success") || status.includes("seeded") || status.includes("updated") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search privileges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="flex items-center gap-3">
          <Link
            href="/admin/roles"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Manage role privileges →
          </Link>
          <Button size="sm" variant="outline" onClick={seedPrivileges}>Seed Default Privileges</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Select User</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-sm text-slate-500">No users found.</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedUserId === u.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"}`}
                >
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email} · {u.roleName}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            {selectedUserId ? "Assign Privileges" : "All Privileges"}
          </h3>
          {selectedUserId ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {categories.map((cat) => {
                const items = groupedUserPrivileges[cat] ?? [];
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{cat}</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map((p: UserPrivilege) => {
                        const label = p.hasOverride
                          ? (p.isGranted ? "Overridden: granted" : "Overridden: denied")
                          : (p.roleDefault ? "Role default: granted" : "Role default: denied");
                        const labelColor = p.hasOverride
                          ? (p.isGranted ? "text-emerald-600" : "text-rose-600")
                          : (p.roleDefault ? "text-blue-500" : "text-slate-400");
                        return (
                          <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                            <div>
                              <div className="text-sm font-medium text-slate-800">{p.name}</div>
                              <div className="text-xs text-slate-500">{p.code}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${labelColor}`}>
                                {label}
                              </span>
                              <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                  type="checkbox"
                                  checked={p.isGranted}
                                  onChange={(e) => togglePrivilege(p.id, e.target.checked)}
                                  className="peer sr-only"
                                />
                                <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {categories.map((cat) => {
                const items = groupedPrivileges[cat] ?? [];
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{cat}</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map((p) => (
                        <div key={p.id} className="rounded-lg border border-slate-100 px-3 py-2">
                          <div className="text-sm font-medium text-slate-800">{p.name}</div>
                          <div className="text-xs text-slate-500">{p.code}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
