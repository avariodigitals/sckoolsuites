import React, { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { useActiveSession } from "@/components/active-session-provider";
import { getCloudinaryInlineUrl } from "@/lib/utils";

/* ─── Helpers ─── */
export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value ?? "—"}</span>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div>;
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-slate-200">{children}</div>;
}

export function StatusBadge({ text, color }: { text: string; color: "emerald" | "amber" | "rose" | "blue" | "slate" }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    blue: "bg-blue-100 text-blue-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${map[color]}`}>{text}</span>;
}

/* ─── Tabs ─── */

function FieldCard({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{children ?? value ?? "—"}</div>
    </div>
  );
}

function EditSectionHeader({ title, editing, onEdit, onCancel, onSave, saving }: { title: string; editing: boolean; onEdit: () => void; onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="flex gap-2">
        {editing ? (
          <>
            <button onClick={onSave} disabled={saving} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={onCancel} className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300">Cancel</button>
          </>
        ) : (
          <button onClick={onEdit} className="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">Edit</button>
        )}
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, type = "text", max }: { label: string; value: string; onChange: (v: string) => void; type?: string; max?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <input type={type} value={value} max={max} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
  );
}

function LabeledSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function EditBtn({ editing, onEdit, onCancel, onSave, saving }: { editing: boolean; onEdit: () => void; onCancel: () => void; onSave: () => void; saving: boolean }) {
  if (editing) {
    return (
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        <button onClick={onCancel} className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300">Cancel</button>
      </div>
    );
  }
  return <button onClick={onEdit} className="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">Edit</button>;
}

function calcAge(dob: string) {
  const b = new Date(dob); const n = new Date();
  let y = n.getFullYear() - b.getFullYear();
  let mo = n.getMonth() - b.getMonth();
  let d = n.getDate() - b.getDate();
  if (d < 0) { mo--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); }
  if (mo < 0) { y--; mo += 12; }
  const p: string[] = [];
  if (y > 0) p.push(`${y} yr${y !== 1 ? "s" : ""}`);
  if (mo > 0) p.push(`${mo} mo${mo !== 1 ? "s" : ""}`);
  if (d > 0) p.push(`${d} day${d !== 1 ? "s" : ""}`);
  return p.join(" ") || "0 days";
}

export function ProfileTab({ student, studentId, onUpdate }: { student: any; studentId: string; onUpdate: () => void }) {
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [pForm, setPForm] = useState({
    firstName: student.firstName ?? "", middleName: student.middleName ?? "", lastName: student.lastName ?? "",
    gender: student.gender ?? "MALE", age: String(student.age ?? ""),
    dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).split("T")[0] : "",
    sportHouse: student.sportHouse ?? "", coCurricular: student.coCurricular ?? "", responsibilities: student.responsibilities ?? "",
  });
  const [cForm, setCForm] = useState({ phone: student.user?.phone ?? "", address: student.user?.address ?? "" });
  const [emailVal, setEmailVal] = useState(student.user?.email ?? "");

  async function patch(body: Record<string, unknown>, okMsg: string, done: () => void) {
    setSaving(true); setMsg("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(payload?.error ?? "Failed to update.");
      else { setMsg(okMsg); done(); await onUpdate(); }
    } catch { setMsg("An error occurred."); }
    finally { setSaving(false); }
  }

  async function resetPassword() {
    if (!newPassword || newPassword.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    if (!window.confirm("Reset this student's password?")) return;
    setSaving(true); setMsg("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}/password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: newPassword }) });
      if (!res.ok) { const p = await res.json().catch(() => ({})); setMsg(p?.error ?? "Failed."); }
      else { setMsg("Password reset successfully."); setNewPassword(""); }
    } catch { setMsg("An error occurred."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      {msg && <div className={`rounded-lg border px-3 py-2 text-sm ${msg.includes("success") || msg.includes("updated") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{msg}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Personal Information</h3>
          <EditBtn editing={editingPersonal} onEdit={() => setEditingPersonal(true)} onCancel={() => { setEditingPersonal(false); setPForm({ firstName: student.firstName ?? "", middleName: student.middleName ?? "", lastName: student.lastName ?? "", gender: student.gender ?? "MALE", age: String(student.age ?? ""), dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).split("T")[0] : "", sportHouse: student.sportHouse ?? "", coCurricular: student.coCurricular ?? "", responsibilities: student.responsibilities ?? "" }); setMsg(""); }} onSave={() => patch({ firstName: pForm.firstName.trim(), middleName: pForm.middleName.trim() || null, lastName: pForm.lastName.trim(), gender: pForm.gender, age: Number(pForm.age) || 0, dateOfBirth: pForm.dateOfBirth || null, sportHouse: pForm.sportHouse.trim() || null, coCurricular: pForm.coCurricular.trim() || null, responsibilities: pForm.responsibilities.trim() || null }, "Personal info updated.", () => setEditingPersonal(false))} saving={saving} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {editingPersonal ? (
            <>
              <LabeledInput label="First Name" value={pForm.firstName} onChange={(v) => setPForm((p) => ({ ...p, firstName: v }))} />
              <LabeledInput label="Middle Name" value={pForm.middleName} onChange={(v) => setPForm((p) => ({ ...p, middleName: v }))} />
              <LabeledInput label="Last Name" value={pForm.lastName} onChange={(v) => setPForm((p) => ({ ...p, lastName: v }))} />
              <LabeledSelect label="Gender" value={pForm.gender} onChange={(v) => setPForm((p) => ({ ...p, gender: v }))} options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other" }]} />
              <LabeledInput label="Date of Birth" type="date" value={pForm.dateOfBirth} max={new Date().toISOString().split("T")[0]} onChange={(v) => { const ageNum = v ? (() => { const b = new Date(v); const n = new Date(); let a = n.getFullYear() - b.getFullYear(); const m = n.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--; return Math.max(0, a); })() : ""; setPForm((p) => ({ ...p, dateOfBirth: v, age: String(ageNum) })); }} />
              {pForm.dateOfBirth && <div className="flex items-end text-xs text-slate-500 pb-2">Age: {calcAge(pForm.dateOfBirth)}</div>}
              <LabeledInput label="Sport House" value={pForm.sportHouse} onChange={(v) => setPForm((p) => ({ ...p, sportHouse: v }))} />
              <LabeledInput label="Co-curricular" value={pForm.coCurricular} onChange={(v) => setPForm((p) => ({ ...p, coCurricular: v }))} />
              <LabeledInput label="Responsibilities" value={pForm.responsibilities} onChange={(v) => setPForm((p) => ({ ...p, responsibilities: v }))} />
            </>
          ) : (
            <>
              <FieldCard label="First Name" value={student.firstName} />
              <FieldCard label="Middle Name" value={student.middleName} />
              <FieldCard label="Last Name" value={student.lastName} />
              <FieldCard label="Gender" value={student.gender} />
              <FieldCard label="Date of Birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"} />
              <FieldCard label="Age" value={student.dateOfBirth ? calcAge(student.dateOfBirth) : `${student.age} years`} />
              <FieldCard label="Sport House" value={student.sportHouse} />
              <FieldCard label="Co-curricular" value={student.coCurricular} />
              <FieldCard label="Responsibilities" value={student.responsibilities} />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Contact Details</h3>
            <EditBtn editing={editingContact} onEdit={() => setEditingContact(true)} onCancel={() => { setEditingContact(false); setCForm({ phone: student.user?.phone ?? "", address: student.user?.address ?? "" }); setMsg(""); }} onSave={() => patch({ phone: cForm.phone.trim() || null, address: cForm.address.trim() || null }, "Contact info updated.", () => setEditingContact(false))} saving={saving} />
          </div>
          <div className="space-y-3">
            {editingContact ? (
              <>
                <LabeledInput label="Phone" value={cForm.phone} onChange={(v) => setCForm((p) => ({ ...p, phone: v }))} />
                <div><label className="mb-1 block text-xs font-medium text-slate-500">Address</label><textarea value={cForm.address} onChange={(e) => setCForm((p) => ({ ...p, address: e.target.value }))} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></div>
              </>
            ) : (
              <>
                <FieldCard label="Email" value={student.user?.email} />
                <FieldCard label="Phone" value={student.user?.phone} />
                <FieldCard label="Address" value={student.user?.address} />
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Login & Security</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Email / Username</label>
              {editingEmail ? (
                <div className="flex gap-2">
                  <input type="email" value={emailVal} onChange={(e) => setEmailVal(e.target.value)} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <button onClick={() => patch({ email: emailVal.trim() }, "Email updated.", () => setEditingEmail(false))} disabled={saving} className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700 disabled:opacity-50">Save</button>
                  <button onClick={() => { setEditingEmail(false); setEmailVal(student.user?.email ?? ""); }} className="rounded bg-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-300">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">{student.user?.email}</span>
                  <button onClick={() => setEditingEmail(true)} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200">Edit</button>
                </div>
              )}
            </div>
            <FieldCard label="Account Status"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${student.user?.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{student.user?.isActive ? "Active" : "Inactive"}</span></FieldCard>
            <div className="border-t border-slate-100 pt-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Reset Password</label>
              <div className="flex gap-2">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <button onClick={resetPassword} disabled={saving} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "..." : "Reset"}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Academic Information</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FieldCard label="Class" value={student.class?.name} />
          <FieldCard label="Student ID" value={student.id} />
          <FieldCard label="User ID" value={student.userId} />
          <FieldCard label="Status"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${student.user?.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{student.user?.isActive ? "Active" : "Inactive"}</span></FieldCard>
          <FieldCard label="Created" value={new Date(student.createdAt).toLocaleDateString()} />
          <FieldCard label="Updated" value={new Date(student.updatedAt).toLocaleDateString()} />
        </div>
      </div>
    </div>
  );
}

export function BasicTab({ student, studentId, onUpdate }: { student: any; studentId: string; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    firstName: student.firstName ?? "",
    middleName: student.middleName ?? "",
    lastName: student.lastName ?? "",
    gender: student.gender ?? "MALE",
    age: String(student.age ?? ""),
    dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).split("T")[0] : "",
    sportHouse: student.sportHouse ?? "",
    coCurricular: student.coCurricular ?? "",
    responsibilities: student.responsibilities ?? "",
  });

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          middleName: form.middleName.trim() || null,
          lastName: form.lastName.trim(),
          gender: form.gender,
          age: Number(form.age) || 0,
          dateOfBirth: form.dateOfBirth || null,
          sportHouse: form.sportHouse.trim() || null,
          coCurricular: form.coCurricular.trim() || null,
          responsibilities: form.responsibilities.trim() || null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(payload?.error ?? "Failed to update.");
      } else {
        setMsg("Updated successfully.");
        setEditing(false);
        await onUpdate();
      }
    } catch {
      setMsg("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setEditing(false);
    setForm({
      firstName: student.firstName ?? "",
      middleName: student.middleName ?? "",
      lastName: student.lastName ?? "",
      gender: student.gender ?? "MALE",
      age: String(student.age ?? ""),
      dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).split("T")[0] : "",
      sportHouse: student.sportHouse ?? "",
      coCurricular: student.coCurricular ?? "",
      responsibilities: student.responsibilities ?? "",
    });
    setMsg("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {msg && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${msg.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {msg}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
        <EditSectionHeader title="Personal Information" editing={editing} onEdit={() => setEditing(true)} onCancel={cancel} onSave={save} saving={saving} />
        <div className="space-y-3">
          {editing ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">First Name</label>
                <input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Middle Name</label>
                <input value={form.middleName} onChange={(e) => setForm((p) => ({ ...p, middleName: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Last Name</label>
                <input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Gender</label>
                <select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Date of Birth</label>
                <input type="date" value={form.dateOfBirth} max={new Date().toISOString().split("T")[0]} onChange={(e) => {
                  const dob = e.target.value;
                  const ageNum = dob ? (() => { const b = new Date(dob); const n = new Date(); let a = n.getFullYear() - b.getFullYear(); const m = n.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--; return Math.max(0, a); })() : "";
                  setForm((p) => ({ ...p, dateOfBirth: dob, age: String(ageNum) }));
                }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                {form.dateOfBirth && (
                  <p className="mt-1 text-xs text-slate-500">
                    Age: {(() => { const b = new Date(form.dateOfBirth); const n = new Date(); let y = n.getFullYear() - b.getFullYear(); let mo = n.getMonth() - b.getMonth(); let d = n.getDate() - b.getDate(); if (d < 0) { mo--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); } if (mo < 0) { y--; mo += 12; } const p: string[] = []; if (y > 0) p.push(`${y} yr${y !== 1 ? "s" : ""}`); if (mo > 0) p.push(`${mo} mo${mo !== 1 ? "s" : ""}`); if (d > 0) p.push(`${d} day${d !== 1 ? "s" : ""}`); return p.join(" ") || "0 days"; })()}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Sport House</label>
                <input value={form.sportHouse} onChange={(e) => setForm((p) => ({ ...p, sportHouse: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Co-curricular</label>
                <input value={form.coCurricular} onChange={(e) => setForm((p) => ({ ...p, coCurricular: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Responsibilities</label>
                <input value={form.responsibilities} onChange={(e) => setForm((p) => ({ ...p, responsibilities: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </>
          ) : (
            <>
              <FieldCard label="First Name" value={student.firstName} />
              <FieldCard label="Middle Name" value={student.middleName} />
              <FieldCard label="Last Name" value={student.lastName} />
              <FieldCard label="Gender" value={student.gender} />
              <FieldCard label="Date of Birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"} />
              <FieldCard label="Age" value={student.dateOfBirth ? (() => { const b = new Date(student.dateOfBirth); const n = new Date(); let y = n.getFullYear() - b.getFullYear(); let mo = n.getMonth() - b.getMonth(); let d = n.getDate() - b.getDate(); if (d < 0) { mo--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); } if (mo < 0) { y--; mo += 12; } const p: string[] = []; if (y > 0) p.push(`${y} year${y !== 1 ? "s" : ""}`); if (mo > 0) p.push(`${mo} month${mo !== 1 ? "s" : ""}`); if (d > 0) p.push(`${d} day${d !== 1 ? "s" : ""}`); return p.join(" ") || "0 days"; })() : `${student.age} years`} />
              <FieldCard label="Sport House" value={student.sportHouse} />
              <FieldCard label="Co-curricular" value={student.coCurricular} />
              <FieldCard label="Responsibilities" value={student.responsibilities} />
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Academic Information</h3>
        <div className="space-y-3">
          <FieldCard label="Class" value={student.class?.name} />
          <FieldCard label="Student ID" value={student.id} />
          <FieldCard label="User ID" value={student.userId} />
          <FieldCard label="Status">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${student.user?.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {student.user?.isActive ? "Active" : "Inactive"}
            </span>
          </FieldCard>
          <FieldCard label="Created" value={new Date(student.createdAt).toLocaleDateString()} />
          <FieldCard label="Updated" value={new Date(student.updatedAt).toLocaleDateString()} />
        </div>
      </div>
    </div>
  );
}

export function ContactTab({ student, studentId, onUpdate }: { student: any; studentId: string; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    phone: student.user?.phone ?? "",
    address: student.user?.address ?? "",
  });

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(payload?.error ?? "Failed to update.");
      } else {
        setMsg("Updated successfully.");
        setEditing(false);
        await onUpdate();
      }
    } catch {
      setMsg("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setEditing(false);
    setForm({ phone: student.user?.phone ?? "", address: student.user?.address ?? "" });
    setMsg("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {msg && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${msg.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {msg}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
        <EditSectionHeader title="Contact Details" editing={editing} onEdit={() => setEditing(true)} onCancel={cancel} onSave={save} saving={saving} />
        <div className="space-y-3">
          <FieldCard label="Email" value={student.user?.email} />
          {editing ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Phone</label>
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Address</label>
                <textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </>
          ) : (
            <>
              <FieldCard label="Phone" value={student.user?.phone} />
              <FieldCard label="Address" value={student.user?.address} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function LoginTab({ student, studentId, onUpdate }: { student: any; studentId: string; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(student.user?.email ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function saveEmail() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(payload?.error ?? "Failed to update email.");
      } else {
        setMsg("Email updated successfully.");
        setEditing(false);
        await onUpdate();
      }
    } catch {
      setMsg("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!password || password.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }
    if (!window.confirm("Reset this student's password?")) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setMsg(payload?.error ?? "Failed to reset password.");
      } else {
        setMsg("Password reset successfully.");
        setPassword("");
      }
    } catch {
      setMsg("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Section title="Login Credentials">
        {msg && (
          <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${msg.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {msg}
          </div>
        )}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
            <span className="text-slate-500">Email / Username</span>
            {editing ? (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <button onClick={saveEmail} disabled={saving} className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700">Save</button>
                <button onClick={() => { setEditing(false); setEmail(student.user?.email ?? ""); }} className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-300">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{student.user?.email}</span>
                <button onClick={() => setEditing(true)} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200">Edit</button>
              </div>
            )}
          </div>
          <InfoRow label="Account Status" value={student.user?.isActive ? "Active" : "Inactive"} />
          <InfoRow label="User ID" value={student.userId} />
          <InfoRow label="Role ID" value={student.user?.roleId} />
        </div>
      </Section>

      <Section title="Password Reset">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Set a new password for this student. They will need to use this password on their next login.</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button onClick={resetPassword} disabled={saving} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

export function GuardianTab({ student, data, studentId, onUpdate }: { student: any; data: any; studentId: string; onUpdate: () => void }) {
  const parent = student.parent;
  const additional = data?.additionalGuardians ?? [];
  const [mode, setMode] = useState<"none" | "search" | "new">("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string; email: string; phone: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [linkRelationship, setLinkRelationship] = useState("Guardian");
  const [linking, setLinking] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelationship, setNewRelationship] = useState("Guardian");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (mode !== "search" || searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/parents/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const payload = await res.json().catch(() => ({}));
        setSearchResults(payload.parents ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  async function linkExistingParent() {
    if (!selectedParentId) {
      setMsg("Select a parent to link.");
      return;
    }
    setLinking(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}/guardians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: selectedParentId,
          relationship: linkRelationship.trim() || "Guardian",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(payload?.error ?? "Failed to link guardian.");
      } else {
        setMsg("Guardian linked successfully.");
        setMode("none");
        setSelectedParentId(null);
        setSearchQuery("");
        setLinkRelationship("Guardian");
        await onUpdate();
      }
    } catch {
      setMsg("An error occurred.");
    } finally {
      setLinking(false);
    }
  }

  async function addGuardian() {
    if (!newName.trim() || !newEmail.trim()) {
      setMsg("Name and email are required.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}/guardians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || undefined,
          relationship: newRelationship.trim() || "Guardian",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(payload?.error ?? "Failed to add guardian.");
      } else {
        setMsg("Guardian added successfully.");
        setMode("none");
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        setNewRelationship("Guardian");
        await onUpdate();
      }
    } catch {
      setMsg("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function removeGuardian(parentId: string) {
    if (!window.confirm("Remove this guardian?")) return;
    try {
      const res = await fetch(`/api/admin/students/${studentId}/guardians?parentId=${parentId}`, { method: "DELETE" });
      if (res.ok) {
        await onUpdate();
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${msg.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {msg}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Primary Guardian">
          {parent ? (
            <>
              <InfoRow label="Name" value={parent.user?.name} />
              <InfoRow label="Email" value={parent.user?.email} />
              <InfoRow label="Phone" value={parent.user?.phone} />
              <InfoRow label="Address" value={parent.user?.address} />
              <InfoRow label="Guardian ID" value={parent.id} />
              <InfoRow label="User ID" value={parent.userId} />
            </>
          ) : (
            <Empty text="No primary guardian assigned." />
          )}
        </Section>

        {data?.admission?.guardians?.length > 0 && (
          <Section title="Application Guardians">
            {data.admission.guardians.map((g: any, i: number) => (
              <div key={i} className="mb-3 rounded-lg border border-slate-200 p-3 text-sm">
                <div className="font-medium text-slate-900">{g.name}</div>
                <div className="text-slate-600">{g.relationship}</div>
                <div className="text-slate-600">{g.email}</div>
                <div className="text-slate-600">{g.contactNumber}</div>
              </div>
            ))}
          </Section>
        )}
      </div>

      <Section title={`Additional Guardians (${additional.length})`}>
        <div className="mb-3 flex flex-wrap gap-2">
          {mode === "none" && (
            <>
              <button onClick={() => setMode("search")} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">🔍 Search Existing Guardian</button>
              <button onClick={() => setMode("new")} className="rounded bg-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-300">+ Add New Guardian</button>
            </>
          )}
        </div>

        {/* Search Existing Parent */}
        {mode === "search" && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Search Existing Guardian</h4>
              <button onClick={() => { setMode("none"); setSearchQuery(""); setSearchResults([]); setSelectedParentId(null); }} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedParentId(null); }}
              placeholder="Search by name, email or phone..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              autoFocus
            />
            {searching && <p className="text-xs text-slate-500">Searching...</p>}
            {searchResults.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedParentId(p.id); }}
                    className={`flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 ${selectedParentId === p.id ? "bg-indigo-50" : ""}`}
                  >
                    <div>
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
                    </div>
                    {selectedParentId === p.id && <span className="text-xs font-medium text-indigo-600">✓ Selected</span>}
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim().length >= 1 && !searching && searchResults.length === 0 && (
              <p className="text-xs text-slate-500">No matching guardians found. Try adding a new one instead.</p>
            )}
            {selectedParentId && (
              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm">
                <span className="text-slate-700">Selected: </span>
                <span className="font-medium text-slate-900">{searchResults.find((p) => p.id === selectedParentId)?.name}</span>
                <span className="ml-2 text-xs text-slate-500">{searchResults.find((p) => p.id === selectedParentId)?.email}</span>
              </div>
            )}
            {selectedParentId && (
              <div className="flex flex-wrap items-center gap-2">
                <input value={linkRelationship} onChange={(e) => setLinkRelationship(e.target.value)} placeholder="Relationship" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <button onClick={linkExistingParent} disabled={linking} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">{linking ? "Linking..." : "Link Guardian"}</button>
              </div>
            )}
          </div>
        )}

        {/* Add New Guardian */}
        {mode === "new" && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Add New Guardian</h4>
              <button onClick={() => setMode("none")} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name *" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email *" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input value={newRelationship} onChange={(e) => setNewRelationship(e.target.value)} placeholder="Relationship" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={addGuardian} disabled={saving} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "Adding..." : "Add Guardian"}</button>
              <button onClick={() => setMode("none")} className="rounded bg-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-300">Cancel</button>
            </div>
          </div>
        )}

        {additional.length === 0 ? (
          <Empty text="No additional guardians." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {additional.map((g: any) => (
              <div key={g.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{g.name}</span>
                  <button onClick={() => removeGuardian(g.id)} className="text-xs text-rose-600 hover:text-rose-800">Remove</button>
                </div>
                <div className="text-slate-600">{g.relationship}</div>
                <div className="text-slate-500">{g.email}</div>
                {g.phone && <div className="text-slate-500">{g.phone}</div>}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export function SiblingTab({ data }: { data: any }) {
  const siblings = data?.siblings ?? [];
  if (siblings.length === 0) return <Empty text="No siblings found." />;
  return (
    <Section title={`Siblings (${siblings.length})`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {siblings.map((sib: any) => (
          <div key={sib.id} className="rounded-lg border border-slate-200 p-4 text-sm">
            <div className="font-medium text-slate-900">{sib.user?.name}</div>
            <div className="text-slate-600">{sib.class?.name ?? "No class"}</div>
            <div className="text-slate-500">{sib.gender} · {sib.dateOfBirth ? (() => { const b = new Date(sib.dateOfBirth); const n = new Date(); let y = n.getFullYear() - b.getFullYear(); let mo = n.getMonth() - b.getMonth(); let d = n.getDate() - b.getDate(); if (d < 0) { mo--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); } if (mo < 0) { y--; mo += 12; } return `${y}y ${mo}m`; })() : `Age ${sib.age}`}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function RecordTab({ data }: { data: any }) {
  const rows = data?.enrollments ?? [];
  if (rows.length === 0) return <Empty text="No enrollment records." />;
  return (
    <Section title={`Enrollment Records (${rows.length})`}>
      <TableWrap>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase text-slate-500">
              {["Session", "Term", "Class", "Status", "Date"].map((h) => (
                <th key={h} className="px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((e: any) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{e.session?.name}</td>
                <td className="px-3 py-2">{e.term?.name}</td>
                <td className="px-3 py-2">{e.class?.name ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge text={e.promotionStatus} color="emerald" /></td>
                <td className="px-3 py-2">{new Date(e.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </Section>
  );
}

export function FeeTab({ data }: { data: any }) {
  const rows = data?.invoices ?? [];
  if (rows.length === 0) return <Empty text="No fee invoices." />;
  return (
    <Section title={`Invoices (${rows.length})`}>
      <TableWrap>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase text-slate-500">
              {["Invoice #", "Session/Term", "Total", "Paid", "Balance", "Status", "Due"].map((h) => (
                <th key={h} className="px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((inv: any) => (
              <tr key={inv.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{inv.invoiceNumber}</td>
                <td className="px-3 py-2">{inv.session?.name} / {inv.term?.name}</td>
                <td className="px-3 py-2">₦{Number(inv.totalAmount).toLocaleString()}</td>
                <td className="px-3 py-2">₦{Number(inv.amountPaid).toLocaleString()}</td>
                <td className="px-3 py-2">₦{Number(inv.balance).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <StatusBadge text={inv.status} color={inv.status === "PAID" ? "emerald" : inv.status === "PART_PAYMENT" ? "amber" : "rose"} />
                </td>
                <td className="px-3 py-2">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </Section>
  );
}

export function WalletTab({ data }: { data: any }) {
  const payments = data?.payments ?? [];
  const receipts = data?.receipts ?? [];
  return (
    <div className="space-y-6">
      <Section title={`Payments (${payments.length})`}>
        {payments.length === 0 ? <Empty text="No payments." /> : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr className="text-left text-xs uppercase text-slate-500">{["Method", "Amount", "Status", "Date"].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{p.method}</td>
                    <td className="px-3 py-2">₦{Number(p.amount).toLocaleString()}</td>
                    <td className="px-3 py-2"><StatusBadge text={p.status} color={p.status === "PAID" ? "emerald" : "amber"} /></td>
                    <td className="px-3 py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>
      <Section title={`Receipts (${receipts.length})`}>
        {receipts.length === 0 ? <Empty text="No receipts." /> : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr className="text-left text-xs uppercase text-slate-500">{["Receipt #", "Amount", "Method", "Date"].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>
                {receipts.map((r: any) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{r.receiptNumber}</td>
                    <td className="px-3 py-2">₦{Number(r.amount).toLocaleString()}</td>
                    <td className="px-3 py-2">{r.paymentMethod}</td>
                    <td className="px-3 py-2">{new Date(r.paymentDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>
    </div>
  );
}

export function RefundTab() {
  return <Empty text="No fee refunds on record." />;
}

export function AttendanceTab({ data }: { data: any }) {
  const records = data?.attendance ?? [];
  if (records.length === 0) return <Empty text="No attendance records." />;
  const present = records.filter((a: any) => a.status === "PRESENT").length;
  const absent = records.filter((a: any) => a.status === "ABSENT").length;
  const late = records.filter((a: any) => a.status === "LATE").length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center"><div className="text-xl font-bold text-emerald-700">{present}</div><div className="text-xs text-emerald-600">Present</div></div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-center"><div className="text-xl font-bold text-rose-700">{absent}</div><div className="text-xs text-rose-600">Absent</div></div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center"><div className="text-xl font-bold text-amber-700">{late}</div><div className="text-xs text-amber-600">Late</div></div>
      </div>
      <TableWrap>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr className="text-left text-xs uppercase text-slate-500">{["Date", "Status", "Session", "Term"].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {records.map((a: any) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{new Date(a.date).toLocaleDateString()}</td>
                <td className="px-3 py-2"><StatusBadge text={a.status} color={a.status === "PRESENT" ? "emerald" : a.status === "ABSENT" ? "rose" : "amber"} /></td>
                <td className="px-3 py-2">{a.session?.name}</td>
                <td className="px-3 py-2">{a.term?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

export function ExamTab({ data, studentId, onUpdate }: { data: any; studentId: string; onUpdate: () => void }) {
  const results = data?.results ?? [];
  const scores = data?.scores ?? [];
  const { sessions, terms, activeSession, activeTerm, loading: contextLoading } = useActiveSession();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const initialSessionId = activeSession?.id ?? "";
  const [sessionId, setSessionId] = useState<string>(() => initialSessionId);
  const [termId, setTermId] = useState<string>(() =>
    activeTerm?.sessionId === initialSessionId ? activeTerm.id : ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const sessionTerms = terms.filter((t) => t.sessionId === sessionId);

  function handleSessionChange(nextSessionId: string) {
    setSessionId(nextSessionId);
    const nextTerms = terms.filter((t) => t.sessionId === nextSessionId);
    const nextTerm = nextTerms.find((t) => t.id === activeTerm?.id) ?? nextTerms.find((t) => t.isCurrent) ?? nextTerms[0] ?? null;
    setTermId(nextTerm?.id ?? "");
  }

  async function uploadResult() {
    if (!file || !sessionId || !termId) {
      setMsg("Select a session, term, and a PDF file.");
      return;
    }

    setUploading(true);
    setMsg("");

    const fd = new FormData();
    fd.append("studentId", studentId);
    fd.append("sessionId", sessionId);
    fd.append("termId", termId);
    fd.append("file", file);

    try {
      const res = await fetch("/api/teacher/results/upload", { method: "POST", body: fd });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(payload?.error ?? "Failed to upload result PDF.");
      } else {
        setMsg("Result PDF uploaded and published.");
        setFile(null);
        await onUpdate();
      }
    } catch {
      setMsg("An error occurred while uploading.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteResultFile(resultId: number) {
    if (!confirm("Are you sure you want to delete this uploaded result file?")) return;
    setDeletingId(resultId);
    try {
      const res = await fetch(`/api/teacher/results/${resultId}`, { method: "DELETE" });
      if (res.ok) {
        setMsg("Result file deleted successfully.");
        await onUpdate();
      } else {
        const payload = await res.json().catch(() => ({}));
        setMsg(payload?.error ?? "Failed to delete result file.");
      }
    } catch {
      setMsg("An error occurred while deleting.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Upload Result to Term">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          {msg && (
            <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${msg.includes("uploaded") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              {msg}
            </div>
          )}
          {contextLoading ? (
            <p className="text-sm text-slate-500">Loading academic sessions and terms…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-rose-600">No academic sessions found. Set up the academic calendar first.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Session</label>
                <select
                  value={sessionId}
                  onChange={(e) => handleSessionChange(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select session</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Term</label>
                <select
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  disabled={!sessionId || sessionTerms.length === 0}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">
                    {!sessionId ? "Select session first" : sessionTerms.length === 0 ? "No terms for session" : "Select term"}
                  </option>
                  {sessionTerms.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Result PDF</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-indigo-700"
                />
              </div>
            </div>
          )}
          {file ? (
            <p className="mt-2 text-xs text-slate-600">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
          ) : null}
          <div className="mt-3">
            <button
              onClick={uploadResult}
              disabled={uploading || !file || !sessionId || !termId}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Result PDF"}
            </button>
          </div>
        </div>
      </Section>

      <Section title={`Term Results (${results.length})`}>
        {results.length === 0 ? <Empty text="No term results." /> : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr className="text-left text-xs uppercase text-slate-500">{["Session/Term", "File", "Status", "Uploaded", "Actions"].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>
                {results.map((r: any) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{r.session?.name} / {r.term?.name}</td>
                    <td className="px-3 py-2">
                      {r.fileUrl ? (
                        <a href={getCloudinaryInlineUrl(r.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{r.fileName ?? "View PDF"}</a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2"><StatusBadge text={r.status} color={r.status === "PUBLISHED" ? "emerald" : r.status === "APPROVED" ? "blue" : "slate"} /></td>
                    <td className="px-3 py-2">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2">
                      {r.fileUrl && (
                        <button
                          onClick={() => deleteResultFile(r.id)}
                          disabled={deletingId === r.id}
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                        >
                          {deletingId === r.id ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>
      <Section title={`Subject Scores (${scores.length})`}>
        {scores.length === 0 ? <Empty text="No subject scores." /> : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr className="text-left text-xs uppercase text-slate-500">{["Subject", "CA", "Exam", "Total", "Grade", "GPA"].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>
                {scores.map((s: any) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{s.subject?.name}</td>
                    <td className="px-3 py-2">{s.caScore}</td>
                    <td className="px-3 py-2">{s.examScore}</td>
                    <td className="px-3 py-2 font-medium">{s.total}</td>
                    <td className="px-3 py-2">{s.grade}</td>
                    <td className="px-3 py-2">{s.gpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>
    </div>
  );
}

export function SubjectTab({ data }: { data: any }) {
  const subjects = data?.subjects ?? [];
  if (subjects.length === 0) return <Empty text="No subjects assigned to this class." />;
  return (
    <Section title={`Class Subjects (${subjects.length})`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((sub: any) => (
          <div key={sub.id} className="rounded-lg border border-slate-200 p-4 text-sm">
            <div className="font-medium text-slate-900">{sub.name}</div>
            <div className="mt-1 text-xs text-slate-500">Teacher: {sub.teacher?.user?.name ?? "Not assigned"}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function DialogueTab({ data }: { data: any }) {
  const messages = data?.messages ?? [];
  if (messages.length === 0) return <Empty text="No dialogue messages." />;
  return (
    <Section title={`Parent Messages (${messages.length})`}>
      <div className="space-y-3">
        {messages.map((m: any) => (
          <div key={m.id} className="rounded-lg border border-slate-200 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">{m.subject}</span>
              <StatusBadge text={m.status} color="slate" />
            </div>
            <div className="mt-1 text-slate-600">{m.message}</div>
            <div className="mt-2 text-xs text-slate-400">{new Date(m.createdAt).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function NoteTab({ data }: { data: any }) {
  const complaints = data?.complaints ?? [];
  if (complaints.length === 0) return <Empty text="No notes or complaints." />;
  return (
    <Section title={`Complaints / Notes (${complaints.length})`}>
      <div className="space-y-3">
        {complaints.map((c: any) => (
          <div key={c.id} className="rounded-lg border border-slate-200 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">{c.subject}</span>
              <StatusBadge text={c.status} color={c.status === "RESOLVED" ? "emerald" : c.status === "IN_REVIEW" ? "amber" : "rose"} />
            </div>
            <div className="mt-1 text-slate-600">{c.complaint}</div>
            {c.resolutionNote && <div className="mt-1 text-xs text-emerald-600">Resolution: {c.resolutionNote}</div>}
            <div className="mt-2 text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function DocumentTab({ data, studentId, onUpdate }: { data: any; studentId: string; onUpdate?: () => void }) {
  const admissionDocs = data?.admission?.documents ?? [];
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [docType, setDocType] = useState("BIRTH_CERTIFICATE");
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const documentTypes = [
    { value: "BIRTH_CERTIFICATE", label: "Birth Certificate" },
    { value: "REPORT_CARD", label: "Report Card / Transcript" },
    { value: "TRANSFER_CERTIFICATE", label: "Transfer Certificate" },
    { value: "MEDICAL_RECORD", label: "Medical Record" },
    { value: "PASSPORT_PHOTOGRAPH", label: "Passport Photograph" },
    { value: "ADMISSION_LETTER", label: "Admission Letter" },
    { value: "GUARDIAN_ID", label: "Guardian ID" },
    { value: "PROOF_OF_ADDRESS", label: "Proof of Address" },
    { value: "TESTIMONIAL", label: "Testimonial" },
    { value: "OTHER", label: "Other" },
  ];

  async function fetchDocs() {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/documents`, { cache: "no-store" });
      if (res.ok) {
        const docs = await res.json();
        setUploadedDocs(docs);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocs();
  }, [studentId]);

  async function uploadDoc() {
    if (!file) {
      setMsg("Please select a file to upload.");
      return;
    }
    setUploading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", docTitle || file.name);
    fd.append("documentType", docType);
    if (docDescription) fd.append("description", docDescription);

    try {
      const res = await fetch(`/api/admin/students/${studentId}/documents`, {
        method: "POST",
        body: fd,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(payload?.error ?? "Failed to upload document.");
      } else {
        setMsg("Document uploaded successfully.");
        setFile(null);
        setDocTitle("");
        setDocDescription("");
        setDocType("BIRTH_CERTIFICATE");
        await fetchDocs();
        if (onUpdate) await onUpdate();
      }
    } catch {
      setMsg("An error occurred while uploading.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDoc(docId: number) {
    if (!confirm("Delete this document?")) return;
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/documents?docId=${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMsg("Document deleted.");
        await fetchDocs();
        if (onUpdate) await onUpdate();
      } else {
        const payload = await res.json().catch(() => ({}));
        setMsg(payload?.error ?? "Failed to delete document.");
      }
    } catch {
      setMsg("An error occurred while deleting.");
    } finally {
      setDeletingId(null);
    }
  }

  function getDocTypeLabel(type: string) {
    const found = documentTypes.find((t) => t.value === type);
    return found ? found.label : type.replace(/_/g, " ").toLowerCase();
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${msg.includes("success") || msg.includes("deleted") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {msg}
        </div>
      )}

      <Section title="Upload Document">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {documentTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Title (optional)</label>
              <input
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Birth Certificate"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Description (optional)</label>
            <input
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Brief description of this document"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">File (PDF, DOC, DOCX, PNG, JPG — max 10MB)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.tiff"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-indigo-700"
            />
            {file && (
              <p className="mt-1 text-xs text-slate-600">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
            )}
          </div>
          <div>
            <button
              onClick={uploadDoc}
              disabled={uploading || !file}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </div>
      </Section>

      <Section title={`Uploaded Documents (${uploadedDocs.length})`}>
        {loading ? (
          <Empty text="Loading documents..." />
        ) : uploadedDocs.length === 0 ? (
          <Empty text="No documents uploaded yet." />
        ) : (
          <div className="space-y-3">
            {uploadedDocs.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{d.title}</div>
                  <div className="text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{getDocTypeLabel(d.documentType)}</span>
                    {d.description && <span className="ml-2 text-xs">{d.description}</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {d.fileName} · {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200">View</a>
                  <button
                    onClick={() => deleteDoc(d.id)}
                    disabled={deletingId === d.id}
                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {deletingId === d.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {admissionDocs.length > 0 && (
        <Section title={`Admission Application Documents (${admissionDocs.length})`}>
          <div className="space-y-3">
            {admissionDocs.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{d.title}</div>
                  <div className="text-slate-500">{d.documentType}</div>
                </div>
                {d.fileUrl && (
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200">View</a>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

export function QualificationTab({ data }: { data: any }) {
  const quals = data?.admission?.qualifications ?? [];
  if (quals.length === 0) return <Empty text="No qualifications on file." />;
  return (
    <Section title={`Qualifications (${quals.length})`}>
      <div className="space-y-3">
        {quals.map((q: any, i: number) => (
          <div key={i} className="rounded-lg border border-slate-200 p-4 text-sm">
            <div className="font-medium text-slate-900">{q.qualificationLevel} — {q.course}</div>
            <div className="text-slate-600">{q.institute}</div>
            <div className="text-slate-500">{q.session} · {q.result}</div>
            <div className="text-xs text-slate-400">{new Date(q.startDate).toLocaleDateString()} — {new Date(q.endDate).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function AccountTab({ data }: { data: any }) {
  const s = data?.student;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Section title="Account Overview">
        <InfoRow label="Total Invoices" value={data?.invoices?.length ?? 0} />
        <InfoRow label="Total Payments" value={data?.payments?.length ?? 0} />
        <InfoRow label="Total Receipts" value={data?.receipts?.length ?? 0} />
        <InfoRow label="Attendance Records" value={data?.attendance?.length ?? 0} />
      </Section>
      <Section title="Enrollment Summary">
        <InfoRow label="Enrollments" value={data?.enrollments?.length ?? 0} />
        <InfoRow label="Current Class" value={s?.class?.name} />
        <InfoRow label="Admission Source" value={data?.admission ? `Application #${data.admission.applicantNumber}` : "Direct registration"} />
      </Section>
    </div>
  );
}

export function TransportTab({ data }: { data: any }) {
  const route = data?.route;
  if (!route) return <Empty text="No transport route assigned." />;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Section title="Route Information">
        <InfoRow label="Route Name" value={route.name} />
        <InfoRow label="Pickup Time" value={route.pickupTime} />
        <InfoRow label="Dropoff Time" value={route.dropoffTime} />
        <InfoRow label="Active" value={route.isActive ? "Yes" : "No"} />
      </Section>
      {route.vehicle && (
        <Section title="Vehicle">
          <InfoRow label="Vehicle Name" value={route.vehicle.name} />
          <InfoRow label="Type" value={route.vehicle.type} />
          <InfoRow label="Plate Number" value={route.vehicle.plateNumber} />
          <InfoRow label="Capacity" value={route.vehicle.capacity} />
        </Section>
      )}
      {route.stops?.length > 0 && (
        <Section title={`Stops (${route.stops.length})`}>
          <div className="space-y-2">
            {route.stops.map((stop: any) => (
              <div key={stop.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{stop.order + 1}</span>
                <span className="text-slate-900">{stop.name}</span>
                <span className="text-xs text-slate-500">{stop.address}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
