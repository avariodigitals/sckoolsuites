"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Building2 } from "lucide-react";

const methodDescriptions: Record<string, string> = {
  CASH: "Accept cash payments at the school office or reception.",
  CHEQUE: "Accept cheque payments. Cheques must clear before confirmation.",
  POS: "Accept card payments via POS terminal at the school.",
  CARD: "Accept online card payments via payment gateway (Paystack, Flutterwave, etc.).",
  BANK_TRANSFER: "Parents transfer directly to school bank account(s).",
};

type PaymentMethod = {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  sort_order: number;
};

type BankAccount = {
  id: number;
  account_name: string;
  bank_name: string;
  account_number: string;
  branch: string;
  instructions: string;
  is_active: boolean;
};

export function PaymentMethodsManager() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState({
    account_name: "",
    bank_name: "",
    account_number: "",
    branch: "",
    instructions: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/payment-methods", { cache: "no-store" });
        const data = await res.json();
        if (!mounted) return;
        setMethods(data.methods || []);
        setAccounts(data.accounts || []);
      } catch {
        if (mounted) setStatus("Failed to load payment settings.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function toggleMethod(code: string, active: boolean) {
    try {
      await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "toggle_method", code, is_active: active }),
      });
      setMethods((prev) => prev.map((m) => (m.code === code ? { ...m, is_active: active } : m)));
      setStatus(`${active ? "Enabled" : "Disabled"} successfully.`);
    } catch {
      setStatus("Update failed.");
    }
  }

  async function addAccount() {
    if (!accountForm.account_name || !accountForm.bank_name) {
      setStatus("Account name and bank name are required.");
      return;
    }
    try {
      await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "add_account", ...accountForm }),
      });
      setAccountForm({ account_name: "", bank_name: "", account_number: "", branch: "", instructions: "" });
      setShowAccountForm(false);
      const refresh = await fetch("/api/admin/payment-methods", { cache: "no-store" });
      const d = await refresh.json();
      setMethods(d.methods || []);
      setAccounts(d.accounts || []);
      setStatus("Bank account added.");
    } catch {
      setStatus("Failed to add account.");
    }
  }

  async function deleteAccount(id: number) {
    if (!confirm("Delete this bank account?")) return;
    try {
      await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "delete_account", id }),
      });
      const refresh = await fetch("/api/admin/payment-methods", { cache: "no-store" });
      const d = await refresh.json();
      setMethods(d.methods || []);
      setAccounts(d.accounts || []);
      setStatus("Account removed.");
    } catch {
      setStatus("Delete failed.");
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Loading...</div>;

  return (
    <div className="space-y-8">
      {status && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${status.includes("Failed") || status.includes("failed") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {status}
        </div>
      )}

      {/* Payment Methods Toggles */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Active Payment Methods</h4>
        <p className="text-xs text-slate-500 mb-4">Toggle which methods parents can use to pay fees. Only enabled methods appear on fee payment pages.</p>
        <div className="space-y-3">
          {methods.map((method) => (
            <div key={method.code} className={`rounded-lg border p-4 transition-colors ${method.is_active ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{method.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{methodDescriptions[method.code]}</p>
                </div>
                <button
                  onClick={() => toggleMethod(method.code, !method.is_active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${method.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${method.is_active ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bank Accounts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">School Bank Accounts</h4>
            <p className="text-xs text-slate-500">Add bank accounts for bank transfer payments. Parents will see these details.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAccountForm(!showAccountForm)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {showAccountForm ? "Cancel" : "Add Account"}
          </Button>
        </div>

        {showAccountForm && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Account Name *</label>
                <Input value={accountForm.account_name} onChange={(e) => setAccountForm((f) => ({ ...f, account_name: e.target.value }))} placeholder="e.g. School Fees Account" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Bank Name *</label>
                <Input value={accountForm.bank_name} onChange={(e) => setAccountForm((f) => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. First Bank" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Account Number</label>
                <Input value={accountForm.account_number} onChange={(e) => setAccountForm((f) => ({ ...f, account_number: e.target.value }))} placeholder="1234567890" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Branch</label>
                <Input value={accountForm.branch} onChange={(e) => setAccountForm((f) => ({ ...f, branch: e.target.value }))} placeholder="e.g. Ikeja Branch" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Instructions for Parents</label>
                <Textarea
                  value={accountForm.instructions}
                  onChange={(e) => setAccountForm((f) => ({ ...f, instructions: e.target.value }))}
                  placeholder="e.g., Please include student admission number in the transfer narration..."
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={addAccount}>Save Account</Button>
            </div>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            <Building2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            No bank accounts added yet.
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{acc.account_name}</p>
                  <p className="text-xs text-slate-500">{acc.bank_name} {acc.account_number ? `• ${acc.account_number}` : ""}</p>
                  {acc.instructions && <p className="text-xs text-slate-400 mt-1 italic">{acc.instructions}</p>}
                </div>
                <button onClick={() => deleteAccount(acc.id)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-rose-50" title="Remove">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
