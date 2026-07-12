"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EmailLog {
  id: number;
  to: string;
  subject: string;
  status: string;
  sentAt: string;
}

interface Template {
  name: string;
  key: string;
  description: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
}

const statusColors: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  logged: "bg-slate-100 text-slate-600",
  resend_failed: "bg-rose-100 text-rose-700",
  webhook_failed: "bg-amber-100 text-amber-700",
  both_failed: "bg-rose-100 text-rose-700",
  webhook_error: "bg-amber-100 text-amber-700",
};

export function EmailSettingsForm() {
  const [settings, setSettings] = useState({
    resendApiKey: "",
    fromEmail: "",
    enabled: false,
  });
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"provider" | "templates" | "logs">("provider");

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const [settingsRes, logsRes, templatesRes] = await Promise.all([
          fetch("/api/admin/settings/email", { cache: "no-store" }),
          fetch("/api/admin/settings/email/logs", { cache: "no-store" }),
          fetch("/api/admin/settings/email/templates", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings((prev) => ({
            ...prev,
            resendApiKey: data.resendApiKey ?? "",
            fromEmail: data.fromEmail ?? "",
            enabled: data.enabled ?? false,
          }));
        }
        if (logsRes.ok) {
          const data = await logsRes.json();
          setLogs(data.logs ?? []);
        }
        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(data.templates ?? []);
        }
      } catch {
        if (!cancelled) setStatus("Failed to load data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchData();
    return () => { cancelled = true; };
  }, []);

  async function handleSaveSettings() {
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? "Failed to save settings.");
        return;
      }
      setStatus("Settings saved successfully.");
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTemplate() {
    if (!editingTemplate) return;
    setTemplateSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/settings/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: editingTemplate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? "Failed to save template.");
        return;
      }
      setStatus("Template saved successfully.");
      setTemplates((prev) => prev.map((t) => (t.key === editingTemplate.key ? editingTemplate : t)));
      setEditingTemplate(null);
    } catch {
      setStatus("An error occurred.");
    } finally {
      setTemplateSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading email settings...</div>;
  }

  return (
    <div className="space-y-4">
      {status && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-sm ${status.includes("success") || status.includes("Saved") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${status.includes("success") || status.includes("Saved") ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"}`}>
            {status.includes("success") || status.includes("Saved") ? "✓" : "✕"}
          </span>
          <span>{status}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["provider", "templates", "logs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); setEditingTemplate(null); setStatus(""); }}
            className={`rounded-t-lg px-4 py-2 text-xs font-semibold capitalize transition-colors ${activeTab === t ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
          >
            {t === "provider" ? "Email Provider" : t === "templates" ? "Email Templates" : "Email Logs"}
          </button>
        ))}
      </div>

      {activeTab === "provider" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${settings.enabled ? "bg-emerald-500" : "bg-rose-400"}`} />
              <span className="text-sm font-medium text-slate-700">{settings.enabled ? "Email delivery is configured" : "Email delivery is not configured"}</span>
            </div>
            <p className="text-xs text-slate-500">
              {settings.enabled
                ? "Emails will be sent via Resend when triggered by system events."
                : "Add your Resend API key to enable automatic email delivery. Without it, emails are only logged locally."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">Resend API Key <span className="text-rose-500">*</span></label>
              <Input
                type="password"
                value={settings.resendApiKey}
                onChange={(e) => setSettings((s) => ({ ...s, resendApiKey: e.target.value }))}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="mt-1 text-[11px] text-slate-400">Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-indigo-500 underline">resend.com/api-keys</a></p>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">From Email</label>
              <Input
                value={settings.fromEmail}
                onChange={(e) => setSettings((s) => ({ ...s, fromEmail: e.target.value }))}
                placeholder="noreply@yourschool.com"
              />
              <p className="mt-1 text-[11px] text-slate-400">Must be a verified domain in your Resend account. Use onboarding@resend.dev for testing.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="space-y-4">
          {editingTemplate ? (
            <TemplateEditor
              template={editingTemplate}
              onChange={setEditingTemplate}
              onSave={handleSaveTemplate}
              onCancel={() => setEditingTemplate(null)}
              saving={templateSaving}
            />
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{t.name}</h4>
                      <p className="mt-1 text-xs text-slate-500">{t.description}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditingTemplate({ ...t })}>Edit</Button>
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    <strong>Variables:</strong> {t.variables.map((v) => <span key={v} className="mr-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">{"{"}{v}{"}"}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-8 text-center text-sm text-slate-400">No emails sent yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">To</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-800">{log.to}</td>
                      <td className="px-3 py-2 text-slate-600">{log.subject}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[log.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{new Date(log.sentAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Template Editor with Preview
// ────────────────────────────────────────────────────────────────

const sampleValues: Record<string, string> = {
  schoolName: "Bright Future Academy",
  schoolAddress: "123 School Road, Lagos",
  schoolPhone: "+234 800 123 4567",
  schoolEmail: "info@brightfuture.edu.ng",
  studentName: "John Doe",
  applicantNumber: "APP-0001",
  className: "Primary 5 — Gold",
  date: "10 June 2026",
  loginEmail: "john.doe@student.school.edu",
  loginPassword: "john123",
  portalUrl: "https://portal.brightfuture.edu.ng",
  guardianName: "Mr. Michael Doe",
  email: "michael.doe@email.com",
  password: "michael123",
  relationship: "Father",
  invoiceNumber: "INV-2026-001",
  studentName2: "Jane Doe",
  amount: "₦150,000",
  amountDue: "₦150,000",
  amountPaid: "₦150,000",
  dueDate: "30 June 2026",
  sessionName: "2025/2026",
  termName: "Third Term",
  paymentMethod: "Bank Transfer",
  transactionDate: "10 June 2026",
  balance: "₦0",
  overallGrade: "A",
  attendanceStatus: "Absent",
  userName: "Admin User",
  role: "Teacher",
  resetUrl: "https://portal.brightfuture.edu.ng/reset?token=abc123",
  recipientName: "Parent",
  announcementTitle: "End of Term Exams",
  announcementBody: "End of term examinations will commence on Monday, 15th June 2026. Please ensure your child is adequately prepared.",
  statusLabel: "approved",
  staffComment: "Your request has been reviewed and approved.",
};

function interpolateForPreview(template: string): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return sampleValues[key] || `{${key}}`;
  });
}

function TemplateEditor({
  template,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  template: Template;
  onChange: (t: Template | null) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [editorTab, setEditorTab] = useState<"preview" | "html" | "text">("preview");
  const previewHtml = interpolateForPreview(template.html);
  const previewSubject = interpolateForPreview(template.subject);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Editing: {template.name}</h4>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700">Back to list</button>
      </div>
      <p className="text-xs text-slate-500">{template.description}</p>

      {/* Subject editor */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Subject Line</label>
        <Input value={template.subject} onChange={(e) => onChange({ ...template, subject: e.target.value })} />
      </div>

      {/* Editor tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["preview", "html", "text"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setEditorTab(t)}
            className={`rounded-t-lg px-4 py-2 text-xs font-semibold capitalize transition-colors ${editorTab === t ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
          >
            {t === "preview" ? "Preview" : t === "html" ? "Edit HTML" : "Edit Plain Text"}
          </button>
        ))}
      </div>

      {editorTab === "preview" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
              Subject: {previewSubject}
            </div>
            <div className="p-0">
              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                className="h-80 w-full rounded-b-lg"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Preview uses sample data. Variables like {"{studentName}"} are replaced with placeholder values.
          </p>
        </div>
      )}

      {editorTab === "html" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <strong>Available variables:</strong> {template.variables.map((v) => (
              <span key={v} className="mr-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">{"{"}{v}{"}"}</span>
            ))}
          </div>
          <textarea
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono"
            rows={16}
            value={template.html}
            onChange={(e) => onChange({ ...template, html: e.target.value })}
          />
        </div>
      )}

      {editorTab === "text" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <strong>Available variables:</strong> {template.variables.map((v) => (
              <span key={v} className="mr-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">{"{"}{v}{"}"}</span>
            ))}
          </div>
          <textarea
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono"
            rows={12}
            value={template.text}
            onChange={(e) => onChange({ ...template, text: e.target.value })}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Template"}</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
