"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  isHtml: boolean;
  sendEmail: boolean;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
};

const audienceOptions = [
  { value: "ALL", label: "Everyone (All Users)" },
  { value: "STUDENTS", label: "Students Only" },
  { value: "PARENTS", label: "Parents Only" },
  { value: "TEACHERS", label: "Teachers Only" },
  { value: "STAFF", label: "Staff Only" },
  { value: "STUDENTS,PARENTS", label: "Students & Parents" },
  { value: "TEACHERS,STAFF", label: "Teachers & Staff" },
];

type FormState = {
  title: string;
  body: string;
  audience: string;
  sendEmail: boolean;
  attachmentUrl: string | null;
  attachmentName: string | null;
};

const emptyForm: FormState = {
  title: "",
  body: "",
  audience: "ALL",
  sendEmail: false,
  attachmentUrl: null,
  attachmentName: null,
};

export function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAnnouncements = useMemo(() => {
    if (!searchQuery.trim()) return announcements;
    const query = searchQuery.toLowerCase();
    return announcements.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.body.toLowerCase().includes(query) ||
        a.audience.toLowerCase().includes(query)
    );
  }, [announcements, searchQuery]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/announcements", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Unable to load announcements.");
        return;
      }
      setAnnouncements(payload.announcements ?? []);
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
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(announcement: Announcement) {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      sendEmail: false,
      attachmentUrl: announcement.attachmentUrl,
      attachmentName: announcement.attachmentName,
    });
    setShowForm(true);
    setStatus("");
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "announcements");
      formData.append("schoolId", "default");

      const response = await fetch("/api/admin/announcements/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Upload failed.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        attachmentUrl: payload.url,
        attachmentName: payload.fileName ?? file.name,
      }));
    } catch {
      setStatus("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  }

  function removeAttachment() {
    setForm((prev) => ({ ...prev, attachmentUrl: null, attachmentName: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    setStatus("");
    setSubmitting(true);

    const payload = {
      title: form.title,
      body: form.body,
      audience: form.audience,
      isHtml: true,
      sendEmail: form.sendEmail,
      attachmentUrl: form.attachmentUrl,
      attachmentName: form.attachmentName,
    };

    try {
      const url = editingId
        ? `/api/admin/announcements/${editingId}`
        : "/api/admin/announcements";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(result?.error ?? "Failed to save announcement.");
        return;
      }

      const action = editingId ? "updated" : "created";
      let msg = `Announcement ${action} successfully.`;
      if (result.emailResult) {
        msg += ` Email sent to ${result.emailResult.sent} recipient(s)`;
        if (result.emailResult.failed > 0) {
          msg += ` (${result.emailResult.failed} failed)`;
        }
        msg += ".";
      }
      setStatus(msg);
      resetForm();
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete announcement "${title}"? This cannot be undone.`)) {
      return;
    }

    setStatus("");
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to delete announcement.");
        return;
      }

      setStatus("Announcement deleted.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  function getAudienceLabel(audience: string) {
    const option = audienceOptions.find((o) => o.value === audience);
    return option?.label ?? audience;
  }

  function getAudienceColor(audience: string) {
    if (audience === "ALL") return "bg-purple-100 text-purple-700";
    if (audience.includes("STUDENTS")) return "bg-blue-100 text-blue-700";
    if (audience.includes("PARENTS")) return "bg-emerald-100 text-emerald-700";
    if (audience.includes("TEACHERS")) return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading announcements...</div>;
  }

  return (
    <div className="space-y-4">
      {status && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${status.includes("success") || status.includes("created") || status.includes("deleted") || status.includes("updated") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      )}

      {/* Search and Add */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by title, content, or audience..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); } }}>
          {showForm ? "Cancel" : "+ New Announcement"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            {editingId ? "Edit Announcement" : "Create New Announcement"}
          </h3>
          <div className="space-y-3">
            <Input
              placeholder="Announcement Title *"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.audience}
              onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
            >
              {audienceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <RichTextEditor
              value={form.body}
              onChange={(html) => setForm((prev) => ({ ...prev, body: html }))}
              placeholder="Write your announcement content here..."
              minHeight={220}
            />

            {/* Attachment */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Attachment (optional)</label>
              {form.attachmentUrl ? (
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-600 flex-1 truncate">
                    📎 {form.attachmentName ?? "attachment"}
                  </span>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="text-xs text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {uploading && <span className="text-xs text-slate-500">Uploading...</span>}
                </div>
              )}
            </div>

            {/* Send Email Option */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sendEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">
                Send to email recipients <span className="text-slate-400">(recipients will receive an email notification)</span>
              </span>
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting || !form.title.trim() || !form.body.trim()}>
              {submitting ? "Saving..." : editingId ? "Update Announcement" : "Publish Announcement"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Announcements ({filteredAnnouncements.length})
        </h3>
        <div className="space-y-3">
          {filteredAnnouncements.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No announcements yet. Create your first announcement!</p>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <div key={announcement.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="font-semibold text-slate-900">{announcement.title}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${getAudienceColor(announcement.audience)}`}>
                        {getAudienceLabel(announcement.audience)}
                      </span>
                      {announcement.sendEmail && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                          ✉ Email sent
                        </span>
                      )}
                    </div>
                    {announcement.isHtml ? (
                      <div
                        className="prose prose-sm max-w-none text-slate-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: announcement.body }}
                      />
                    ) : (
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{announcement.body}</p>
                    )}
                    {announcement.attachmentUrl && (
                      <a
                        href={announcement.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        📎 {announcement.attachmentName ?? "Download attachment"}
                      </a>
                    )}
                    <p className="mt-2 text-xs text-slate-400">
                      Posted {new Date(announcement.createdAt).toLocaleString()}
                      {announcement.updatedAt !== announcement.createdAt && (
                        <span> · Edited {new Date(announcement.updatedAt).toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(announcement)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(announcement.id, announcement.title)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
