"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Trash2, CheckCircle2, X, Download, BarChart3, Search, Mail } from "lucide-react";

export type Correspondence = {
  id: string;
  refNumber: string;
  senderName: string;
  type: string;
  subject: string;
  description: string;
  senderAddress: string | null;
  status: string;
  createdAt: string;
};

const types = ["INCOMING", "OUTGOING"];
const statuses = ["PENDING", "PROCESSED", "ARCHIVED"];

export function CorrespondenceClient({ schoolId: _schoolId }: { schoolId: string }) {
  const [items, setItems] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showChart, setShowChart] = useState(false);

  const [form, setForm] = useState({ senderName: "", type: "INCOMING", subject: "", description: "", senderAddress: "" });

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reception/correspondence", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch {
      setStatus("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (filterType !== "ALL") result = result.filter((i) => i.type === filterType);
    if (filterStatus !== "ALL") result = result.filter((i) => i.status === filterStatus);
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter((i) => i.senderName.toLowerCase().includes(query) || i.subject.toLowerCase().includes(query));
  }, [items, filterType, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const byType = types.reduce((acc, t) => { acc[t] = items.filter((i) => i.type === t).length; return acc; }, {} as Record<string, number>);
    const byStatus = statuses.reduce((acc, s) => { acc[s] = items.filter((i) => i.status === s).length; return acc; }, {} as Record<string, number>);
    return { total: items.length, byType, byStatus };
  }, [items]);

  function exportToCSV() {
    const headers = ["Ref Number", "Sender", "Type", "Subject", "Status", "Created At"];
    const rows = filtered.map((i) => [i.refNumber, i.senderName, i.type, i.subject, i.status, new Date(i.createdAt).toLocaleDateString()]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `correspondence-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreate() {
    try {
      const res = await fetch("/api/admin/reception/correspondence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setForm({ senderName: "", type: "INCOMING", subject: "", description: "", senderAddress: "" });
      setShowForm(false);
      loadData();
      setStatus("Correspondence recorded.");
    } catch {
      setStatus("Failed to create.");
    }
  }

  async function handleProcess(id: string) {
    try {
      const res = await fetch(`/api/admin/reception/correspondence/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PROCESSED" }),
      });
      if (!res.ok) throw new Error("Failed");
      loadData();
      setStatus("Marked as processed.");
    } catch {
      setStatus("Failed to update.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete?")) return;
    try {
      const res = await fetch(`/api/admin/reception/correspondence/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      loadData();
      setStatus("Deleted.");
    } catch {
      setStatus("Failed to delete.");
    }
  }

  if (loading) {
    loadData();
    return <div className="p-6 text-slate-500">Loading correspondence...</div>;
  }

  return (
    <div className="space-y-6">
      {status && <div className={cn("rounded-lg border px-4 py-3 text-sm flex items-center gap-2", status.includes("Failed") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}><CheckCircle2 className="h-4 w-4" /> {status}</div>}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Total</p><p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Incoming</p><p className="mt-2 text-2xl font-bold text-blue-600">{stats.byType["INCOMING"] || 0}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Outgoing</p><p className="mt-2 text-2xl font-bold text-purple-600">{stats.byType["OUTGOING"] || 0}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Pending</p><p className="mt-2 text-2xl font-bold text-amber-600">{stats.byStatus["PENDING"] || 0}</p></div>
      </div>

      {/* Chart */}
      {showChart && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">By Type</h3>
          <div className="space-y-3">
            {types.map((t) => { const count = stats.byType[t] || 0; const pct = stats.total > 0 ? (count / stats.total) * 100 : 0; return (
              <div key={t} className="flex items-center gap-3">
                <span className="w-24 text-sm text-slate-600">{t}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                <span className="w-10 text-sm font-medium text-slate-900">{count}</span>
              </div>
            ); })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="ALL">All Types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="ALL">All Status</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)}><BarChart3 className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> New Entry</>}</Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h3 className="font-semibold text-slate-900">New Correspondence</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Sender Name *" value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <Input placeholder="Sender Address" value={form.senderAddress} onChange={(e) => setForm({ ...form, senderAddress: e.target.value })} />
            <Input placeholder="Subject *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="md:col-span-2" />
            <textarea placeholder="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!form.senderName.trim() || !form.subject.trim() || !form.description.trim()}>Save</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Correspondence List ({filtered.length})</h2></div>
        {filtered.length === 0 ? <div className="p-8 text-center text-slate-500">No correspondence found</div> : (
          <div className="divide-y divide-slate-100">
            {filtered.map((i) => (
              <div key={i.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">{i.senderName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{i.refNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{i.type}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", i.status === "PENDING" && "bg-amber-100 text-amber-700", i.status === "PROCESSED" && "bg-emerald-100 text-emerald-700", i.status === "ARCHIVED" && "bg-slate-100 text-slate-600")}>{i.status}</span>
                  </div>
                  <p className="text-sm text-slate-600">{i.subject}</p>
                  {i.senderAddress && <p className="text-xs text-slate-500">{i.senderAddress}</p>}
                </div>
                <div className="flex gap-2">
                  {i.status === "PENDING" && <Button size="sm" variant="outline" onClick={() => handleProcess(i.id)}>Process</Button>}
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleDelete(i.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
