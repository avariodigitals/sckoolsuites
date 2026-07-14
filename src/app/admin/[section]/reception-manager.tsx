"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  LogOut,
  Clock,
  FileText,
  StickyNote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";

// Module scope workflows based on screenshot
type WorkflowModule = {
  id: string;
  name: string;
  screens: string[];
};

const workflowModules: WorkflowModule[] = [
  {
    id: "admissions",
    name: "Admissions Desk",
    screens: ["Applications", "Document Review", "Interview Queue"],
  },
  {
    id: "enrollment",
    name: "Enrollment",
    screens: ["Approval", "Class Placement", "Parent Account Creation"],
  },
  {
    id: "frontdesk",
    name: "Front Desk",
    screens: ["Visitor Log", "Follow-up Tasks", "Intake Notes"],
  },
];

type Visitor = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  purpose: string;
  whomToSee: string | null;
  department: string | null;
  status: "CHECKED_IN" | "CHECKED_OUT";
  checkInTime: string;
  checkOutTime: string | null;
  notes: string | null;
};

type Stats = {
  checkedIn: number;
  checkedOut: number;
  today: number;
};

const purposeOptions = [
  "Meeting",
  "Interview",
  "Delivery",
  "Parent Visit",
  "Vendor",
  "Maintenance",
  "Inspection",
  "Other",
];

const departmentOptions = [
  "Administration",
  "Principal's Office",
  "Finance",
  "Academics",
  "Student Affairs",
  "HR",
  "IT",
  "Library",
  "Sports",
  "Other",
];

const emptyVisitor = {
  name: "",
  phone: "",
  email: "",
  purpose: "Meeting",
  whomToSee: "",
  department: "",
  notes: "",
};

export function ReceptionManager() {
  const confirm = useConfirm();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<Stats>({ checkedIn: 0, checkedOut: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [form, setForm] = useState(emptyVisitor);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const filteredVisitors = useMemo(() => {
    let result = visitors;
    if (statusFilter !== "ALL") {
      result = result.filter((v) => v.status === statusFilter);
    }
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.purpose.toLowerCase().includes(query) ||
        v.whomToSee?.toLowerCase().includes(query) ||
        v.department?.toLowerCase().includes(query)
    );
  }, [visitors, statusFilter, searchQuery]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const url = new URL("/api/admin/reception", window.location.origin);
      if (statusFilter !== "ALL") {
        url.searchParams.set("status", statusFilter);
      }
      if (searchQuery.trim()) {
        url.searchParams.set("q", searchQuery.trim());
      }

      const response = await fetch(url.toString(), { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Unable to load visitor data.");
        return;
      }
      setVisitors(payload.visitors ?? []);
      setStats(payload.stats ?? { checkedIn: 0, checkedOut: 0, today: 0 });
    } catch {
      setStatus("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  async function handleCheckIn() {
    setStatus("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/reception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to check in visitor.");
        return;
      }

      setForm(emptyVisitor);
      setShowForm(false);
      setStatus("Visitor checked in successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut(visitorId: string) {
    setCheckingOut(visitorId);
    setStatus("");

    try {
      const response = await fetch("/api/admin/reception", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: visitorId }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to check out visitor.");
        return;
      }

      setStatus("Visitor checked out successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setCheckingOut(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!(await confirm({
      title: "Delete Visitor Record",
      message: `Delete visitor record for "${name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    }))) {
      return;
    }

    setStatus("");
    try {
      const response = await fetch(`/api/admin/reception/${id}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to delete visitor.");
        return;
      }

      setStatus("Visitor record deleted.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  function formatDuration(checkIn: string, checkOut: string | null) {
    if (!checkOut) return "-";
    const duration = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
    if (duration < 60) return `${duration} min`;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${hours}h ${mins}m`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading reception data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {status && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          status.includes("successfully") 
            ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
            : "border-rose-200 bg-rose-50 text-rose-700"
        )}>
          {status}
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reception & Front Desk</h1>
        <p className="text-slate-600 mt-1">Manage visitors, admissions, and front desk operations</p>
      </div>

      {/* Module Scope - Workflow Overview */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Admin Operations Module Scope</h2>
        </div>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            {workflowModules.map((module) => (
              <div key={module.id} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">{module.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {module.screens.map((screen) => (
                    <span 
                      key={screen}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700"
                    >
                      {screen}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards - Modern Style */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Currently Checked In</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.checkedIn}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Checked Out Today</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.checkedOut}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <LogOut className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Visitors Today</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.today}</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3">
              <Clock className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Visitors</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
          </select>
          <Input
            placeholder="Search visitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Visitor Check-in"}
        </Button>
      </div>

      {/* Check-in Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">New Visitor Check-in</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Visitor Name *"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.purpose}
              onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
            >
              {purposeOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.department}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
            >
              <option value="">Select Department (optional)</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <Input
              placeholder="Person to See"
              value={form.whomToSee}
              onChange={(e) => setForm((prev) => ({ ...prev, whomToSee: e.target.value }))}
            />
            <textarea
              className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Notes (optional)"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleCheckIn} disabled={submitting || !form.name.trim()}>
              {submitting ? "Checking in..." : "Check In Visitor"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Visitors List - Modern Table Style */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Visitor Log</h2>
          <span className="text-sm text-slate-500">{filteredVisitors.length} visitors</span>
        </div>
        
        {filteredVisitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-4 text-sm text-slate-500">No visitors found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredVisitors.map((visitor) => (
              <div key={visitor.id} className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-slate-900">{visitor.name}</h4>
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      visitor.status === "CHECKED_IN"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    )}>
                      {visitor.status === "CHECKED_IN" ? "Checked In" : "Checked Out"}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-slate-400" />
                      {visitor.purpose}
                    </span>
                    {visitor.department && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">•</span>
                        {visitor.department}
                      </span>
                    )}
                    {visitor.whomToSee && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">•</span>
                        To see: {visitor.whomToSee}
                      </span>
                    )}
                    {visitor.phone && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">•</span>
                        {visitor.phone}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span>Check-in: {new Date(visitor.checkInTime).toLocaleString()}</span>
                    {visitor.checkOutTime && (
                      <span>
                        Check-out: {new Date(visitor.checkOutTime).toLocaleString()}
                        <span className="ml-2 text-slate-400">({formatDuration(visitor.checkInTime, visitor.checkOutTime)})</span>
                      </span>
                    )}
                  </div>
                  
                  {visitor.notes && (
                    <p className="mt-2 text-sm text-slate-500 italic flex items-center gap-1">
                      <StickyNote className="h-3 w-3" />
                      {visitor.notes}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {visitor.status === "CHECKED_IN" && (
                    <Button
                      size="sm"
                      onClick={() => handleCheckOut(visitor.id)}
                      disabled={checkingOut === visitor.id}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {checkingOut === visitor.id ? "Processing..." : "Check Out"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(visitor.id, visitor.name)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
