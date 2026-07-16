"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Trash2, CheckCircle2, X, Download, BarChart3, Search, HelpCircle } from "lucide-react";

export type Query = { id: string; queryNumber: string; querierName: string; querierContact: string | null; queryType: string; subject: string; description: string; status: string; response: string | null; createdAt: string };
const queryTypes = ["Information", "Clarification", "Complaint", "Suggestion"];
const statuses = ["PENDING", "ANSWERED", "CLOSED"];

export function QueryClient({ schoolId: _schoolId }: { schoolId: string }) {
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showChart, setShowChart] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [form, setForm] = useState({ querierName: "", querierContact: "", queryType: "Information", subject: "", description: "" });

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reception/query", { cache: "no-store" });
      if (res.ok) { const data = await res.json(); setQueries(data.queries ?? []); }
    } catch { setStatus("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  const filtered = useMemo(() => {
    let result = queries;
    if (filterType !== "ALL") result = result.filter((q) => q.queryType === filterType);
    if (filterStatus !== "ALL") result = result.filter((q) => q.status === filterStatus);
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter((q) => q.querierName.toLowerCase().includes(query) || q.subject.toLowerCase().includes(query));
  }, [queries, filterType, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const byType = queryTypes.reduce((acc, t) => { acc[t] = queries.filter((q) => q.queryType === t).length; return acc; }, {} as Record<string, number>);
    const byStatus = statuses.reduce((acc, s) => { acc[s] = queries.filter((q) => q.status === s).length; return acc; }, {} as Record<string, number>);
    return { total: queries.length, byType, byStatus };
  }, [queries]);

  function exportToCSV() {
    const headers = ["Query Number", "Querier", "Type", "Subject", "Status", "Created At"];
    const rows = filtered.map((q) => [q.queryNumber, q.querierName, q.queryType, q.subject, q.status, new Date(q.createdAt).toLocaleDateString()]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `queries-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreate() {
    try {
      const res = await fetch("/api/admin/reception/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Failed");
      setForm({ querierName: "", querierContact: "", queryType: "Information", subject: "", description: "" });
      setShowForm(false);
      loadData();
      setStatus("Query submitted.");
    } catch { setStatus("Failed to create."); }
  }

  async function handleRespond(id: string) {
    try {
      const res = await fetch(`/api/admin/reception/query/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ANSWERED", response }) });
      if (!res.ok) throw new Error("Failed");
      setRespondingId(null);
      setResponse("");
      loadData();
      setStatus("Response saved.");
    } catch { setStatus("Failed to respond."); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete?")) return;
    try {
      const res = await fetch(`/api/admin/reception/query/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      loadData();
      setStatus("Deleted.");
    } catch { setStatus("Failed to delete."); }
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) { return <div className="p-6 text-slate-500">Loading queries...</div>; }

  return (
    <div className="space-y-6">
      {status && <div className={cn("rounded-lg border px-4 py-3 text-sm flex items-center gap-2", status.includes("Failed") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}><CheckCircle2 className="h-4 w-4" /> {status}</div>}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Total</p><p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Pending</p><p className="mt-2 text-2xl font-bold text-amber-600">{stats.byStatus["PENDING"] || 0}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Answered</p><p className="mt-2 text-2xl font-bold text-emerald-600">{stats.byStatus["ANSWERED"] || 0}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Closed</p><p className="mt-2 text-2xl font-bold text-slate-600">{stats.byStatus["CLOSED"] || 0}</p></div>
      </div>
      {showChart && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">By Type</h3>
          <div className="space-y-3">
            {queryTypes.map((t) => { const count = stats.byType[t] || 0; const pct = stats.total > 0 ? (count / stats.total) * 100 : 0; return (
              <div key={t} className="flex items-center gap-3">
                <span className="w-28 text-sm text-slate-600">{t}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                <span className="w-10 text-sm font-medium text-slate-900">{count}</span>
              </div>
            ); })}
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="ALL">All Types</option>
            {queryTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="ALL">All Status</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)}><BarChart3 className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> New Query</>}</Button>
        </div>
      </div>
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h3 className="font-semibold text-slate-900">New Query</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Querier Name *" value={form.querierName} onChange={(e) => setForm({ ...form, querierName: e.target.value })} />
            <Input placeholder="Contact" value={form.querierContact} onChange={(e) => setForm({ ...form, querierContact: e.target.value })} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.queryType} onChange={(e) => setForm({ ...form, queryType: e.target.value })}>{queryTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <Input placeholder="Subject *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="md:col-span-2" />
            <textarea placeholder="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!form.querierName.trim() || !form.subject.trim() || !form.description.trim()}>Save</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Queries ({filtered.length})</h2></div>
        {filtered.length === 0 ? <div className="p-8 text-center text-slate-500">No queries</div> : (
          <div className="divide-y divide-slate-100">
            {filtered.map((q) => (
              <div key={q.id} className="px-6 py-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">{q.querierName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{q.queryNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{q.queryType}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", q.status === "PENDING" && "bg-amber-100 text-amber-700", q.status === "ANSWERED" && "bg-emerald-100 text-emerald-700", q.status === "CLOSED" && "bg-slate-100 text-slate-600")}>{q.status}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleDelete(q.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <p className="text-sm text-slate-600 mb-1">{q.subject}</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{q.description}</p>
                {q.status === "PENDING" && (
                  <div className="mt-3">
                    {respondingId === q.id ? (
                      <div className="flex gap-2">
                        <Input placeholder="Response..." value={response} onChange={(e) => setResponse(e.target.value)} className="flex-1" />
                        <Button size="sm" onClick={() => handleRespond(q.id)}>Respond</Button>
                        <Button size="sm" variant="outline" onClick={() => { setRespondingId(null); setResponse(""); }}>Cancel</Button>
                      </div>
                    ) : <Button size="sm" variant="outline" onClick={() => setRespondingId(q.id)}>Add Response</Button>}
                  </div>
                )}
                {q.response && <p className="text-sm bg-emerald-50 p-2 rounded mt-2 text-emerald-700"><span className="font-medium">Response:</span> {q.response}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
