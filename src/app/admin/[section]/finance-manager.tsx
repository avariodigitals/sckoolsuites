"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { naira } from "@/lib/utils";
import { TrendingUp, TrendingDown, Plus, Wallet, Settings, Trash2, BookOpen, BarChart3, Receipt } from "lucide-react";

interface Category {
  id: number;
  name: string;
}

interface IncomeRecord {
  id: number;
  categoryId: number;
  amount: number;
  description: string | null;
  source: string | null;
  date: string;
  isFromPayment: boolean;
  category?: Category;
}

interface ExpenseRecord {
  id: number;
  categoryId: number;
  amount: number;
  description: string | null;
  date: string;
  category?: Category;
}

interface BillRecord {
  id: string;
  invoiceNumber: string;
  studentName: string;
  className: string | null;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: "income" | "expense";
  description: string;
  category: string;
  amount: number;
}

type Tab = "income" | "expense" | "debtors" | "ledger" | "revenue";

export function FinanceManager({ defaultTab }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab ?? "income");
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "",
  });
  const [paymentMethods, setPaymentMethods] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const [incRes, expRes, incCatRes, expCatRes, billsRes, pmRes] = await Promise.all([
          fetch("/api/admin/finance/income", { cache: "no-store" }),
          fetch("/api/admin/finance/expense", { cache: "no-store" }),
          fetch("/api/admin/finance/income-categories", { cache: "no-store" }),
          fetch("/api/admin/finance/expense-categories", { cache: "no-store" }),
          fetch("/api/admin/bills", { cache: "no-store" }),
          fetch("/api/admin/payment-methods", { cache: "no-store" }),
        ]);
        if (pmRes.ok) {
          const pmData = await pmRes.json();
          setPaymentMethods((pmData.methods || []).filter((m: any) => m.is_active));
        }
        if (cancelled) return;
        if (incRes.ok) setIncomes(await incRes.json());
        if (expRes.ok) setExpenses(await expRes.json());
        if (incCatRes.ok) setIncomeCategories(await incCatRes.json());
        if (expCatRes.ok) setExpenseCategories(await expCatRes.json());
        if (billsRes.ok) {
          const billData = await billsRes.json();
          setBills(Array.isArray(billData) ? billData : billData.invoices ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.categoryId || !formData.amount) return;
    const endpoint = tab === "income" ? "/api/admin/finance/income" : "/api/admin/finance/expense";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: Number(formData.categoryId),
        amount: Number(formData.amount),
        description: formData.description,
        date: formData.date,
        paymentMethod: formData.paymentMethod || undefined,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setFormData({ categoryId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0], paymentMethod: "" });
      window.location.reload();
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const endpoint = tab === "income" ? "/api/admin/finance/income-categories" : "/api/admin/finance/expense-categories";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    if (res.ok) {
      setNewCategoryName("");
      const updated = await fetch(endpoint, { cache: "no-store" });
      if (updated.ok) {
        const data = await updated.json();
        if (tab === "income") setIncomeCategories(data);
        else setExpenseCategories(data);
      }
    }
  }

  async function deleteCategory(id: number) {
    if (!confirm("Delete this category?")) return;
    const endpoint = tab === "income" ? "/api/admin/finance/income-categories" : "/api/admin/finance/expense-categories";
    const res = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      if (tab === "income") setIncomeCategories((prev) => prev.filter((c) => c.id !== id));
      else setExpenseCategories((prev) => prev.filter((c) => c.id !== id));
    }
  }

  const categories = tab === "income" ? incomeCategories : expenseCategories;
  const records = tab === "income" ? incomes : expenses;
  const total = records.reduce((sum, r) => sum + Number(r.amount), 0);

  const debtors = useMemo(() => bills.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance), [bills]);
  const totalOutstanding = debtors.reduce((sum, b) => sum + b.balance, 0);

  const ledger = useMemo<LedgerEntry[]>(() => {
    const entries: LedgerEntry[] = [
      ...incomes.map((i) => ({ id: `inc-${i.id}`, date: i.date, type: "income" as const, description: i.description || i.source || "Income", category: i.category?.name || "—", amount: Number(i.amount) })),
      ...expenses.map((e) => ({ id: `exp-${e.id}`, date: e.date, type: "expense" as const, description: e.description || "Expense", category: e.category?.name || "—", amount: Number(e.amount) })),
    ];
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomes, expenses]);

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    incomes.forEach((i) => { const name = i.category?.name || "Uncategorized"; map.set(name, (map.get(name) || 0) + Number(i.amount)); });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [incomes]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => { const name = e.category?.name || "Uncategorized"; map.set(name, (map.get(name) || 0) + Number(e.amount)); });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netRevenue = totalIncome - totalExpenses;
  const isEditableTab = tab === "income" || tab === "expense";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button onClick={() => { setTab("income"); setShowForm(false); }} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "income" ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><TrendingUp className="h-4 w-4" />Income</button>
        <button onClick={() => { setTab("expense"); setShowForm(false); }} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "expense" ? "border-rose-500 text-rose-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><TrendingDown className="h-4 w-4" />Expenses</button>
        <button onClick={() => { setTab("debtors"); setShowForm(false); }} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "debtors" ? "border-amber-500 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><Receipt className="h-4 w-4" />Debtors</button>
        <button onClick={() => { setTab("ledger"); setShowForm(false); }} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "ledger" ? "border-indigo-500 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><BookOpen className="h-4 w-4" />Ledger</button>
        <button onClick={() => { setTab("revenue"); setShowForm(false); }} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "revenue" ? "border-cyan-500 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><BarChart3 className="h-4 w-4" />Revenue</button>
      </div>

      {isEditableTab && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-4">
              <p className="text-sm text-slate-500">Total {tab === "income" ? "Income" : "Expenses"}</p>
              <p className={`mt-1 text-2xl font-bold ${tab === "income" ? "text-emerald-700" : "text-rose-700"}`}>{naira(total)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-sm text-slate-500">Records</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{records.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-sm text-slate-500">Categories</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{categories.length}</p>
            </CardContent></Card>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{tab === "income" ? "Income Records" : "Expense Records"}</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => { setShowCatForm(!showCatForm); setShowForm(false); }}>
                <Settings className="mr-1 h-4 w-4" />Manage Categories
              </Button>
              <Button size="sm" onClick={() => { setShowForm(!showForm); setShowCatForm(false); }}>
                <Plus className="mr-1 h-4 w-4" />Add {tab === "income" ? "Income" : "Expense"}
              </Button>
            </div>
          </div>
        </>
      )}

      {tab === "debtors" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Outstanding</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{naira(totalOutstanding)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-sm text-slate-500">Debtor Bills</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{debtors.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Bills</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{bills.length}</p>
          </CardContent></Card>
        </div>
      )}

      {tab === "ledger" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Income</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{naira(totalIncome)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Expenses</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{naira(totalExpenses)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-sm text-slate-500">Net Position</p>
            <p className={`mt-1 text-2xl font-bold ${netRevenue >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{naira(netRevenue)}</p>
          </CardContent></Card>
        </div>
      )}

      {tab === "revenue" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Income</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{naira(totalIncome)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Expenses</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{naira(totalExpenses)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-sm text-slate-500">Net Revenue</p>
            <p className={`mt-1 text-2xl font-bold ${netRevenue >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{naira(netRevenue)}</p>
          </CardContent></Card>
        </div>
      )}

      {showForm && isEditableTab && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">Add {tab === "income" ? "Income" : "Expense"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.categoryId} onChange={(e) => setFormData((s) => ({ ...s, categoryId: e.target.value }))} required>
                  <option value="">Select...</option>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.amount} onChange={(e) => setFormData((s) => ({ ...s, amount: e.target.value }))} required min={0} step={0.01} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.date} onChange={(e) => setFormData((s) => ({ ...s, date: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white" value={formData.paymentMethod} onChange={(e) => setFormData((s) => ({ ...s, paymentMethod: e.target.value }))}>
                  <option value="">Select method...</option>
                  {paymentMethods.map((pm) => (<option key={pm.code} value={pm.code}>{pm.name}</option>))}
                  {paymentMethods.length === 0 && <option value="" disabled>No active methods — enable in Settings</option>}
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input type="text" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.description} onChange={(e) => setFormData((s) => ({ ...s, description: e.target.value }))} placeholder={`Optional description for this ${tab}...`} />
              </div>
              <div className="md:col-span-4 flex gap-2">
                <Button type="submit" size="sm">Save</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showCatForm && isEditableTab && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3"><CardTitle className="text-base">{tab === "income" ? "Income" : "Expense"} Categories</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addCategory} className="flex gap-2">
              <input type="text" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="New category name..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} required />
              <Button type="submit" size="sm">Add</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm">
                  <span>{c.name}</span>
                  <button onClick={() => deleteCategory(c.id)} className="ml-1 text-slate-400 hover:text-rose-600" title="Delete"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-slate-400">No categories yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {isEditableTab && (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center">
                <Wallet className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No {tab} records yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  {tab === "income" ? "Income from bill payments will appear here automatically. You can also add manual income." : "Add your first expense record using the button above."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Method</TableHead>
                    {tab === "income" && <TableHead>Source</TableHead>}
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-slate-600">{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell><Badge className="capitalize bg-slate-50 border-slate-200 text-slate-700">{record.category?.name || "—"}</Badge></TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">{record.description || "—"}</TableCell>
                      <TableCell>{record.paymentMethod ? <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">{record.paymentMethod.replace(/_/g, " ")}</Badge> : <span className="text-slate-400">—</span>}</TableCell>
                      {tab === "income" && (
                        <TableCell>{record.isFromPayment ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Auto</Badge> : <Badge className="bg-slate-50 text-slate-600 border-slate-200">Manual</Badge>}</TableCell>
                      )}
                      <TableCell className="text-right font-medium">{naira(record.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "debtors" && (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
            ) : debtors.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No outstanding debtors.</p>
                <p className="text-xs text-slate-400 mt-1">All bills have been paid.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtors.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="text-slate-600">{bill.invoiceNumber}</TableCell>
                      <TableCell className="font-medium text-slate-900">{bill.studentName}</TableCell>
                      <TableCell className="text-slate-600">{bill.className || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`capitalize ${bill.status === "UNPAID" ? "bg-rose-50 text-rose-700 border-rose-200" : bill.status === "PART_PAYMENT" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{bill.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{naira(bill.totalAmount)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{naira(bill.amountPaid)}</TableCell>
                      <TableCell className="text-right font-bold text-rose-600">{naira(bill.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "ledger" && (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
            ) : ledger.length === 0 ? (
              <div className="p-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No ledger entries yet.</p>
                <p className="text-xs text-slate-400 mt-1">Income and expense records will appear here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-slate-600">{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell><Badge className={`capitalize ${entry.type === "income" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>{entry.type}</Badge></TableCell>
                      <TableCell className="text-slate-600">{entry.category}</TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">{entry.description}</TableCell>
                      <TableCell className={`text-right font-medium ${entry.type === "income" ? "text-emerald-700" : "text-rose-700"}`}>{entry.type === "income" ? "+" : "−"}{naira(entry.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "revenue" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200">
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-slate-900">Income by Category</CardTitle></CardHeader>
            <CardContent>
              {incomeByCategory.length === 0 ? <p className="text-sm text-slate-500">No income data.</p> : (
                <div className="space-y-3">
                  {incomeByCategory.map(([name, amount]) => (
                    <div key={name} className="flex items-center justify-between"><span className="text-sm text-slate-700">{name}</span><span className="text-sm font-medium text-slate-900">{naira(amount)}</span></div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-slate-900">Expenses by Category</CardTitle></CardHeader>
            <CardContent>
              {expenseByCategory.length === 0 ? <p className="text-sm text-slate-500">No expense data.</p> : (
                <div className="space-y-3">
                  {expenseByCategory.map(([name, amount]) => (
                    <div key={name} className="flex items-center justify-between"><span className="text-sm text-slate-700">{name}</span><span className="text-sm font-medium text-slate-900">{naira(amount)}</span></div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-slate-200 lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-slate-900">Revenue Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-emerald-50 p-4"><p className="text-sm text-emerald-700">Total Income</p><p className="mt-1 text-xl font-bold text-emerald-900">{naira(totalIncome)}</p></div>
                <div className="rounded-lg bg-rose-50 p-4"><p className="text-sm text-rose-700">Total Expenses</p><p className="mt-1 text-xl font-bold text-rose-900">{naira(totalExpenses)}</p></div>
                <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-700">Net Revenue</p><p className={`mt-1 text-xl font-bold ${netRevenue >= 0 ? "text-emerald-900" : "text-rose-900"}`}>{naira(netRevenue)}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
