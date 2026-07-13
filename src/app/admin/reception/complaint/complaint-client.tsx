"use client";

import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Trash2, CheckCircle2, X, Download, BarChart3, Search, MessageSquare } from "lucide-react";

export type Complaint = {
  id: string;
  complaintNumber: string;
  complainantName: string;
  complainantType: string;
  complaintType: string;
  subject: string;
  description: string;
  status: string;
  resolution: string | null;
  createdAt: string;
};

const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const types = ["Academic", "Administrative", "Facility", "Other"];
const complainantTypes = ["Parent", "Student", "Staff", "Visitor"];

export function ComplaintClient({ schoolId: _schoolId }: { schoolId: string }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showChart, setShowChart] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  const [form, setForm] = useState({ complainantName: "", complainantType: "Parent", complaintType: "Academic", subject: "", description: "" });

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reception/complaint", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints ?? []);
      }
    } catch {
      setStatus("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    let result = complaints;
    if (filterStatus !== "ALL") result = result.filter((c) => c.status === filterStatus);
    if (filterType !== "ALL") result = result.filter((c) => c.complaintType === filterType);
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter((c) => c.complainantName.toLowerCase().includes(query) || c.subject.toLowerCase().includes(query) || c.complaintNumber.toLowerCase().includes(query));
  }, [complaints, filterStatus, filterType, searchQuery]);

  const stats = useMemo(() => {
    const byStatus = statuses.reduce((acc, s) => { acc[s] = complaints.filter((c) => c.status === s).length; return acc; }, {} as Record<string, number>);
    const byType = types.reduce((acc, t) => { acc[t] = complaints.filter((c) => c.complaintType === t).length; return acc; }, {} as Record<string, number>);
    return { total: complaints.length, byStatus, byType };
  }, [complaints]);

  function exportToCSV() {
    const headers = ["Complaint Number", "Complainant", "Type", "Subject", "Status", "Created At"];
    const rows = filtered.map((c) => [c.complaintNumber, c.complainantName, c.complaintType, c.subject, c.status, new Date(c.createdAt).toLocaleDateString()]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complaints-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreate() {
    try {
      const res = await fetch("/api/admin/reception/complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setForm({ complainantName: "", complainantType: "Parent", complaintType: "Academic", subject: "", description: "" });
      setShowForm(false);
      loadData();
      setStatus("Complaint registered.");
    } catch {
      setStatus("Failed to create.");
    }
  }

  async function handleResolve(id: string) {
    try {
      const res = await fetch(`/api/admin/reception/complaint/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED", resolution }),
      });
      if (!res.ok) throw new Error("Failed");
      setResolvingId(null);
      setResolution("");
      loadData();
      setStatus("Marked as resolved.");
    } catch {
      setStatus("Failed to resolve.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete?")) return;
    try {
      const res = await fetch(`/api/admin/reception/complaint/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      loadData();
      setStatus("Deleted.");
    } catch {
      setStatus("Failed to delete.");
    }
  }

  if (loading) {
    loadData();
    return <div className="p-6 text-slate-500">Loading complaints...</div>;
  }

  return (
    <div className="space-y-6">
      {status && <div className={cn("rounded-lg border px-4 py-3 text-sm flex items-center gap-2", status.includes("Failed") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}><CheckCircle2 className="h-4 w-4" /> {status}</div>}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Total</p><p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Open</p><p className="mt-2 text-2xl font-bold text-rose-600">{stats.byStatus["OPEN"] || 0}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">In Progress</p><p className="mt-2 text-2xl font-bold text-amber-600">{stats.byStatus["IN_PROGRESS"] || 0}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Resolved</p><p className="mt-2 text-2xl font-bold text-emerald-600">{stats.byStatus["RESOLVED"] || 0}</p></div>
      </div>

      {/* Chart */}
      {showChart && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">By Type</h3>
          <div className="space-y-3">
            {types.map((type) => { const count = stats.byType[type] || 0; const pct = stats.total > 0 ? (count / stats.total) * 100 : 0; return (
              <div key={type} className="flex items-center gap-3">
                <span className="w-24 text-sm text-slate-600">{type}</span>
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
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="ALL">All Status</option>
            {statuses.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="ALL">All Types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)}><BarChart3 className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> New Complaint</>}</Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h3 className="font-semibold text-slate-900">New Complaint</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Complainant Name *" value={form.complainantName} onChange={(e) => setForm({ ...form, complainantName: e.target.value })} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.complainantType} onChange={(e) => setForm({ ...form, complainantType: e.target.value })}>{complainantTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.complaintType} onChange={(e) => setForm({ ...form, complaintType: e.target.value })}>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <Input placeholder="Subject *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="md:col-span-2" />
            <textarea placeholder="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!form.complainantName.trim() || !form.subject.trim() || !form.description.trim()}>Save</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Complaints ({filtered.length})</h2></div>
        {filtered.length === 0 ? <div className="p-8 text-center text-slate-500">No complaints found</div> : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <div key={c.id} className="px-6 py-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">{c.complainantName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{c.complaintNumber}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", c.status === "OPEN" && "bg-rose-100 text-rose-700", c.status === "IN_PROGRESS" && "bg-amber-100 text-amber-700", c.status === "RESOLVED" && "bg-emerald-100 text-emerald-700", c.status === "CLOSED" && "bg-slate-100 text-slate-600")}>{c.status.replace("_", " ")}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <p className="text-sm text-slate-600 mb-1">{c.subject}</p>
                <p className="text-xs text-slate-500 mb-2">Type: {c.complaintType} • Complainant: {c.complainantType}</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{c.description}</p>
                {c.status === "OPEN" && (
                  <div className="mt-3">
                    {resolvingId === c.id ? (
                      <div className="flex gap-2">
                        <Input placeholder="Resolution notes..." value={resolution} onChange={(e) => setResolution(e.target.value)} className="flex-1" />
                        <Button size="sm" onClick={() => handleResolve(c.id)}>Resolve</Button>
                        <Button size="sm" variant="outline" onClick={() => { setResolvingId(null); setResolution(""); }}>Cancel</Button>
                      </div>
                    ) : <Button size="sm" variant="outline" onClick={() => setResolvingId(c.id)}>Add Resolution</Button>}
                  </div>
                )}
                {c.resolution && <p className="text-sm bg-emerald-50 p-2 rounded mt-2 text-emerald-700"><span className="font-medium">Resolution:</span> {c.resolution}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
