"use client";

import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Trash2, CheckCircle2, X, LogOut, Download, BarChart3, Search } from "lucide-react";

export type GatePass = {
  id: string;
  passNumber: string;
  personName: string;
  personType: string;
  purpose: string;
  destination: string | null;
  exitTime: string;
  expectedReturn: string | null;
  actualReturn: string | null;
  status: string;
  issuedBy: string | null;
  notes: string | null;
  createdAt: string;
};

const personTypes = ["Student", "Staff", "Visitor", "Other"];
const statuses = ["ACTIVE", "RETURNED", "OVERDUE"];

export function GatePassClient({ schoolId: _schoolId }: { schoolId: string }) {
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showChart, setShowChart] = useState(false);

  const [form, setForm] = useState({
    personName: "",
    personType: "Student",
    purpose: "",
    destination: "",
    exitTime: "",
    expectedReturn: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reception/gate-pass", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPasses(data.passes ?? []);
      }
    } catch {
      setStatus("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredPasses = useMemo(() => {
    let result = passes;
    if (filterStatus !== "ALL") result = result.filter((p) => p.status === filterStatus);
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter((p) => p.personName.toLowerCase().includes(query) || p.passNumber.toLowerCase().includes(query));
  }, [passes, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const byStatus = statuses.reduce((acc, s) => {
      acc[s] = passes.filter((p) => p.status === s).length;
      return acc;
    }, {} as Record<string, number>);
    const byType = personTypes.reduce((acc, t) => {
      acc[t] = passes.filter((p) => p.personType === t).length;
      return acc;
    }, {} as Record<string, number>);
    return { total: passes.length, byStatus, byType };
  }, [passes]);

  function exportToCSV() {
    const headers = ["Pass Number", "Person Name", "Type", "Purpose", "Destination", "Exit Time", "Status"];
    const rows = filteredPasses.map((p) => [
      p.passNumber, p.personName, p.personType, p.purpose, p.destination || "", new Date(p.exitTime).toLocaleString(), p.status
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gate-passes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreate() {
    setStatus("");
    try {
      const res = await fetch("/api/admin/reception/gate-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setForm({ personName: "", personType: "Student", purpose: "", destination: "", exitTime: "", expectedReturn: "", notes: "" });
      setShowForm(false);
      loadData();
      setStatus("Gate pass issued.");
    } catch {
      setStatus("Failed to create.");
    }
  }

  async function handleReturn(id: string) {
    try {
      const res = await fetch(`/api/admin/reception/gate-pass/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RETURNED", actualReturn: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed");
      loadData();
      setStatus("Marked as returned.");
    } catch {
      setStatus("Failed to update.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this gate pass?")) return;
    try {
      const res = await fetch(`/api/admin/reception/gate-pass/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      loadData();
      setStatus("Deleted.");
    } catch {
      setStatus("Failed to delete.");
    }
  }

  if (loading) {
    loadData();
    return <div className="p-6 text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {status && <div className={cn("rounded-lg border px-4 py-3 text-sm flex items-center gap-2", status.includes("Failed") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}><CheckCircle2 className="h-4 w-4" /> {status}</div>}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Total Passes</p><p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Active</p><p className="mt-2 text-2xl font-bold text-amber-600">{stats.byStatus["ACTIVE"] || 0}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Returned</p><p className="mt-2 text-2xl font-bold text-emerald-600">{stats.byStatus["RETURNED"] || 0}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-600">Overdue</p><p className="mt-2 text-2xl font-bold text-rose-600">{stats.byStatus["OVERDUE"] || 0}</p></div>
      </div>

      {/* Chart */}
      {showChart && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Passes by Person Type</h3>
          <div className="space-y-3">
            {personTypes.map((type) => {
              const count = stats.byType[type] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-slate-600">{type}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                  <span className="w-10 text-sm font-medium text-slate-900">{count}</span>
                </div>
              );
            })}
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
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button variant="outline" onClick={() => setShowChart(!showChart)}><BarChart3 className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> Issue Pass</>}</Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h3 className="font-semibold text-slate-900">New Gate Pass</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Person Name *" value={form.personName} onChange={(e) => setForm({ ...form, personName: e.target.value })} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.personType} onChange={(e) => setForm({ ...form, personType: e.target.value })}>{personTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <Input placeholder="Purpose *" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            <Input placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            <Input type="datetime-local" value={form.exitTime} onChange={(e) => setForm({ ...form, exitTime: e.target.value })} />
            <Input type="datetime-local" value={form.expectedReturn} onChange={(e) => setForm({ ...form, expectedReturn: e.target.value })} />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={2} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!form.personName.trim() || !form.purpose.trim() || !form.exitTime}>Issue Pass</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Gate Passes ({filteredPasses.length})</h2></div>
        {filteredPasses.length === 0 ? <div className="p-8 text-center text-slate-500">No gate passes</div> : (
          <div className="divide-y divide-slate-100">
            {filteredPasses.map((pass) => (
              <div key={pass.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{pass.personName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{pass.passNumber}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", pass.status === "ACTIVE" && "bg-amber-100 text-amber-700", pass.status === "RETURNED" && "bg-emerald-100 text-emerald-700", pass.status === "OVERDUE" && "bg-rose-100 text-rose-700")}>{pass.status}</span>
                  </div>
                  <p className="text-sm text-slate-600">{pass.purpose} {pass.destination && `→ ${pass.destination}`}</p>
                  <p className="text-xs text-slate-500">Exit: {new Date(pass.exitTime).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {pass.status === "ACTIVE" && <Button size="sm" variant="outline" onClick={() => handleReturn(pass.id)}><LogOut className="h-4 w-4 mr-1" /> Return</Button>}
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleDelete(pass.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
