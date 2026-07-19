"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw, Tag } from "lucide-react";
import { naira } from "@/lib/utils";

type Concession = {
  id: string;
  name: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  description?: string | null;
  isActive: boolean;
};

export function DiscountManagerPanel() {
  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    value: "",
    description: "",
  });

  const fetchConcessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/finance/fee-concessions");
      const data = await res.json();
      setConcessions(data.concessions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConcessions();
  }, [fetchConcessions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!formData.name.trim() || !formData.value) {
      setError("Name and value are required");
      return;
    }
    try {
      const res = await fetch("/api/admin/finance/fee-concessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          value: Number(formData.value),
          description: formData.description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create discount");
      setSuccess(`Discount "${formData.name.trim()}" created successfully.`);
      setFormData({ name: "", type: "PERCENTAGE", value: "", description: "" });
      setShowForm(false);
      await fetchConcessions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deactivate this discount? It will no longer be available for new invoices.")) return;
    try {
      const res = await fetch(`/api/admin/finance/fee-concessions?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete discount");
      }
      setSuccess("Discount deactivated.");
      await fetchConcessions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-slate-700">{concessions.length} active discount(s)</p>
            <p className="text-xs text-slate-500">Manage fee concessions and discount structures</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConcessions}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Discount
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Discount Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sibling Discount, Scholarship, Early Bird"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "PERCENTAGE" | "FIXED" })}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₦)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Value {formData.type === "PERCENTAGE" ? "(%)" : "(₦)"}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder={formData.type === "PERCENTAGE" ? "e.g. 10" : "e.g. 5000"}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Save Discount
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : concessions.length === 0 ? (
          <p className="text-sm text-slate-500">No discounts configured yet. Click &ldquo;Add Discount&rdquo; to create one.</p>
        ) : (
          concessions.map((c) => (
            <div key={c.id} className="glass-soft rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c.type === "PERCENTAGE" ? `${c.value}% off` : `${naira(c.value)} off`}
                    {c.description ? ` • ${c.description}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Deactivate
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
