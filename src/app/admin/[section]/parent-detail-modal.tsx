"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  User,
  Phone,
  Users,
  Wallet,
  CreditCard,
  MessageSquare,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { InfoRow, Section, Empty, TableWrap, StatusBadge } from "./student-detail-tabs";
import { formatDate, naira } from "@/lib/utils";

type TabKey = "basic" | "contact" | "login" | "children" | "guardians" | "billing" | "payments" | "messages" | "complaints";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "basic", label: "Basic", icon: <User className="h-4 w-4" /> },
  { key: "contact", label: "Contact", icon: <Phone className="h-4 w-4" /> },
  { key: "login", label: "User Login", icon: <User className="h-4 w-4" /> },
  { key: "children", label: "Children", icon: <Users className="h-4 w-4" /> },
  { key: "guardians", label: "Guardians", icon: <Users className="h-4 w-4" /> },
  { key: "billing", label: "Billing", icon: <Wallet className="h-4 w-4" /> },
  { key: "payments", label: "Payments", icon: <CreditCard className="h-4 w-4" /> },
  { key: "messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
  { key: "complaints", label: "Complaints", icon: <AlertCircle className="h-4 w-4" /> },
];

export function ParentDetailModal({ parentId, onClose }: { parentId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", isActive: true, phone: "", address: "", emergencyContact: "" });
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/parents/${parentId}/detail`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? "Failed to load parent details.");
        return;
      }
      setData(payload);
      setForm({
        name: payload.parent?.user?.name ?? "",
        email: payload.parent?.user?.email ?? "",
        isActive: payload.parent?.user?.isActive ?? true,
        phone: payload.profile?.phone ?? "",
        address: payload.profile?.address ?? "",
        emergencyContact: payload.profile?.emergencyContact ?? "",
      });
    } catch {
      setError("Failed to load parent details.");
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    async function fetchData() {
      await load();
    }
    fetchData();
  }, [load]);

  const p = data?.parent;

  async function save(fields: Partial<typeof form> & { password?: string }) {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/parents/${parentId}/detail`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(payload?.error ?? "Failed to save.");
      } else {
        setMessage("Saved successfully.");
        await load();
        setEditing(false);
      }
    } catch {
      setMessage("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!window.confirm(`Are you sure you want to ${form.isActive ? "deactivate" : "activate"} this parent?`)) return;
    await save({ isActive: !form.isActive });
  }

  async function handleResetPassword() {
    if (!password || password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (!window.confirm("Reset this parent's password?")) return;
    await save({ password });
    setPassword("");
  }

  function renderContent() {
    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading parent details...
        </div>
      );
    }
    if (error) {
      return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
    }
    if (!p) return null;

    switch (activeTab) {
      case "basic":
        return (
          <Section title="Basic Information">
            {message ? <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${message.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{message}</div> : null}
            <div className="mb-4 flex justify-end">
              {editing ? (
                <div className="flex gap-2">
                  <button onClick={() => save({ name: form.name, email: form.email, isActive: form.isActive })} disabled={saving} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                  <button onClick={() => setEditing(false)} disabled={saving} className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">Edit</button>
              )}
            </div>
            {editing ? (
              <div className="grid gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Full Name</label>
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Email</label>
                  <input type="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2">
                  <input id="active" type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                  <label htmlFor="active" className="text-xs font-medium text-slate-700">Active account</label>
                </div>
              </div>
            ) : (
              <>
                <InfoRow label="Full Name" value={p.user?.name} />
                <InfoRow label="Email" value={p.user?.email} />
                <InfoRow label="Status" value={p.user?.isActive ? "Active" : "Inactive"} />
                <InfoRow label="Created At" value={formatDate(p.createdAt)} />
                <InfoRow label="Linked Children" value={p.students?.length ?? 0} />
              </>
            )}
          </Section>
        );
      case "contact":
        return (
          <Section title="Contact Information">
            {message ? <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${message.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{message}</div> : null}
            <div className="mb-4 flex justify-end">
              {editing ? (
                <div className="flex gap-2">
                  <button onClick={() => save({ phone: form.phone, address: form.address, emergencyContact: form.emergencyContact })} disabled={saving} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                  <button onClick={() => setEditing(false)} disabled={saving} className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">Edit</button>
              )}
            </div>
            {editing ? (
              <div className="grid gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Phone</label>
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Emergency Contact</label>
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.emergencyContact} onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Address</label>
                  <textarea className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
            ) : (
              <>
                <InfoRow label="Phone" value={data?.profile?.phone || "—"} />
                <InfoRow label="Address" value={data?.profile?.address || "—"} />
                <InfoRow label="Emergency Contact" value={data?.profile?.emergencyContact || "—"} />
                <InfoRow label="Account Email" value={p.user?.email} />
              </>
            )}
          </Section>
        );
      case "login":
        return (
          <Section title="User Login">
            {message ? <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${message.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{message}</div> : null}
            <InfoRow label="User ID" value={p.user?.id} />
            <InfoRow label="Email" value={p.user?.email} />
            <InfoRow label="Account Status" value={p.user?.isActive ? "Active" : "Inactive"} />
            <InfoRow label="Role" value="Parent" />
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Reset Password</h4>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="New password (min 6)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={handleResetPassword}
                  disabled={saving}
                  className="rounded bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Reset"}
                </button>
              </div>
            </div>
          </Section>
        );
      case "children":
        return (
          <Section title="Linked Children">
            {p.students?.length ? (
              <TableWrap>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Gender</th>
                      <th className="px-3 py-2">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.students.map((student: any) => (
                      <tr key={student.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-900">{student.user?.name}</td>
                        <td className="px-3 py-2">{student.class?.name ?? "—"}</td>
                        <td className="px-3 py-2">{student.gender ?? "—"}</td>
                        <td className="px-3 py-2">{student.age ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <Empty text="No children linked to this parent." />
            )}
          </Section>
        );
      case "guardians":
        return (
          <Section title="Guardian Bio Data">
            {data?.additionalGuardians?.length ? (
              <div className="grid gap-4">
                {data.additionalGuardians.map((guardian: any) => (
                  <div key={guardian.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {guardian.parent?.user?.avatarUrl ? (
                          <Image src={guardian.parent.user.avatarUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                            {guardian.parent?.user?.name?.charAt(0)?.toUpperCase() ?? "G"}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{guardian.parent?.user?.name ?? "Guardian"}</h4>
                          <p className="text-xs text-slate-500">{guardian.parent?.user?.email}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${guardian.isPrimary ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {guardian.isPrimary ? "Primary" : "Secondary"}
                      </span>
                    </div>
                    <InfoRow label="Guardian ID" value={guardian.parent?.id} />
                    <InfoRow label="User ID" value={guardian.parent?.user?.id} />
                    <InfoRow label="Student" value={guardian.student?.user?.name} />
                    <InfoRow label="Relationship" value={guardian.relationship ?? "—"} />
                    <InfoRow label="Registered On" value={formatDate(guardian.createdAt)} />
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No guardian records found for this parent's children." />
            )}
          </Section>
        );
      case "billing":
        return (
          <Section title="Billing Summary">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Outstanding</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{naira(data?.outstanding ?? 0)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Invoices</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{data?.invoices?.length ?? 0}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Paid</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{naira(data?.totalPaid ?? 0)}</div>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Recent Invoices</h4>
              {data?.invoices?.length ? (
                <TableWrap>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                        <th className="px-3 py-2">Invoice</th>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Term</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((invoice: any) => (
                        <tr key={invoice.id} className="border-b border-slate-100">
                          <td className="px-3 py-2">{invoice.invoiceNumber}</td>
                          <td className="px-3 py-2">{invoice.student?.user?.name}</td>
                          <td className="px-3 py-2">{invoice.term?.name}</td>
                          <td className="px-3 py-2 text-right">{naira(invoice.totalAmount)}</td>
                          <td className="px-3 py-2 text-right">{naira(invoice.balance)}</td>
                          <td className="px-3 py-2">
                            <StatusBadge text={invoice.status} color={invoice.status === "PAID" ? "emerald" : invoice.status === "PART_PAYMENT" ? "amber" : "rose"} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              ) : (
                <Empty text="No invoices found." />
              )}
            </div>
          </Section>
        );
      case "payments":
        return (
          <Section title="Payments & Receipts">
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Payments</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{data?.payments?.length ?? 0}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Receipts</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{data?.receipts?.length ?? 0}</div>
              </div>
            </div>
            {data?.payments?.length ? (
              <TableWrap>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((payment: any) => (
                      <tr key={payment.id} className="border-b border-slate-100">
                        <td className="px-3 py-2">{formatDate(payment.paymentDate)}</td>
                        <td className="px-3 py-2">{payment.student?.user?.name}</td>
                        <td className="px-3 py-2 text-right">{naira(payment.amount)}</td>
                        <td className="px-3 py-2">{payment.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <Empty text="No payments recorded." />
            )}
          </Section>
        );
      case "messages":
        return (
          <Section title="Messages to School">
            {data?.messages?.length ? (
              <div className="space-y-3">
                {data.messages.map((message: any) => (
                  <div key={message.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{message.subject}</span>
                      <StatusBadge text={message.status} color={message.status === "REPLIED" ? "blue" : message.status === "CLOSED" ? "slate" : "emerald"} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{message.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(message.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No messages found." />
            )}
          </Section>
        );
      case "complaints":
        return (
          <Section title="Complaints">
            {data?.complaints?.length ? (
              <div className="space-y-3">
                {data.complaints.map((complaint: any) => (
                  <div key={complaint.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{complaint.subject}</span>
                      <StatusBadge text={complaint.status} color={complaint.status === "RESOLVED" ? "emerald" : complaint.status === "IN_REVIEW" ? "amber" : "blue"} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{complaint.complaint}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(complaint.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No complaints found." />
            )}
          </Section>
        );
      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-8">
      <div className="flex h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Left Sidebar Tabs */}
        <div className="flex w-52 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sections</span>
            <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setEditing(false); setMessage(""); }}
                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
                  activeTab === t.key
                    ? "bg-indigo-50 font-medium text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                {p?.user?.avatarUrl ? (
                  <Image src={p.user.avatarUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {p?.user?.name?.charAt(0)?.toUpperCase() ?? "P"}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">{p?.user?.name ?? "Parent Details"}</h2>
                <p className="text-xs text-slate-500">
                  {p?.students?.length ?? 0} children · {p?.user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${p?.user?.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {p?.user?.isActive ? "Active" : "Inactive"}
              </span>
              <button
                onClick={handleToggleActive}
                disabled={saving}
                className={`rounded px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${p?.user?.isActive ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {saving ? "..." : p?.user?.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
