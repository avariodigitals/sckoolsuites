"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { AlertCircle, Search } from "lucide-react";

type Complaint = {
  id: number;
  parentId: number;
  parentName: string;
  category: string;
  subject: string;
  complaint: string;
  status: string;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === "resolved") return "bg-emerald-100 text-emerald-700";
  if (s === "in_progress") return "bg-blue-100 text-blue-700";
  if (s === "closed") return "bg-slate-100 text-slate-600";
  return "bg-rose-100 text-rose-700";
}

function statusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function ComplaintManager() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const filteredComplaints = useMemo(() => {
    let list = complaints;
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status.toLowerCase() === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.subject.toLowerCase().includes(q) ||
          c.parentName.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.complaint.toLowerCase().includes(q)
      );
    }
    return list;
  }, [complaints, searchQuery, statusFilter]);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/complaints", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setComplaints(payload.complaints ?? []);
      } else {
        setStatus(payload?.error ?? "Failed to load complaints.");
      }
    } catch {
      setStatus("Failed to load complaints.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadComplaints(), 0);
    return () => clearTimeout(timer);
  }, [loadComplaints]);

  const selectedComplaint = selectedId
    ? complaints.find((c) => c.id === selectedId) ?? null
    : null;

  async function updateStatus(newStatus: string) {
    if (!selectedComplaint) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/complaints/${selectedComplaint.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, resolutionNote: resolutionNote || undefined }),
      });
      if (response.ok) {
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === selectedComplaint.id
              ? { ...c, status: newStatus, resolutionNote: resolutionNote || c.resolutionNote }
              : c
          )
        );
        setStatus("");
      } else {
        setStatus("Failed to update complaint status.");
      }
    } catch {
      setStatus("Failed to update complaint status.");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading complaints...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {status}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by subject, parent, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-1">
          <div className="max-h-[32rem] overflow-y-auto divide-y divide-slate-100">
            {filteredComplaints.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                No complaints found.
              </div>
            ) : (
              filteredComplaints.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    setResolutionNote(c.resolutionNote ?? "");
                  }}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selectedId === c.id ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {c.subject}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(c.status)}`}
                    >
                      {statusLabel(c.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    From {c.parentName} • {c.category}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {formatDate(c.createdAt)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          {selectedComplaint ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedComplaint.subject}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span>
                    <strong className="text-slate-700">From:</strong>{" "}
                    {selectedComplaint.parentName}
                  </span>
                  <span>
                    <strong className="text-slate-700">Category:</strong>{" "}
                    {selectedComplaint.category}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(selectedComplaint.status)}`}
                  >
                    {statusLabel(selectedComplaint.status)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatDate(selectedComplaint.createdAt)}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {selectedComplaint.complaint}
              </div>

              {selectedComplaint.resolutionNote && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-semibold">Resolution Note:</p>
                  <p className="mt-1">{selectedComplaint.resolutionNote}</p>
                </div>
              )}

              <div className="space-y-3 border-t border-slate-200 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Resolution Note
                </label>
                <textarea
                  className="h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Add a resolution note..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus("IN_PROGRESS")}
                    disabled={updating}
                    className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Mark In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus("RESOLVED")}
                    disabled={updating}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Mark Resolved
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus("CLOSED")}
                    disabled={updating}
                    className="rounded-md bg-slate-600 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    Close Complaint
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center text-center text-slate-400">
              <AlertCircle className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm">Select a complaint to view its details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
