"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";

type BillStatus = "UNPAID" | "PART_PAYMENT" | "PAID" | "PENDING";

type BillItem = {
  id: string;
  feeItemId: string;
  feeItemName: string;
  amount: number;
};

type Payment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
};

type Bill = {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  classId: string | null;
  className: string | null;
  parentName: string | null;
  termId: string;
  termName: string;
  sessionId: string;
  sessionName: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: BillStatus;
  dueDate: string | null;
  createdAt: string;
  paymentInstructions: string | null;
  items: BillItem[];
  payments: Payment[];
};

type Stats = {
  totalBills: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
};

type Student = {
  id: string;
  name: string;
  email: string | null;
  classId: string | null;
  className: string | null;
};

type ClassOption = { id: string; name: string };
type TermOption = { id: string; name: string };
type SessionOption = { id: string; name: string };

type FeeItem = {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  isOptional: boolean;
};

type FeeGroup = {
  id: string;
  name: string;
  feeItems: FeeItem[];
};

const statusConfig: Record<BillStatus, { label: string; color: string; bg: string }> = {
  UNPAID: { label: "Unpaid", color: "text-rose-700", bg: "bg-rose-100" },
  PART_PAYMENT: { label: "Partial", color: "text-amber-700", bg: "bg-amber-100" },
  PAID: { label: "Paid", color: "text-emerald-700", bg: "bg-emerald-100" },
  PENDING: { label: "Pending", color: "text-blue-700", bg: "bg-blue-100" },
};

const paymentMethods = ["Cash", "Bank Transfer", "Card", "Mobile Money", "Cheque", "Other"];

export function BillManager() {
  const confirm = useConfirm();
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<Stats>({ totalBills: 0, totalPaid: 0, totalOutstanding: 0, totalOverdue: 0 });
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  // Forms
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Create bill form
  const [createForm, setCreateForm] = useState({
    studentId: "",
    classId: "",
    termId: "",
    sessionId: "",
    dueDate: "",
    paymentInstructions: "",
  });
  const [selectedItems, setSelectedItems] = useState<{ feeItemId: string; amount: number; name: string }[]>([]);

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "Cash",
  });

  const [submitting, setSubmitting] = useState(false);

  const filteredBills = useMemo(() => {
    let result = bills;
    if (statusFilter !== "ALL") {
      result = result.filter((b) => b.status === statusFilter);
    }
    if (selectedStudentId) {
      result = result.filter((b) => b.studentId === selectedStudentId);
    }
    if (selectedClassId) {
      result = result.filter((b) => b.classId === selectedClassId);
    }
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(
      (b) =>
        b.invoiceNumber.toLowerCase().includes(query) ||
        b.studentName.toLowerCase().includes(query) ||
        b.studentEmail?.toLowerCase().includes(query)
    );
  }, [bills, statusFilter, selectedStudentId, selectedClassId, searchQuery]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const url = new URL("/api/admin/bills", window.location.origin);
      if (statusFilter !== "ALL") {
        url.searchParams.set("status", statusFilter);
      }
      if (selectedStudentId) {
        url.searchParams.set("studentId", selectedStudentId);
      }
      if (selectedClassId) {
        url.searchParams.set("classId", selectedClassId);
      }
      if (searchQuery.trim()) {
        url.searchParams.set("q", searchQuery.trim());
      }

      const response = await fetch(url.toString(), { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Unable to load bills.");
        return;
      }
      setBills(payload.bills ?? []);
      setStats(payload.stats ?? { totalBills: 0, totalPaid: 0, totalOutstanding: 0, totalOverdue: 0 });
      setStudents(payload.students ?? []);
      setClasses(payload.classes ?? []);
      setTerms(payload.terms ?? []);
      setSessions(payload.sessions ?? []);
      setFeeGroups(payload.feeGroups ?? []);
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
  }, []);

  // Filter debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, selectedStudentId, selectedClassId]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  function handleAddItem(feeItem: FeeItem) {
    if (selectedItems.some((i) => i.feeItemId === feeItem.id)) {
      setSelectedItems((prev) => prev.filter((i) => i.feeItemId !== feeItem.id));
    } else {
      setSelectedItems((prev) => [
        ...prev,
        { feeItemId: feeItem.id, amount: feeItem.amount, name: feeItem.name },
      ]);
    }
  }

  function getTotalAmount() {
    return selectedItems.reduce((sum, item) => sum + item.amount, 0);
  }

  async function handleCreateBill() {
    if (!createForm.studentId || !createForm.termId || !createForm.sessionId || selectedItems.length === 0) {
      setStatus("Please fill all required fields and select at least one fee item.");
      return;
    }

    setStatus("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: createForm.studentId,
          classId: createForm.classId || null,
          termId: createForm.termId,
          sessionId: createForm.sessionId,
          dueDate: createForm.dueDate || null,
          paymentInstructions: createForm.paymentInstructions || null,
          items: selectedItems.map((i) => ({ feeItemId: i.feeItemId, amount: i.amount })),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to create bill.");
        return;
      }

      setCreateForm({
        studentId: "",
        classId: "",
        termId: "",
        sessionId: "",
        dueDate: "",
        paymentInstructions: "",
      });
      setSelectedItems([]);
      setShowCreateForm(false);
      setStatus("Bill created successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordPayment() {
    if (!selectedBill || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      setStatus("Please enter a valid amount.");
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (amount > selectedBill.balance) {
      setStatus(`Amount cannot exceed outstanding balance (${formatCurrency(selectedBill.balance)}).`);
      return;
    }

    setStatus("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/bills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedBill.id,
          amount,
          method: paymentForm.method,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to record payment.");
        return;
      }

      setPaymentForm({ amount: "", method: "Cash" });
      setShowPaymentForm(false);
      setSelectedBill(null);
      setStatus("Payment recorded successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(bill: Bill) {
    if (!(await confirm({
      title: "Delete Bill",
      message: `Delete bill ${bill.invoiceNumber} for ${bill.studentName}? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    }))) {
      return;
    }

    if (bill.payments.length > 0) {
      setStatus("Cannot delete bill with recorded payments.");
      return;
    }

    setStatus("");
    try {
      const response = await fetch(`/api/admin/bills/${bill.id}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to delete bill.");
        return;
      }

      setStatus("Bill deleted successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading bills...</div>;
  }

  return (
    <div className="space-y-6">
      {status && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${status.includes("successfully") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Bills</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{stats.totalBills.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Collected</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(stats.totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Outstanding</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">{formatCurrency(stats.totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 sm:p-4">
          <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Overdue</p>
          <p className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">{stats.totalOverdue.toLocaleString()}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PAID">Paid</option>
            <option value="PART_PAYMENT">Partial</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PENDING">Pending</option>
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">All Students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:max-w-xs"
          />
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? "Cancel" : "+ New Bill"}
          </Button>
        </div>
      </div>

      {/* Create Bill Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New Bill</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Student *</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={createForm.studentId}
                onChange={(e) => {
                  const student = students.find((s) => s.id === e.target.value);
                  setCreateForm((prev) => ({
                    ...prev,
                    studentId: e.target.value,
                    classId: student?.classId || "",
                  }));
                }}
              >
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} {s.className ? `(${s.className})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Term *</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={createForm.termId}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, termId: e.target.value }))}
              >
                <option value="">Select Term</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Session *</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={createForm.sessionId}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, sessionId: e.target.value }))}
              >
                <option value="">Select Session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <Input
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Instructions</label>
              <Input
                placeholder="e.g., Pay to School Account: 1234567890"
                value={createForm.paymentInstructions}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, paymentInstructions: e.target.value }))}
              />
            </div>
          </div>

          {/* Fee Items Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Fee Items *</label>
            <div className="rounded-lg border border-slate-200 divide-y">
              {feeGroups.map((fg) => (
                <div key={fg.id} className="p-3">
                  <p className="text-sm font-medium text-slate-900 mb-2">{fg.name}</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {fg.feeItems.map((fi) => {
                      const isSelected = selectedItems.some((i) => i.feeItemId === fi.id);
                      return (
                        <button
                          key={fi.id}
                          onClick={() => handleAddItem(fi)}
                          className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <p className={`text-sm font-medium ${isSelected ? "text-emerald-900" : "text-slate-900"}`}>
                              {fi.name}
                            </p>
                            {fi.description && (
                              <p className={`text-xs ${isSelected ? "text-emerald-600" : "text-slate-500"}`}>
                                {fi.description}
                              </p>
                            )}
                          </div>
                          <p className={`text-sm font-semibold ${isSelected ? "text-emerald-700" : "text-slate-700"}`}>
                            {formatCurrency(fi.amount)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Items Summary */}
          {selectedItems.length > 0 && (
            <div className="rounded-lg bg-slate-50 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Selected Items</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(getTotalAmount())}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item) => (
                  <span key={item.feeItemId} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm border border-slate-200">
                    {item.name}
                    <button
                      onClick={() => handleAddItem({ id: item.feeItemId, name: item.name, amount: item.amount, description: null, isOptional: false })}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCreateBill} disabled={submitting}>
              {submitting ? "Creating..." : "Create Bill"}
            </Button>
            <Button variant="outline" onClick={() => { setShowCreateForm(false); setSelectedItems([]); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Payment Form */}
      {showPaymentForm && selectedBill && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Record Payment</h3>
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">Bill: <span className="font-medium text-slate-900">{selectedBill.invoiceNumber}</span></p>
            <p className="text-sm text-slate-600">Student: <span className="font-medium text-slate-900">{selectedBill.studentName}</span></p>
            <p className="text-sm text-slate-600">Outstanding: <span className="font-medium text-rose-700">{formatCurrency(selectedBill.balance)}</span></p>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <Input
                type="number"
                step="0.01"
                max={selectedBill.balance}
                placeholder={`Max: ${formatCurrency(selectedBill.balance)}`}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
              >
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRecordPayment} disabled={submitting}>
              {submitting ? "Processing..." : "Record Payment"}
            </Button>
            <Button variant="outline" onClick={() => { setShowPaymentForm(false); setSelectedBill(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Bills Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">Bills ({filteredBills.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Term/Session</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No bills found. Create your first bill.
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-slate-900">{bill.invoiceNumber}</p>
                      <p className="text-xs text-slate-500">{new Date(bill.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-slate-900">{bill.studentName}</p>
                      <p className="text-xs text-slate-500">{bill.className || "No class"}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-slate-900">{bill.termName}</p>
                      <p className="text-xs text-slate-500">{bill.sessionName}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <p className="text-sm font-medium text-slate-900">{formatCurrency(bill.totalAmount)}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <p className="text-sm text-emerald-600">{formatCurrency(bill.amountPaid)}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <p className={`text-sm font-medium ${bill.balance > 0 ? "text-rose-600" : "text-slate-500"}`}>
                        {formatCurrency(bill.balance)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig[bill.status].bg} ${statusConfig[bill.status].color}`}>
                        {statusConfig[bill.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {bill.balance > 0 && (
                          <Button
                            size="sm"
                            onClick={() => { setSelectedBill(bill); setShowPaymentForm(true); }}
                          >
                            Pay
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(bill)}
                          disabled={bill.payments.length > 0}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
