"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  FileSpreadsheet,
  FileType,
  IdCard,
  Award,
  ScrollText,
  Trophy,
  Trash2,
  Upload,
  Eye,
  X,
  Settings2,
  Check,
} from "lucide-react";

const templateTypes = [
  { key: "REPORT_CARD", label: "Report Card", icon: FileText, desc: "Templates for student report cards", hasClassGroup: true, hasTerm: true },
  { key: "INVOICE", label: "Invoice", icon: FileSpreadsheet, desc: "Templates for fee invoices", hasClassGroup: false, hasTerm: false },
  { key: "RECEIPT", label: "Receipt", icon: FileType, desc: "Templates for payment receipts", hasClassGroup: false, hasTerm: false },
  { key: "ID_CARD", label: "ID Card", icon: IdCard, desc: "Templates for student ID cards", hasClassGroup: false, hasTerm: false },
  { key: "CERTIFICATE", label: "Certificate", icon: Award, desc: "Templates for certificates (class eligibility configurable)", hasClassGroup: false, hasTerm: false, hasEligibility: true },
  { key: "TRANSCRIPT", label: "Transcript", icon: ScrollText, desc: "Templates for academic transcripts", hasClassGroup: false, hasTerm: false },
  { key: "AWARD", label: "Award", icon: Trophy, desc: "Templates for student awards", hasClassGroup: false, hasTerm: false },
  { key: "TESTIMONIAL", label: "Testimonial", icon: ScrollText, desc: "Templates for testimonials (class eligibility configurable)", hasClassGroup: false, hasTerm: false, hasEligibility: true },
];

const fieldPresets: Record<string, { key: string; label: string; source: string; fixed: boolean }[]> = {
  ID_CARD: [
    { key: "studentName", label: "Student Full Name", source: "fullName", fixed: true },
    { key: "admissionNo", label: "Admission Number", source: "admissionNo", fixed: true },
    { key: "className", label: "Class", source: "className", fixed: true },
    { key: "gender", label: "Gender", source: "gender", fixed: true },
    { key: "dateOfBirth", label: "Date of Birth", source: "dateOfBirth", fixed: true },
    { key: "bloodGroup", label: "Blood Group", source: "custom", fixed: false },
    { key: "parentName", label: "Parent Name", source: "parentName", fixed: true },
    { key: "parentPhone", label: "Parent Phone", source: "parentPhone", fixed: true },
    { key: "validUntil", label: "Valid Until", source: "custom", fixed: false },
    { key: "issueDate", label: "Issue Date", source: "today", fixed: false },
  ],
  CERTIFICATE: [
    { key: "studentName", label: "Student Full Name", source: "fullName", fixed: true },
    { key: "className", label: "Class", source: "className", fixed: true },
    { key: "sessionName", label: "Academic Session", source: "custom", fixed: false },
    { key: "certificateText", label: "Certificate Text", source: "custom", fixed: false },
    { key: "issueDate", label: "Issue Date", source: "today", fixed: false },
    { key: "principalName", label: "Principal Name", source: "custom", fixed: false },
  ],
  TRANSCRIPT: [
    { key: "studentName", label: "Student Full Name", source: "fullName", fixed: true },
    { key: "admissionNo", label: "Admission Number", source: "admissionNo", fixed: true },
    { key: "className", label: "Class", source: "className", fixed: true },
    { key: "sessionName", label: "Academic Session", source: "custom", fixed: false },
    { key: "termName", label: "Term", source: "custom", fixed: false },
    { key: "transcriptText", label: "Transcript Summary", source: "custom", fixed: false },
    { key: "issueDate", label: "Issue Date", source: "today", fixed: false },
  ],
  AWARD: [
    { key: "studentName", label: "Student Full Name", source: "fullName", fixed: true },
    { key: "className", label: "Class", source: "className", fixed: true },
    { key: "awardTitle", label: "Award Title", source: "custom", fixed: false },
    { key: "awardDescription", label: "Award Description", source: "custom", fixed: false },
    { key: "awardDate", label: "Award Date", source: "today", fixed: false },
    { key: "issuedBy", label: "Issued By", source: "custom", fixed: false },
  ],
  TESTIMONIAL: [
    { key: "studentName", label: "Student Full Name", source: "fullName", fixed: true },
    { key: "className", label: "Class", source: "className", fixed: true },
    { key: "admissionNo", label: "Admission Number", source: "admissionNo", fixed: true },
    { key: "sessionName", label: "Academic Session", source: "custom", fixed: false },
    { key: "testimonialText", label: "Testimonial Text", source: "custom", fixed: false },
    { key: "issueDate", label: "Issue Date", source: "today", fixed: false },
    { key: "principalName", label: "Principal Name", source: "custom", fixed: false },
  ],
  REPORT_CARD: [
    { key: "studentName", label: "Student Full Name", source: "fullName", fixed: true },
    { key: "admissionNo", label: "Admission Number", source: "admissionNo", fixed: true },
    { key: "className", label: "Class", source: "className", fixed: true },
    { key: "termName", label: "Term", source: "custom", fixed: false },
    { key: "sessionName", label: "Session", source: "custom", fixed: false },
  ],
  INVOICE: [
    { key: "studentName", label: "Student Full Name", source: "fullName", fixed: true },
    { key: "invoiceNumber", label: "Invoice Number", source: "custom", fixed: false },
    { key: "totalAmount", label: "Total Amount", source: "custom", fixed: false },
  ],
  RECEIPT: [
    { key: "studentName", label: "Student Full Name", source: "fullName", fixed: true },
    { key: "receiptNumber", label: "Receipt Number", source: "custom", fixed: false },
    { key: "amountPaid", label: "Amount Paid", source: "custom", fixed: false },
  ],
};

type Template = {
  id: number;
  name: string;
  type: string;
  class_group_name: string | null;
  term_name: string | null;
  file_url: string;
  file_type: string;
  field_config: string | null;
  eligible_class_groups: string | null;
  is_active: boolean;
  created_at: string;
};

type ClassGroup = { id: string; name: string };
type Term = { id: number; name: string; session_id: number; is_current: boolean; status: string };

type FieldConfig = { key: string; label: string; source: string; fixed: boolean };

export function TemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadForms, setUploadForms] = useState<Record<string, {
    name: string;
    classGroup: string;
    termName: string;
    file: File | null;
    fieldConfig: FieldConfig[];
    eligibleClassGroups: string[];
  }>>({});
  const [editingConfig, setEditingConfig] = useState<number | null>(null);
  const [configDraft, setConfigDraft] = useState<FieldConfig[]>([]);
  const [eligibilityDraft, setEligibilityDraft] = useState<string[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [tmplRes, cgRes, termsRes] = await Promise.all([
          fetch("/api/admin/templates", { cache: "no-store" }),
          fetch("/api/admin/class-groups", { cache: "no-store" }),
          fetch("/api/admin/terms", { cache: "no-store" }),
        ]);
        if (!mounted) return;
        const tmplData = await tmplRes.json().catch(() => ({}));
        const cgData = await cgRes.json().catch(() => ({}));
        const termsData = await termsRes.json().catch(() => ({}));
        setTemplates(tmplData.templates || []);
        setClassGroups(cgData.classGroups || []);
        setTerms(termsData.terms || []);
      } catch {
        if (mounted) setStatus("Failed to load templates.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleUpload(type: string) {
    const form = uploadForms[type];
    if (!form?.file) return;
    const name = form.name.trim() || form.file.name;

    setUploading(type);
    setStatus("");
    try {
      const data = new FormData();
      data.append("file", form.file);
      data.append("name", name);
      data.append("type", type);
      if (type === "REPORT_CARD" && form.classGroup?.trim()) {
        data.append("classGroupName", form.classGroup.trim());
      }
      if (type === "REPORT_CARD" && form.termName?.trim()) {
        data.append("termName", form.termName.trim());
      }
      if (form.fieldConfig && form.fieldConfig.length > 0) {
        data.append("fieldConfig", JSON.stringify(form.fieldConfig));
      }
      if (form.eligibleClassGroups && form.eligibleClassGroups.length > 0) {
        data.append("eligibleClassGroups", JSON.stringify(form.eligibleClassGroups));
      }
      const res = await fetch("/api/admin/templates", { method: "POST", body: data });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(payload?.error ?? "Upload failed.");
        return;
      }
      setStatus(`${templateTypes.find((t) => t.key === type)?.label} template "${name}" uploaded.`);
      setUploadForms((prev) => ({ ...prev, [type]: { name: "", classGroup: "", termName: "", file: null, fieldConfig: [], eligibleClassGroups: [] } }));
      // refresh list
      const refresh = await fetch("/api/admin/templates", { cache: "no-store" });
      const d = await refresh.json();
      setTemplates(d.templates || []);
    } catch {
      setStatus("Upload error.");
    } finally {
      setUploading(null);
    }
  }

  function startEditConfig(template: Template) {
    let parsed: FieldConfig[] = [];
    try {
      parsed = template.field_config ? JSON.parse(template.field_config) : fieldPresets[template.type] || [];
    } catch {
      parsed = fieldPresets[template.type] || [];
    }
    setConfigDraft(parsed);
    let parsedEligibility: string[] = [];
    try {
      parsedEligibility = template.eligible_class_groups ? JSON.parse(template.eligible_class_groups) : [];
    } catch {
      parsedEligibility = [];
    }
    setEligibilityDraft(parsedEligibility);
    setEditingConfig(template.id);
  }

  async function saveConfig(templateId: number) {
    setSavingConfig(true);
    try {
      const res = await fetch(`/api/admin/templates?id=${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldConfig: JSON.stringify(configDraft),
          eligibleClassGroups: JSON.stringify(eligibilityDraft),
        }),
      });
      if (res.ok) {
        setStatus("Template configuration saved.");
        setEditingConfig(null);
        const refresh = await fetch("/api/admin/templates", { cache: "no-store" });
        const d = await refresh.json();
        setTemplates(d.templates || []);
      } else {
        setStatus("Failed to save configuration.");
      }
    } catch {
      setStatus("Failed to save configuration.");
    } finally {
      setSavingConfig(false);
    }
  }

  function toggleFieldFixed(idx: number) {
    setConfigDraft((prev) => prev.map((f, i) => i === idx ? { ...f, fixed: !f.fixed } : f));
  }

  function updateFieldLabel(idx: number, label: string) {
    setConfigDraft((prev) => prev.map((f, i) => i === idx ? { ...f, label } : f));
  }

  function addField() {
    setConfigDraft((prev) => [...prev, { key: `custom_${Date.now()}`, label: "New Field", source: "custom", fixed: false }]);
  }

  function removeField(idx: number) {
    setConfigDraft((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleEligibility(groupName: string) {
    setEligibilityDraft((prev) => prev.includes(groupName) ? prev.filter((g) => g !== groupName) : [...prev, groupName]);
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this template?")) return;
    try {
      const res = await fetch(`/api/admin/templates?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setStatus("Template removed.");
        const refresh = await fetch("/api/admin/templates", { cache: "no-store" });
        const d = await refresh.json();
        setTemplates(d.templates || []);
      }
    } catch {
      setStatus("Delete failed.");
    }
  }

  function setFormField(type: string, field: string, value: string | File | null) {
    setUploadForms((prev) => {
      const existing = prev[type] || { name: "", classGroup: "", termName: "", file: null, fieldConfig: [], eligibleClassGroups: [] };
      return {
        ...prev,
        [type]: { ...existing, [field]: value },
      };
    });
  }

  function initFieldConfig(type: string) {
    setUploadForms((prev) => {
      const existing = prev[type] || { name: "", classGroup: "", termName: "", file: null, fieldConfig: [], eligibleClassGroups: [] };
      if (existing.fieldConfig.length > 0) return prev;
      return {
        ...prev,
        [type]: { ...existing, fieldConfig: fieldPresets[type] || [] },
      };
    });
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      {status ? (
        <div className={`rounded-lg border px-4 py-3 text-sm ${status.includes("failed") || status.includes("Failed") || status.includes("error") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {status}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {templateTypes.map((t) => {
          const typeTemplates = templates.filter((tm) => tm.type === t.key);
          const Icon = t.icon;
          const form = uploadForms[t.key] || { name: "", classGroup: "", termName: "", file: null, fieldConfig: [], eligibleClassGroups: [] };
          const hasFile = !!form.file;
          const tt = t as typeof templateTypes[number] & { hasEligibility?: boolean };

          return (
            <div key={t.key} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{t.label}</h4>
                  <p className="text-xs text-slate-500">{t.desc}</p>
                </div>
              </div>

              {/* Existing templates list */}
              {typeTemplates.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {typeTemplates.map((tm) => (
                    <div key={tm.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700">{tm.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            <span className="uppercase">{tm.file_type}</span>
                            {tm.class_group_name && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">{tm.class_group_name}</span>}
                            {tm.term_name && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">{tm.term_name}</span>}
                            {tm.eligible_class_groups && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700" title={tm.eligible_class_groups}>
                                {JSON.parse(tm.eligible_class_groups).length} eligible
                              </span>
                            )}
                            {tm.field_config && (
                              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-700" title="Field config set">
                                configured
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEditConfig(tm)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-200" title="Configure fields">
                            <Settings2 className="h-4 w-4 text-slate-600" />
                          </button>
                          <a href={tm.file_url} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-200" title="Preview">
                            <Eye className="h-4 w-4 text-slate-600" />
                          </a>
                          <button onClick={() => handleDelete(tm.id)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-rose-100" title="Remove">
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </button>
                        </div>
                      </div>

                      {/* Inline config editor */}
                      {editingConfig === tm.id && (
                        <div className="mt-3 border-t border-slate-200 pt-3 space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-slate-700">Field Configuration</p>
                              <button onClick={addField} className="text-xs text-indigo-600 hover:underline">+ Add Field</button>
                            </div>
                            <div className="space-y-1.5">
                              {configDraft.map((f, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={f.label}
                                    onChange={(e) => updateFieldLabel(idx, e.target.value)}
                                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
                                  />
                                  <span className="text-[10px] text-slate-400 uppercase">{f.source}</span>
                                  <button
                                    onClick={() => toggleFieldFixed(idx)}
                                    className={`rounded px-2 py-1 text-[10px] font-medium ${f.fixed ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}
                                    title={f.fixed ? "Fixed (auto-filled, not editable)" : "Editable when issuing"}
                                  >
                                    {f.fixed ? "Fixed" : "Editable"}
                                  </button>
                                  <button onClick={() => removeField(idx)} className="text-rose-400 hover:text-rose-600">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              {configDraft.length === 0 && <p className="text-xs text-slate-400">No fields configured.</p>}
                            </div>
                          </div>

                          {tt.hasEligibility && (
                            <div>
                              <p className="text-xs font-semibold text-slate-700 mb-2">Eligible Class Groups</p>
                              <div className="flex flex-wrap gap-1.5">
                                {classGroups.map((cg) => (
                                  <button
                                    key={cg.id}
                                    onClick={() => toggleEligibility(cg.name)}
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${eligibilityDraft.includes(cg.name) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                                  >
                                    {eligibilityDraft.includes(cg.name) && <Check className="mr-1 inline h-3 w-3" />}
                                    {cg.name}
                                  </button>
                                ))}
                                {classGroups.length === 0 && <p className="text-xs text-slate-400">No class groups found.</p>}
                              </div>
                              <p className="mt-1 text-[10px] text-slate-400">Leave empty to allow all class groups.</p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button size="sm" disabled={savingConfig} onClick={() => saveConfig(tm.id)} className="bg-indigo-600 hover:bg-indigo-700">
                              {savingConfig ? "Saving..." : "Save Config"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingConfig(null)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border-2 border-dashed border-slate-200 p-4 text-center">
                  <p className="text-sm text-slate-400">No templates uploaded</p>
                </div>
              )}

              {/* Upload form */}
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <Input
                  placeholder="Template name (e.g. Junior Secondary Report)"
                  value={form.name}
                  onChange={(e) => setFormField(t.key, "name", e.target.value)}
                  className="bg-white text-sm"
                />
                {t.hasClassGroup && (
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    value={form.classGroup}
                    onChange={(e) => setFormField(t.key, "classGroup", e.target.value)}
                  >
                    <option value="">All Class Groups (default)</option>
                    {classGroups.map((cg) => (
                      <option key={cg.id} value={cg.name}>{cg.name}</option>
                    ))}
                    {classGroups.length === 0 && <option value="" disabled>No class groups found</option>}
                  </select>
                )}
                {t.hasTerm && (
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    value={form.termName}
                    onChange={(e) => setFormField(t.key, "termName", e.target.value)}
                  >
                    <option value="">Select Term (optional)</option>
                    {terms.map((term) => (
                      <option key={term.id} value={term.name}>{term.name}</option>
                    ))}
                    {terms.length === 0 && <option value="" disabled>No terms found</option>}
                  </select>
                )}
                {(tt.hasEligibility || fieldPresets[t.key]) && (
                  <button
                    onClick={() => initFieldConfig(t.key)}
                    className="w-full rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
                  >
                    {form.fieldConfig.length > 0 ? `Fields configured (${form.fieldConfig.length})` : "Configure fields (optional)"}
                  </button>
                )}
                {form.fieldConfig.length > 0 && (
                  <div className="rounded-md bg-violet-50/50 p-2 space-y-1">
                    {form.fieldConfig.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{f.label}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${f.fixed ? "bg-slate-200 text-slate-500" : "bg-emerald-100 text-emerald-600"}`}>{f.fixed ? "Fixed" : "Editable"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {tt.hasEligibility && form.eligibleClassGroups.length === 0 && (
                  <p className="text-[10px] text-amber-600">Configure eligible class groups after upload (click gear icon).</p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={(el) => { fileRefs.current[t.key] = el; }}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFormField(t.key, "file", file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileRefs.current[t.key]?.click()}
                    className="flex-1"
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {form.file ? form.file.name.substring(0, 20) : "Choose File"}
                  </Button>
                  {hasFile && (
                    <button onClick={() => setFormField(t.key, "file", null)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-200">
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={!hasFile || uploading === t.key}
                  onClick={() => handleUpload(t.key)}
                  className="w-full"
                >
                  {uploading === t.key ? "Uploading..." : "Upload Template"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">
        Supported formats: PDF, Excel (.xlsx, .xls), Word (.doc, .docx). Multiple templates allowed per type. Use the gear icon to configure fields and class eligibility after upload.
      </p>
    </div>
  );
}
