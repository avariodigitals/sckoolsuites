"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Assessment = {
  id: string;
  name: string;
  description: string | null;
  headings: Array<{ name: string; description?: string }>;
  gradingScale: Array<{ min: number; grade: string; gpa?: number; label?: string }>;
  isActive: boolean;
  createdAt: string;
};

export function AssessmentManager() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    headings: [{ name: "" }],
  });

  const stats = useMemo(() => {
    const total = assessments.length;
    const active = assessments.filter((a) => a.isActive).length;
    const withHeadings = assessments.filter((a) => a.headings?.length > 0).length;
    const totalHeadings = assessments.reduce((sum, a) => sum + (a.headings?.length ?? 0), 0);
    return { total, active, withHeadings, totalHeadings };
  }, [assessments]);

  const filteredAssessments = useMemo(() => {
    if (!searchQuery.trim()) return assessments;
    const q = searchQuery.toLowerCase();
    return assessments.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.headings.some((h) => h.name.toLowerCase().includes(q))
    );
  }, [assessments, searchQuery]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/assessments", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? "Unable to load assessments.");
        return;
      }
      setAssessments(data.assessments ?? []);
    } catch {
      setStatus("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/assessments", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus(data?.error ?? "Unable to load assessments.");
          return;
        }
        setAssessments(data.assessments ?? []);
      } catch {
        if (!cancelled) setStatus("Failed to load data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setStatus("Assessment name is required.");
      return;
    }
    const validHeadings = form.headings.filter((h) => h.name.trim());
    if (validHeadings.length === 0) {
      setStatus("At least one heading is required.");
      return;
    }

    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          headings: validHeadings,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(typeof payload?.error === "object" ? JSON.stringify(payload.error) : (payload?.error ?? "Failed to create assessment."));
        return;
      }
      setForm({ name: "", description: "", headings: [{ name: "" }] });
      setShowForm(false);
      setStatus("Assessment created successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!window.confirm("Deactivate this assessment?")) return;
    setStatus("");
    try {
      const response = await fetch(`/api/admin/assessments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!response.ok) throw new Error("Failed");
      setStatus("Assessment deactivated.");
      await loadData();
    } catch {
      setStatus("Failed to deactivate.");
    }
  }

  function addHeading() {
    setForm((prev) => ({ ...prev, headings: [...prev.headings, { name: "" }] }));
  }

  function removeHeading(index: number) {
    setForm((prev) => ({
      ...prev,
      headings: prev.headings.filter((_, i) => i !== index),
    }));
  }

  function updateHeading(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      headings: prev.headings.map((h, i) => (i === index ? { name: value } : h)),
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-slate-600">Total Assessments</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-600">Active</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-slate-600">With Headings</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.withHeadings}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-slate-600">Total Headings</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalHeadings}</p>
        </div>
      </div>

      {status && (
        <div className={cn(
          "rounded-lg px-4 py-3 text-sm",
          status.includes("success") || status.includes("created") || status.includes("deactivated")
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700"
        )}>
          {status}
        </div>
      )}

      {/* Create Button */}
      <div className="flex items-center gap-3">
        <Button onClick={() => { setShowForm(!showForm); setStatus(""); }}>
          {showForm ? (
            <>
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="mr-1.5 h-4 w-4" /> New Assessment
            </>
          )}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Create Assessment</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <Input
                  placeholder="e.g. EYFS Early Years Profile"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
                <Input
                  placeholder="Brief description..."
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Headings / Assessment Areas</label>
              <div className="space-y-2">
                {form.headings.map((heading, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Heading ${index + 1} (e.g. Physical Development)`}
                      value={heading.name}
                      onChange={(e) => updateHeading(index, e.target.value)}
                      className="flex-1"
                    />
                    {form.headings.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeHeading(index)}>
                        <X className="h-4 w-4 text-slate-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addHeading} className="mt-2">
                <Plus className="mr-1 h-3 w-3" /> Add Heading
              </Button>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Assessment"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search assessments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Assessments</h2>
          <span className="text-sm text-slate-500">{filteredAssessments.length} of {assessments.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3 font-medium">Assessment</th>
                <th className="px-6 py-3 font-medium">Headings</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssessments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-slate-100 p-3">
                        <ClipboardList className="h-6 w-6 text-slate-400" />
                      </div>
                      <p>No assessments found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((assessment) => (
                  <Fragment key={assessment.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0">
                            {assessment.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-slate-900">{assessment.name}</span>
                            {assessment.description && (
                              <p className="text-xs text-slate-500">{assessment.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          assessment.headings?.length > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {assessment.headings?.length ?? 0} heading{(assessment.headings?.length ?? 0) === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          assessment.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {assessment.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedId(expandedId === assessment.id ? null : assessment.id)}
                          >
                            {expandedId === assessment.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          {assessment.isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeactivate(assessment.id)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === assessment.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={4} className="px-6 py-3">
                          <div className="text-xs text-slate-600 space-y-1">
                            <p className="font-medium text-slate-800">Headings:</p>
                            {assessment.headings?.length > 0 ? (
                              <ul className="list-disc list-inside space-y-0.5">
                                {assessment.headings.map((h, i) => (
                                  <li key={i}>{h.name}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-slate-400">No headings defined</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
