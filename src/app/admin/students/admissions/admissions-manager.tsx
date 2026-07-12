"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  TESTED: "bg-blue-100 text-blue-700",
  INTERVIEWED: "bg-violet-100 text-violet-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  WITHDRAWN: "bg-slate-100 text-slate-600",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  TESTED: "Tested",
  INTERVIEWED: "Interviewed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const pipelineStatuses = ["PENDING", "TESTED", "INTERVIEWED", "APPROVED", "REJECTED", "WITHDRAWN"];

type Application = {
  id: string;
  applicantNumber: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  age: number | null;
  applyingForClassId: string | null;
  previousSchool: string | null;
  previousClass: string | null;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  status: string;
  testScore: number | null;
  interviewNotes: string | null;
  notes: string | null;
  createdAt: string;
};

type ClassOption = { id: string; name: string };

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
  age: "" as string,
  applyingForClassId: "",
  previousSchool: "",
  previousClass: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  parentRelationship: "",
  sportHouse: "",
  coCurricular: "",
  responsibilities: "",
  notes: "",
};

export function AdmissionsManager() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [testScoreInput, setTestScoreInput] = useState("");
  const [interviewNotesInput, setInterviewNotesInput] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/admissions", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? "Failed to load applications.");
        return;
      }
      setApplications(data.applications ?? []);
      setClasses(data.classes ?? []);
    } catch {
      setStatus("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const filtered = useMemo(() => {
    let list = applications;
    if (filterStatus !== "ALL") {
      list = list.filter((a) => a.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.applicantNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [applications, filterStatus, searchQuery]);

  async function handleSubmit() {
    setStatus("");
    setSubmitting(true);
    try {
      const body = {
        ...form,
        age: form.age ? Number(form.age) : null,
      };
      const res = await fetch("/api/admin/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? "Failed to create application.");
        return;
      }
      setForm(emptyForm);
      setStatus("Application created successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusUpdate(appId: string, newStatus: string) {
    setStatus("");
    try {
      const res = await fetch(`/api/admin/admissions/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? "Failed to update status.");
        return;
      }
      setStatus(`Status updated to ${statusLabels[newStatus]}.`);
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleSaveTest(appId: string) {
    setStatus("");
    try {
      const res = await fetch(`/api/admin/admissions/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testScore: testScoreInput ? Number(testScoreInput) : null,
          interviewNotes: interviewNotesInput || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? "Failed to save test details.");
        return;
      }
      setStatus("Test details saved.");
      setSelectedApp(null);
      setTestScoreInput("");
      setInterviewNotesInput("");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleApprove(appId: string) {
    if (!window.confirm("Approve this application and create a student record?")) return;
    setStatus("");
    try {
      const res = await fetch(`/api/admin/admissions/${appId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? "Failed to approve.");
        return;
      }
      setStatus("Application approved and student created.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleWithdraw(appId: string) {
    if (!window.confirm("Withdraw this application?")) return;
    setStatus("");
    try {
      const res = await fetch(`/api/admin/admissions/${appId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? "Failed to withdraw.");
        return;
      }
      setStatus("Application withdrawn.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading admissions...</div>;
  }

  return (
    <div className="space-y-4">
      {status && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${status.includes("success") || status.includes("created") || status.includes("approved") || status.includes("saved") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      )}

      {/* New Application Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">New Application</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Full name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as any }))}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          <Input type="number" placeholder="Age" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} min={3} max={30} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.applyingForClassId} onChange={(e) => setForm((p) => ({ ...p, applyingForClassId: e.target.value }))}>
            <option value="">Applying for class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Input placeholder="Previous school" value={form.previousSchool} onChange={(e) => setForm((p) => ({ ...p, previousSchool: e.target.value }))} />
          <Input placeholder="Previous class" value={form.previousClass} onChange={(e) => setForm((p) => ({ ...p, previousClass: e.target.value }))} />
          <Input placeholder="Parent name" value={form.parentName} onChange={(e) => setForm((p) => ({ ...p, parentName: e.target.value }))} />
          <Input type="email" placeholder="Parent email" value={form.parentEmail} onChange={(e) => setForm((p) => ({ ...p, parentEmail: e.target.value }))} />
          <Input placeholder="Parent phone" value={form.parentPhone} onChange={(e) => setForm((p) => ({ ...p, parentPhone: e.target.value }))} />
          <Input placeholder="Relationship" value={form.parentRelationship} onChange={(e) => setForm((p) => ({ ...p, parentRelationship: e.target.value }))} />
          <Input placeholder="Sport house" value={form.sportHouse} onChange={(e) => setForm((p) => ({ ...p, sportHouse: e.target.value }))} />
          <Input placeholder="Co-curricular" value={form.coCurricular} onChange={(e) => setForm((p) => ({ ...p, coCurricular: e.target.value }))} />
          <Input placeholder="Responsibilities" value={form.responsibilities} onChange={(e) => setForm((p) => ({ ...p, responsibilities: e.target.value }))} />
          <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input placeholder="Search by name, email or number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-md" />
        <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          {pipelineStatuses.map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
      </div>

      {/* Applications Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Applications ({filtered.length})</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Number</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Age</th>
                <th className="px-2 py-2">Class</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Score</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-4 text-center text-slate-500">No applications found.</td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-2 font-mono text-xs text-slate-600">{app.applicantNumber}</td>
                    <td className="px-2 py-2 font-medium text-slate-900">{app.name}</td>
                    <td className="px-2 py-2 text-slate-600">{app.email}</td>
                    <td className="px-2 py-2">{app.age ?? "-"}</td>
                    <td className="px-2 py-2">
                      {classes.find((c) => c.id === app.applyingForClassId)?.name ?? "-"}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[app.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {statusLabels[app.status] ?? app.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">{app.testScore ?? "-"}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {/* Status pipeline buttons */}
                        {app.status === "PENDING" && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(app.id, "TESTED")}>
                            Mark Tested
                          </Button>
                        )}
                        {app.status === "TESTED" && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedApp(app); setTestScoreInput(app.testScore ? String(app.testScore) : ""); setInterviewNotesInput(app.interviewNotes ?? ""); }}>
                            Add Test
                          </Button>
                        )}
                        {app.status === "TESTED" && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(app.id, "INTERVIEWED")}>
                            Interviewed
                          </Button>
                        )}
                        {app.status === "INTERVIEWED" && (
                          <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => handleApprove(app.id)}>
                            Approve
                          </Button>
                        )}
                        {app.status === "INTERVIEWED" && (
                          <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => handleStatusUpdate(app.id, "REJECTED")}>
                            Reject
                          </Button>
                        )}
                        {(app.status === "PENDING" || app.status === "TESTED") && (
                          <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => handleStatusUpdate(app.id, "REJECTED")}>
                            Reject
                          </Button>
                        )}
                        {(app.status !== "APPROVED" && app.status !== "WITHDRAWN") && (
                          <Button size="sm" variant="outline" onClick={() => handleWithdraw(app.id)}>
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test/Interview Modal Overlay */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Test & Interview Details</h3>
            <p className="mb-4 text-sm text-slate-500">{selectedApp.name} — {selectedApp.applicantNumber}</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Test Score (0-100)</label>
                <Input type="number" min={0} max={100} value={testScoreInput} onChange={(e) => setTestScoreInput(e.target.value)} placeholder="Enter test score" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Interview Notes</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                  value={interviewNotesInput}
                  onChange={(e) => setInterviewNotesInput(e.target.value)}
                  placeholder="Interview observations..."
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => handleSaveTest(selectedApp.id)}>Save</Button>
              <Button variant="outline" onClick={() => { setSelectedApp(null); setTestScoreInput(""); setInterviewNotesInput(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
