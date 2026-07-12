"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, FileSpreadsheet, FileType, Trash2, Upload, Eye, X } from "lucide-react";

const templateTypes = [
  { key: "REPORT_CARD", label: "Report Card", icon: FileText, desc: "Upload templates per class group for student report cards" },
  { key: "INVOICE", label: "Invoice", icon: FileSpreadsheet, desc: "Upload templates for fee invoices" },
  { key: "RECEIPT", label: "Receipt", icon: FileType, desc: "Upload templates for payment receipts" },
];

type Template = {
  id: number;
  name: string;
  type: string;
  class_group_name: string | null;
  term_name: string | null;
  file_url: string;
  file_type: string;
  is_active: boolean;
  created_at: string;
};

type ClassGroup = { id: string; name: string };
type Term = { id: number; name: string; session_id: number; is_current: boolean; status: string };

export function TemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadForms, setUploadForms] = useState<Record<string, { name: string; classGroup: string; termName: string; file: File | null }>>({});

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
      const res = await fetch("/api/admin/templates", { method: "POST", body: data });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(payload?.error ?? "Upload failed.");
        return;
      }
      setStatus(`${templateTypes.find((t) => t.key === type)?.label} template "${name}" uploaded.`);
      setUploadForms((prev) => ({ ...prev, [type]: { name: "", classGroup: "", termName: "", file: null } }));
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
      const existing = prev[type] || { name: "", classGroup: "", termName: "", file: null };
      return {
        ...prev,
        [type]: { ...existing, [field]: value },
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

      <div className="grid gap-4 md:grid-cols-3">
        {templateTypes.map((t) => {
          const typeTemplates = templates.filter((tm) => tm.type === t.key);
          const Icon = t.icon;
          const form = uploadForms[t.key] || { name: "", classGroup: "", file: null };
          const hasFile = !!form.file;

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
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="uppercase">{tm.file_type}</span>
                            {tm.class_group_name && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">{tm.class_group_name}</span>}
                            {tm.term_name && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">{tm.term_name}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a href={tm.file_url} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-200" title="Preview">
                            <Eye className="h-4 w-4 text-slate-600" />
                          </a>
                          <button onClick={() => handleDelete(tm.id)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-rose-100" title="Remove">
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </button>
                        </div>
                      </div>
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
                {t.key === "REPORT_CARD" && (
                  <>
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
                  </>
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
        Supported formats: PDF, Excel (.xlsx, .xls), Word (.doc, .docx). Multiple templates allowed per type. For Report Cards, specify a class group and term to use different templates per group and term.
      </p>
    </div>
  );
}
