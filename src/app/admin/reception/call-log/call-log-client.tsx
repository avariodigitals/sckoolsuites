"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Trash2, CheckCircle2, X, Download, BarChart3, Search, Phone } from "lucide-react";

export type CallLog = {
  id: string;
  callNumber: string;
  callerName: string;
  callerPhone: string;
  purpose: string;
  recipient: string | null;
  duration: number;
  status: string;
  notes: string | null;
  createdAt: string;
};

const purposes = ["Enquiry", "Complaint", "Follow-up", "Admission", "Fee", "Other"];

export function CallLogClient({ schoolId: _schoolId }: { schoolId: string }) {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPurpose, setFilterPurpose] = useState<string>("ALL");
  const [showChart, setShowChart] = useState(false);

  const [form, setForm] = useState({ callerName: "", callerPhone: "", purpose: "Enquiry", recipient: "", duration: "", notes: "" });

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reception/call-log", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls ?? []);
      }
    } catch {
      setStatus("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    let result = calls;
    if (filterPurpose !== "ALL") result = result.filter((c) => c.purpose === filterPurpose);
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter((c) => c.callerName.toLowerCase().includes(query) || c.callerPhone.toLowerCase().includes(query));
  }, [calls, filterPurpose, searchQuery]);

  const stats = useMemo(() => {
    const byPurpose = purposes.reduce((acc, p) => { acc[p] = calls.filter((c) => c.purpose === p).length; return acc; }, {} as Record<string, number>);
    const totalDuration = calls.reduce((sum, c) => sum + c.duration, 0);
    return { total: calls.length, byPurpose, totalDuration, avgDuration: calls.length > 0 ? Math.round(totalDuration / calls.length) : 0 };
  }, [calls]);

  function exportToCSV() {
    const headers = ["Call Number", "Caller Name", "Phone", "Purpose", "Recipient", "Duration (s)", "Status", "Created At"];
    const rows = filtered.map((c) => [c.callNumber, c.callerName, c.callerPhone, c.purpose, c.recipient || "", c.duration, c.status, new Date(c.createdAt).toLocaleString()]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreate() {
    try {
      const res = await fetch("/api/admin/reception/call-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, duration: parseInt(form.duration) || 0 }),
      });
      if (!res.ok) throw new Error("Failed");
      setForm({ callerName: "", callerPhone: "", purpose: "Enquiry", recipient: "", duration: "", notes: "" });
      setShowForm(false);
      loadData();
      setStatus("Call logged.");
    } catch {
      setStatus("Failed to create.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete?")) return;
    try {
      const res = await fetch(`/api/admin/reception/call-log/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      loadData();
      setStatus("Deleted.");
    } catch {
      setStatus("Failed to delete.");
    }
  }

  if (loading) {
    loadData();
    return <div className="p-6 text-slate-500">Loading call logs...</div>;
  }

  return (
    <div className="space-y-6">
      {status && <div className={cn("rounded-lg border px-4 py-3 text-sm flex items-center gap-2", status.includes("Failed") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}><CheckCircle2 className="h-4 w-4" /> {status}</div>}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Total Calls</p><p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Total Duration</p><p className="mt-2 text-2xl font-bold text-blue-600">{Math.floor(stats.totalDuration / 60)}m {stats.totalDuration % 60}s</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Avg Duration</p><p className="mt-2 text-2xl font-bold text-amber-600">{Math.floor(stats.avgDuration / 60)}m {stats.avgDuration % 60}s</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Callback Required</p><p className="mt-2 text-2xl font-bold text-rose-600">{calls.filter((c) => c.status === "CALLBACK_REQUIRED").length}</p></div>
      </div>

      {/* Chart */}
      {showChart && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Calls by Purpose</h3>
          <div className="space-y-3">
            {purposes.map((p) => { const count = stats.byPurpose[p] || 0; const pct = stats.total > 0 ? (count / stats.total) * 100 : 0; return (
              <div key={p} className="flex items-center gap-3">
                <span className="w-24 text-sm text-slate-600">{p}</span>
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
          <select value={filterPurpose} onChange={(e) => setFilterPurpose(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="ALL">All Purposes</option>
            {purposes.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)}><BarChart3 className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> Log Call</>}</Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h3 className="font-semibold text-slate-900">New Call Entry</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Caller Name *" value={form.callerName} onChange={(e) => setForm({ ...form, callerName: e.target.value })} />
            <Input placeholder="Phone *" value={form.callerPhone} onChange={(e) => setForm({ ...form, callerPhone: e.target.value })} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>{purposes.map((p) => <option key={p} value={p}>{p}</option>)}</select>
            <Input placeholder="Recipient" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
            <Input type="number" placeholder="Duration (seconds)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={2} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!form.callerName.trim() || !form.callerPhone.trim()}>Save</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Call History ({filtered.length})</h2></div>
        {filtered.length === 0 ? <div className="p-8 text-center text-slate-500">No call logs</div> : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <div key={c.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">{c.callerName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{c.callNumber}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", c.status === "COMPLETED" && "bg-emerald-100 text-emerald-700", c.status === "CALLBACK_REQUIRED" && "bg-amber-100 text-amber-700", c.status === "NO_ANSWER" && "bg-slate-100 text-slate-600")}>{c.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-sm text-slate-600">{c.callerPhone} • {c.purpose}</p>
                  {c.recipient && <p className="text-xs text-slate-500">For: {c.recipient}</p>}
                  <p className="text-xs text-slate-500">Duration: {Math.floor(c.duration / 60)}m {c.duration % 60}s</p>
                </div>
                <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
