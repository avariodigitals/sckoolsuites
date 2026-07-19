"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { naira, formatDate } from "@/lib/utils";

type Category = { id: number; name: string; description?: string | null };
type FinanceRecord = {
  id: number;
  amount: number;
  description?: string | null;
  source?: string | null;
  date: string;
  paymentMethod?: string | null;
  category?: Category | null;
  categoryId?: number | null;
};

export function AccountantIncomeManager() {
  return <FinanceManager type="income" />;
}

export function AccountantExpenseManager() {
  return <FinanceManager type="expense" />;
}

function FinanceManager({ type }: { type: "income" | "expense" }) {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    description: "",
    source: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "",
  });

  const apiBase = `/api/admin/finance/${type}`;
  const catBase = `/api/admin/finance/${type}-categories`;
  const isIncome = type === "income";
  const label = isIncome ? "Income" : "Expense";
  const Icon = isIncome ? TrendingUp : TrendingDown;
  const accentColor = isIncome ? "text-emerald-600" : "text-rose-600";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recsRes, catsRes] = await Promise.all([
        fetch(apiBase),
        fetch(catBase),
      ]);
      if (!recsRes.ok) throw new Error(`Failed to load ${label.toLowerCase()} records`);
      const recsData = await recsRes.json();
      setRecords(Array.isArray(recsData) ? recsData : []);
      if (catsRes.ok) {
        const catsData = await catsRes.json();
        setCategories(Array.isArray(catsData) ? catsData : []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, catBase, label]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!formData.categoryId || !formData.amount || !formData.date) {
      setError("Category, amount and date are required");
      return;
    }
    try {
      const body: { [key: string]: any } = {
        categoryId: Number(formData.categoryId),
        amount: Number(formData.amount),
        date: formData.date,
        description: formData.description || undefined,
        paymentMethod: formData.paymentMethod || undefined,
      };
      if (isIncome) body.source = formData.source || "Manual";
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to create ${label.toLowerCase()}`);
      setSuccess(`${label} record created successfully.`);
      setFormData({
        categoryId: "",
        amount: "",
        description: "",
        source: "",
        date: new Date().toISOString().split("T")[0],
        paymentMethod: "",
      });
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddCategory = async () => {
    const name = window.prompt(`Enter ${label.toLowerCase()} category name:`);
    if (!name?.trim()) return;
    try {
      const res = await fetch(catBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create category");
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const total = records.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${accentColor}`} />
          <div>
            <p className="text-sm font-medium text-slate-700">
              Total {label}: <span className={`font-bold ${accentColor}`}>{naira(total)}</span>
            </p>
            <p className="text-xs text-slate-500">{records.length} record(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
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
            Add {label}
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <div className="flex gap-2">
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                  required
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  + New
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₦)</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method</label>
              <input
                type="text"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                placeholder="Cash, Bank Transfer, etc."
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            {isIncome && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Source</label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="Manual, Fees, Donation, etc."
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            )}
            <div className="sm:col-span-2">
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
              Save {label}
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
        ) : records.length === 0 ? (
          <p className="text-sm text-slate-500">No {label.toLowerCase()} records yet.</p>
        ) : (
          records.slice(0, 50).map((r) => (
            <div key={r.id} className="glass-soft rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{r.category?.name ?? "Uncategorized"}</p>
                  <p className="text-xs text-slate-500">
                    {r.description ?? "No description"} • {formatDate(r.date)}
                    {r.paymentMethod ? ` • ${r.paymentMethod}` : ""}
                    {isIncome && r.source ? ` • ${r.source}` : ""}
                  </p>
                </div>
                <p className={`font-semibold text-sm ${accentColor}`}>{naira(r.amount)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
