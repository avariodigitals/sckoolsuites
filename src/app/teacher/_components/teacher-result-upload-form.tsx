"use client";

import { useEffect, useState } from "react";
import { getCloudinaryInlineUrl } from "@/lib/utils";

type StudentOption = {
  id: string | number;
  name: string;
};

export function TeacherResultUploadForm({ studentOptions }: { studentOptions: StudentOption[] }) {
  const [studentId, setStudentId] = useState<string>(() => String(studentOptions[0]?.id ?? ""));
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploads, setUploads] = useState<Array<{ id: number; fileName: string; fileUrl: string; status: string; studentName: string }>>([]);

  useEffect(() => {
    async function loadUploads() {
      try {
        const response = await fetch("/api/teacher/results");
        if (!response.ok) return;
        const payload = await response.json();
        if (Array.isArray(payload)) {
          setUploads(payload.map((item: any) => ({
            id: item.id,
            fileName: item.fileName,
            fileUrl: item.fileUrl,
            status: item.status,
            studentName: item.student?.name ?? "Student",
          })));
        }
      } catch {
        // ignore
      }
    }
    loadUploads();
  }, []);

  async function submit() {
    if (!studentId || !file) {
      setMessage("Select a student and a PDF file first.");
      return;
    }

    setSubmitting(true);
    setMessage("Uploading result PDF...");

    const formData = new FormData();
    formData.append("studentId", studentId);
    formData.append("file", file);

    try {
      const response = await fetch("/api/teacher/results/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      setSubmitting(false);

      if (!response.ok) {
        setMessage(payload?.error ?? "Could not upload result PDF.");
        return;
      }

      setMessage("Result PDF uploaded and published. Students and parents can now view it.");
      setFile(null);
      setUploads((prev) => [
        {
          id: payload.result?.id,
          fileName: payload.result?.fileName,
          fileUrl: payload.result?.fileUrl,
          status: payload.result?.status,
          studentName: studentOptions.find((item) => String(item.id) === studentId)?.name ?? "Student",
        },
        ...prev,
      ]);
    } catch (error) {
      setSubmitting(false);
      setMessage(error instanceof Error ? error.message : "Upload failed");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Upload Result PDF</p>
      <p className="text-xs text-amber-700">Once submitted, reports cannot be edited or replaced. To make corrections, contact your head teacher or admin.</p>
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <select
          className="rounded-md border border-slate-300 px-3 py-2"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
        >
          {studentOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <input
          type="file"
          accept="application/pdf"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {file ? <p className="text-xs text-slate-600">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p> : null}

      <button
        type="button"
        disabled={submitting}
        className="rounded-md bg-[var(--brand-primary)] px-3 py-2 text-white disabled:opacity-60"
        onClick={submit}
      >
        {submitting ? "Uploading..." : "Upload Result PDF"}
      </button>

      {message ? <p className="text-xs text-slate-600">{message}</p> : null}

      {uploads.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Your uploaded reports</p>
          {uploads.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-2 text-sm">
              <div>
                <p className="font-medium text-slate-800">{item.studentName}</p>
                <p className="text-xs text-slate-500">{item.fileName} • {item.status}</p>
              </div>
              <a
                href={getCloudinaryInlineUrl(item.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
              >
                View
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
