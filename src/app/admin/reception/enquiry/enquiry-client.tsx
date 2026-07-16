"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Search, Trash2, Edit2, Save, X, CheckCircle2, Download, BarChart3 } from "lucide-react";

export type Enquiry = {
  id: string;
  enquiryNumber: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  type: string;
  stage: string;
  subject: string;
  notes: string | null;
  followUpDate: string | null;
  createdAt: string;
};

const defaultSources = ["Walk-in", "Phone", "Email", "Website", "Referral"];
const defaultTypes = ["General", "Admission", "Fee", "Academic", "Other"];
const defaultStages = ["New", "In Progress", "Follow-up", "Resolved", "Closed"];

export function EnquiryClient({ schoolId: _schoolId }: { schoolId: string }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showChart, setShowChart] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "Walk-in",
    type: "General",
    stage: "New",
    subject: "",
    notes: "",
    followUpDate: "",
  });

  const loadEnquiries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reception/enquiry", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEnquiries(data.enquiries ?? []);
      }
    } catch {
      setStatus("Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredEnquiries = useMemo(() => {
    let result = enquiries;
    if (filterStage !== "ALL") result = result.filter((e) => e.stage === filterStage);
    if (filterType !== "ALL") result = result.filter((e) => e.type === filterType);
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.subject.toLowerCase().includes(query) ||
        e.enquiryNumber.toLowerCase().includes(query) ||
        e.phone?.toLowerCase().includes(query)
    );
  }, [enquiries, searchQuery, filterStage, filterType]);

  const stats = useMemo(() => {
    const byStage = defaultStages.reduce((acc, stage) => {
      acc[stage] = enquiries.filter((e) => e.stage === stage).length;
      return acc;
    }, {} as Record<string, number>);
    const byType = defaultTypes.reduce((acc, type) => {
      acc[type] = enquiries.filter((e) => e.type === type).length;
      return acc;
    }, {} as Record<string, number>);
    return { total: enquiries.length, byStage, byType };
  }, [enquiries]);

  function exportToCSV() {
    const headers = ["Enquiry Number", "Name", "Phone", "Email", "Source", "Type", "Stage", "Subject", "Created At"];
    const rows = filteredEnquiries.map((e) => [
      e.enquiryNumber, e.name, e.phone || "", e.email || "", e.source, e.type, e.stage, e.subject, new Date(e.createdAt).toLocaleDateString()
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enquiries-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreate() {
    setStatus("");
    try {
      const res = await fetch("/api/admin/reception/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create");
      setForm({ name: "", phone: "", email: "", source: "Walk-in", type: "General", stage: "New", subject: "", notes: "", followUpDate: "" });
      setShowForm(false);
      loadEnquiries();
      setStatus("Enquiry created successfully.");
    } catch {
      setStatus("Failed to create enquiry.");
    }
  }

  async function handleUpdate(id: string) {
    setStatus("");
    try {
      const res = await fetch(`/api/admin/reception/enquiry/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null);
      setForm({ name: "", phone: "", email: "", source: "Walk-in", type: "General", stage: "New", subject: "", notes: "", followUpDate: "" });
      loadEnquiries();
      setStatus("Enquiry updated successfully.");
    } catch {
      setStatus("Failed to update enquiry.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this enquiry?")) return;
    setStatus("");
    try {
      const res = await fetch(`/api/admin/reception/enquiry/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      loadEnquiries();
      setStatus("Enquiry deleted.");
    } catch {
      setStatus("Failed to delete enquiry.");
    }
  }

  function startEdit(enquiry: Enquiry) {
    setEditingId(enquiry.id);
    setForm({
      name: enquiry.name,
      phone: enquiry.phone || "",
      email: enquiry.email || "",
      source: enquiry.source,
      type: enquiry.type,
      stage: enquiry.stage,
      subject: enquiry.subject,
      notes: enquiry.notes || "",
      followUpDate: enquiry.followUpDate?.split("T")[0] || "",
    });
  }

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  if (loading) {
    return <div className="p-6 text-slate-500">Loading enquiries...</div>;
  }

  return (
    <div className="space-y-6">
      {status && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm flex items-center gap-2",
          status.includes("successfully") || status.includes("deleted")
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-rose-200 bg-rose-50 text-rose-700"
        )}>
          <CheckCircle2 className="h-4 w-4" />
          {status}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-600">Total Enquiries</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-600">New</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{stats.byStage["New"] || 0}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-600">In Progress</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{stats.byStage["In Progress"] || 0}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-600">Resolved</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.byStage["Resolved"] || 0}</p>
        </div>
      </div>

      {/* Simple Chart */}
      {showChart && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Enquiries by Type</h3>
          <div className="space-y-3">
            {defaultTypes.map((type) => {
              const count = stats.byType[type] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-slate-600">{type}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
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
            <Input placeholder="Search enquiries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
              <option value="ALL">All Stages</option>
              {defaultStages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
              <option value="ALL">All Types</option>
              {defaultTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {showChart ? "Hide Chart" : "Show Chart"}
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> New Enquiry</>}
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h3 className="font-semibold text-slate-900">New Enquiry</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {defaultSources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {defaultTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {defaultStages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input placeholder="Subject *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="md:col-span-2" />
            <Input type="date" placeholder="Follow-up Date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!form.name.trim() || !form.subject.trim()}><Save className="h-4 w-4 mr-2" /> Save Enquiry</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Enquiries List */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Enquiry List</h2>
          <span className="text-sm text-slate-500">{filteredEnquiries.length} enquiries</span>
        </div>
        {filteredEnquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-500">No enquiries found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEnquiries.map((enquiry) => (
              <div key={enquiry.id} className="px-6 py-4 hover:bg-slate-50">
                {editingId === enquiry.id ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                        {defaultSources.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        {defaultTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                        {defaultStages.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="md:col-span-2" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(enquiry.id)}><Save className="h-4 w-4 mr-2" /> Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-4 w-4 mr-2" /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-slate-900">{enquiry.name}</h4>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{enquiry.enquiryNumber}</span>
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          enquiry.stage === "New" && "bg-blue-100 text-blue-700",
                          enquiry.stage === "In Progress" && "bg-amber-100 text-amber-700",
                          enquiry.stage === "Resolved" && "bg-emerald-100 text-emerald-700",
                          enquiry.stage === "Closed" && "bg-slate-100 text-slate-600"
                        )}>{enquiry.stage}</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{enquiry.subject}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Source: {enquiry.source}</span>
                        <span>Type: {enquiry.type}</span>
                        {enquiry.phone && <span>Phone: {enquiry.phone}</span>}
                        {enquiry.email && <span>Email: {enquiry.email}</span>}
                        {enquiry.followUpDate && <span>Follow-up: {new Date(enquiry.followUpDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(enquiry)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleDelete(enquiry.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
