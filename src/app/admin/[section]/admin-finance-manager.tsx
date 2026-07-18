"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FeeGroup = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  feeItemCount?: number;
};

type FeeItem = {
  id: string;
  feeGroupId: string;
  feeGroupName: string;
  name: string;
  category: string;
  classId?: string | null;
  className?: string | null;
  armId?: string | null;
  armName?: string | null;
  sessionId: string;
  sessionName: string;
  termId: string;
  termName: string;
  description?: string | null;
  amount: number;
  isOptional: boolean;
  dueDate?: string | null;
  sortOrder: number;
  isActive: boolean;
};

type Option = { id: string; name: string };
type TermOption = { id: string; name: string; sessionId: string };
type ArmOption = { id: string; name: string; classId: string };

const emptyGroup = {
  name: "",
  code: "",
  description: "",
  isActive: true,
};

const emptyItem = {
  feeGroupId: "",
  name: "",
  category: "",
  classId: "",
  armId: "",
  sessionId: "",
  termId: "",
  description: "",
  amount: "",
  isOptional: false,
  dueDate: "",
  sortOrder: "0",
  isActive: true,
};

export function AdminFinanceManager() {
  const [groups, setGroups] = useState<FeeGroup[]>([]);
  const [items, setItems] = useState<FeeItem[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [arms, setArms] = useState<ArmOption[]>([]);
  const [status, setStatus] = useState("");
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [groupEditingId, setGroupEditingId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [itemEditingId, setItemEditingId] = useState<string | null>(null);

  const filteredTerms = useMemo(
    () => terms.filter((term) => !itemForm.sessionId || term.sessionId === itemForm.sessionId),
    [terms, itemForm.sessionId]
  );

  const filteredArms = useMemo(
    () => arms.filter((arm) => !itemForm.classId || arm.classId === itemForm.classId),
    [arms, itemForm.classId]
  );

  const groupedItems = useMemo(() => {
    const map = new Map<string, FeeItem[]>();
    for (const item of items) {
      const key = item.feeGroupName;
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  async function loadGroups() {
    const response = await fetch("/api/admin/finance/fee-groups", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as { groups?: FeeGroup[]; error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to load fee groups.");
      return;
    }
    setGroups(payload.groups ?? []);
  }

  async function loadItems() {
    const response = await fetch("/api/admin/finance/fee-items", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as {
      items?: FeeItem[];
      classes?: Option[];
      sessions?: Option[];
      terms?: TermOption[];
      arms?: ArmOption[];
      error?: string;
    };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to load fee items.");
      return;
    }

    setItems(payload.items ?? []);
    setClasses(payload.classes ?? []);
    setSessions(payload.sessions ?? []);
    setTerms(payload.terms ?? []);
    setArms(payload.arms ?? []);
  }

  async function refreshAll() {
    await Promise.all([loadGroups(), loadItems()]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([loadGroups(), loadItems()]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submitGroup() {
    setStatus("");
    const response = await fetch(groupEditingId ? `/api/admin/finance/fee-groups/${groupEditingId}` : "/api/admin/finance/fee-groups", {
      method: groupEditingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupForm),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to save fee group.");
      return;
    }
    setGroupForm(emptyGroup);
    setGroupEditingId(null);
    setStatus("Fee group saved.");
    await refreshAll();
  }

  async function archiveGroup(id: string) {
    setStatus("");
    const response = await fetch(`/api/admin/finance/fee-groups/${id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to archive fee group.");
      return;
    }
    setStatus("Fee group archived.");
    await refreshAll();
  }

  async function submitItem() {
    setStatus("");
    const body = {
      ...itemForm,
      amount: Number(itemForm.amount || 0),
      sortOrder: Number(itemForm.sortOrder || 0),
      classId: itemForm.classId || null,
      armId: itemForm.armId || null,
      dueDate: itemForm.dueDate || null,
    };
    const response = await fetch(itemEditingId ? `/api/admin/finance/fee-items/${itemEditingId}` : "/api/admin/finance/fee-items", {
      method: itemEditingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to save fee item.");
      return;
    }
    setItemForm(emptyItem);
    setItemEditingId(null);
    setStatus("Fee item saved.");
    await refreshAll();
  }

  async function archiveItem(id: string) {
    setStatus("");
    const response = await fetch(`/api/admin/finance/fee-items/${id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "Unable to archive fee item.");
      return;
    }
    setStatus("Fee item archived.");
    await refreshAll();
  }

  return (
    <div className="space-y-4">
      {status ? <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{status}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Fee Groups</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setGroupEditingId(null);
                setGroupForm(emptyGroup);
              }}
            >
              New Group
            </Button>
          </div>

          <div className="grid gap-2">
            <Input value={groupForm.name} onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Group name" />
            <Input value={groupForm.code} onChange={(event) => setGroupForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="Code/slug (optional)" />
            <Textarea value={groupForm.description} onChange={(event) => setGroupForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description (optional)" />
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={groupForm.isActive} onChange={(event) => setGroupForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              Active
            </label>
            <Button onClick={submitGroup}>{groupEditingId ? "Update Group" : "Create Group"}</Button>
          </div>

          <div className="mt-4 space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="rounded-lg border border-slate-200 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{group.name}</p>
                    <p className="text-xs text-slate-600">{group.code} • {group.isActive ? "Active" : "Archived"} • {group.feeItemCount ?? 0} items</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setGroupEditingId(group.id);
                        setGroupForm({
                          name: group.name,
                          code: group.code,
                          description: group.description ?? "",
                          isActive: group.isActive,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    {group.isActive ? (
                      <Button size="sm" variant="outline" onClick={() => archiveGroup(group.id)}>
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Fee Items</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setItemEditingId(null);
                setItemForm(emptyItem);
              }}
            >
              New Item
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={itemForm.feeGroupId} onChange={(event) => setItemForm((prev) => ({ ...prev, feeGroupId: event.target.value }))}>
              <option value="">Select fee group</option>
              {groups.filter((group) => group.isActive).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
            <Input value={itemForm.name} onChange={(event) => setItemForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Fee item name" />
            <Input value={itemForm.category} onChange={(event) => setItemForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Category" />
            <Input type="number" value={itemForm.amount} onChange={(event) => setItemForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="Amount" />

            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={itemForm.sessionId} onChange={(event) => setItemForm((prev) => ({ ...prev, sessionId: event.target.value, termId: "" }))}>
              <option value="">Select session</option>
              {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={itemForm.termId} onChange={(event) => setItemForm((prev) => ({ ...prev, termId: event.target.value }))}>
              <option value="">Select term</option>
              {filteredTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
            </select>

            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={itemForm.classId} onChange={(event) => setItemForm((prev) => ({ ...prev, classId: event.target.value, armId: "" }))}>
              <option value="">All classes</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={itemForm.armId} onChange={(event) => setItemForm((prev) => ({ ...prev, armId: event.target.value }))}>
              <option value="">All arms</option>
              {filteredArms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>

            <Input type="date" value={itemForm.dueDate} onChange={(event) => setItemForm((prev) => ({ ...prev, dueDate: event.target.value }))} placeholder="Due date" />
            <Input type="number" value={itemForm.sortOrder} onChange={(event) => setItemForm((prev) => ({ ...prev, sortOrder: event.target.value }))} placeholder="Sort order" />
          </div>

          <Textarea className="mt-2" value={itemForm.description} onChange={(event) => setItemForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" />

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={itemForm.isOptional} onChange={(event) => setItemForm((prev) => ({ ...prev, isOptional: event.target.checked }))} />
              Optional fee
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={itemForm.isActive} onChange={(event) => setItemForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              Active
            </label>
          </div>

          <Button className="mt-2" onClick={submitItem}>{itemEditingId ? "Update Fee Item" : "Create Fee Item"}</Button>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Fee Structure (Grouped)</h3>

        <div className="space-y-3">
          {groupedItems.map(([groupName, groupItems]) => (
            <div key={groupName} className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">{groupName}</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="px-2 py-2">Item</th>
                      <th className="px-2 py-2">Class/Arm</th>
                      <th className="px-2 py-2">Session/Term</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Due</th>
                      <th className="px-2 py-2">Mode</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-2 py-2">
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.description ?? item.category}</p>
                        </td>
                        <td className="px-2 py-2">{item.className ?? "All classes"}{item.armName ? ` / ${item.armName}` : ""}</td>
                        <td className="px-2 py-2">{item.sessionName} / {item.termName}</td>
                        <td className="px-2 py-2">{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(item.amount)}</td>
                        <td className="px-2 py-2">{item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-GB") : "-"}</td>
                        <td className="px-2 py-2">{item.isOptional ? "Optional" : "Mandatory"}</td>
                        <td className="px-2 py-2">{item.isActive ? "Active" : "Archived"}</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setItemEditingId(item.id);
                                setItemForm({
                                  feeGroupId: item.feeGroupId,
                                  name: item.name,
                                  category: item.category,
                                  classId: item.classId ?? "",
                                  armId: item.armId ?? "",
                                  sessionId: item.sessionId,
                                  termId: item.termId,
                                  description: item.description ?? "",
                                  amount: String(item.amount),
                                  isOptional: item.isOptional,
                                  dueDate: item.dueDate ? item.dueDate.slice(0, 10) : "",
                                  sortOrder: String(item.sortOrder),
                                  isActive: item.isActive,
                                });
                              }}
                            >
                              Edit
                            </Button>
                            {item.isActive ? (
                              <Button size="sm" variant="outline" onClick={() => archiveItem(item.id)}>
                                Archive
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
