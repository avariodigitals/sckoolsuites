"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  Plus, Trash2, CheckCircle2, X, BarChart3, Search, 
  LogOut, Users, Clock, Calendar, TrendingUp, FileSpreadsheet,
  UserCircle, Building2, ArrowRightLeft
} from "lucide-react";

export type Visitor = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  purpose: string;
  whomToSee: string | null;
  department: string | null;
  checkInTime: string;
  checkOutTime: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

const purposes = ["Meeting", "Delivery", "Interview", "Enquiry", "Parent Visit", "Other"];
const departments = ["Administration", "Finance", "Academics", "Staff Room", "Principal Office", "Other"];

export function VisitorClient({ schoolId: _schoolId }: { schoolId: string }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPurpose, setFilterPurpose] = useState<string>("ALL");
  const [showChart, setShowChart] = useState(false);
  const [dateRange, setDateRange] = useState<string>("today");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    purpose: "Meeting",
    whomToSee: "",
    department: "Administration",
    notes: "",
  });

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (searchQuery) params.append("q", searchQuery);
      
      const res = await fetch(`/api/admin/reception?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setVisitors(data.visitors ?? []);
      }
    } catch {
      setStatus("Failed to load visitors");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  const filtered = useMemo(() => {
    let result = visitors;
    if (filterPurpose !== "ALL") result = result.filter((v) => v.purpose === filterPurpose);
    
    // Date filtering
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateRange === "today") {
      result = result.filter((v) => new Date(v.checkInTime) >= today);
    } else if (dateRange === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter((v) => new Date(v.checkInTime) >= weekAgo);
    } else if (dateRange === "month") {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      result = result.filter((v) => new Date(v.checkInTime) >= monthAgo);
    }
    
    return result;
  }, [visitors, filterPurpose, dateRange]);

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayVisitors = visitors.filter((v) => new Date(v.checkInTime) >= today);
    const checkedIn = visitors.filter((v) => v.status === "CHECKED_IN").length;
    const checkedOutToday = todayVisitors.filter((v) => v.checkOutTime && v.status === "CHECKED_OUT").length;
    
    const byPurpose = purposes.reduce((acc, p) => {
      acc[p] = visitors.filter((v) => v.purpose === p).length;
      return acc;
    }, {} as Record<string, number>);
    
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: todayVisitors.filter((v) => new Date(v.checkInTime).getHours() === i).length,
    })).filter((h) => h.count > 0);
    
    return {
      totalToday: todayVisitors.length,
      currentlyCheckedIn: checkedIn,
      checkedOutToday,
      totalThisMonth: visitors.filter((v) => {
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return new Date(v.checkInTime) >= monthAgo;
      }).length,
      byPurpose,
      hourlyData,
    };
  }, [visitors]);

  function exportToCSV() {
    const headers = ["Name", "Phone", "Email", "Purpose", "Whom To See", "Department", "Check In", "Check Out", "Status"];
    const rows = filtered.map((v) => [
      v.name,
      v.phone || "",
      v.email || "",
      v.purpose,
      v.whomToSee || "",
      v.department || "",
      new Date(v.checkInTime).toLocaleString(),
      v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : "",
      v.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visitor-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCheckIn() {
    try {
      const res = await fetch("/api/admin/reception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setForm({ name: "", phone: "", email: "", purpose: "Meeting", whomToSee: "", department: "Administration", notes: "" });
      setShowForm(false);
      loadData();
      setStatus("Visitor checked in successfully.");
    } catch {
      setStatus("Failed to check in visitor.");
    }
  }

  async function handleCheckOut(id: string) {
    try {
      const res = await fetch("/api/admin/reception", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed");
      loadData();
      setStatus("Visitor checked out.");
    } catch {
      setStatus("Failed to check out.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this visitor record?")) return;
    try {
      const res = await fetch(`/api/admin/reception/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      loadData();
      setStatus("Record deleted.");
    } catch {
      setStatus("Failed to delete.");
    }
  }

  if (loading) {
    loadData();
    return <div className="p-6 text-slate-500">Loading visitor data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {status && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm flex items-center gap-2",
          status.includes("Failed") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
        )}>
          <CheckCircle2 className="h-4 w-4" />
          {status}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Today&apos;s Visitors</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalToday}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Currently In</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.currentlyCheckedIn}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Checked Out Today</p>
              <p className="mt-2 text-3xl font-bold text-slate-700">{stats.checkedOutToday}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center">
              <LogOut className="h-5 w-5 text-slate-600" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">This Month</p>
              <p className="mt-2 text-3xl font-bold text-indigo-600">{stats.totalThisMonth}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {showChart && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Purpose Breakdown */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Visitors by Purpose
            </h3>
            <div className="space-y-3">
              {purposes.map((purpose) => {
                const count = stats.byPurpose[purpose] || 0;
                const total = visitors.length || 1;
                const pct = (count / total) * 100;
                return (
                  <div key={purpose} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-slate-600">{purpose}</span>
                    <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-lg flex items-center justify-end px-2"
                        style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                      >
                        {count > 0 && <span className="text-xs font-medium text-white">{count}</span>}
                      </div>
                    </div>
                    <span className="w-10 text-sm font-medium text-slate-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hourly Distribution */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Today&apos;s Hourly Check-ins
            </h3>
            {stats.hourlyData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No check-ins today</p>
            ) : (
              <div className="space-y-2">
                {stats.hourlyData.map((h) => (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="w-12 text-sm text-slate-600">{h.hour}:00</span>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min((h.count / Math.max(...stats.hourlyData.map(d => d.count))) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm font-medium text-slate-900">{h.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search visitors..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-10" 
            />
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
          </select>
          <select 
            value={filterPurpose} 
            onChange={(e) => setFilterPurpose(e.target.value)} 
            className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="ALL">All Purposes</option>
            {purposes.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)} 
            className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowChart(!showChart)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            {showChart ? "Hide Charts" : "Show Charts"}
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> Check In Visitor</>}
          </Button>
        </div>
      </div>

      {/* Check-in Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            New Visitor Check-in
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Input 
              placeholder="Full Name *" 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
            />
            <Input 
              placeholder="Phone Number" 
              value={form.phone} 
              onChange={(e) => setForm({ ...form, phone: e.target.value })} 
            />
            <Input 
              placeholder="Email" 
              type="email" 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
            />
            <select 
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" 
              value={form.purpose} 
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            >
              {purposes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <Input 
              placeholder="Whom to See" 
              value={form.whomToSee} 
              onChange={(e) => setForm({ ...form, whomToSee: e.target.value })} 
            />
            <select 
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" 
              value={form.department} 
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <textarea 
              placeholder="Notes" 
              value={form.notes} 
              onChange={(e) => setForm({ ...form, notes: e.target.value })} 
              className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm" 
              rows={2} 
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleCheckIn} disabled={!form.name.trim()}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Check In
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Visitor List */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Visitor Log ({filtered.length})
          </h2>
          <span className="text-sm text-slate-500">
            Showing {filtered.filter(v => v.status === "CHECKED_IN").length} checked in
          </span>
        </div>
        
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500 text-lg">No visitors found</p>
            <p className="text-slate-400 text-sm mt-1">Check in a new visitor to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((visitor) => (
              <div key={visitor.id} className="px-6 py-4 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-900">{visitor.name}</h4>
                      <span className={cn(
                        "text-xs font-medium px-2.5 py-0.5 rounded-full",
                        visitor.status === "CHECKED_IN" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-slate-100 text-slate-600"
                      )}>
                        {visitor.status === "CHECKED_IN" ? "Checked In" : "Checked Out"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {visitor.purpose}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wider">Phone</span>
                        <p className="text-slate-700">{visitor.phone || "—"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wider">Visiting</span>
                        <p className="text-slate-700">{visitor.whomToSee || "—"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wider">Department</span>
                        <p className="text-slate-700">{visitor.department || "—"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wider">Check In</span>
                        <p className="text-slate-700">{new Date(visitor.checkInTime).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    
                    {visitor.notes && (
                      <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">{visitor.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {visitor.status === "CHECKED_IN" && (
                      <Button size="sm" variant="outline" onClick={() => handleCheckOut(visitor.id)}>
                        <LogOut className="h-4 w-4 mr-1" />
                        Check Out
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleDelete(visitor.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
