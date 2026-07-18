"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, Download, Eye, Lock } from "lucide-react";
import { getCloudinaryInlineUrl } from "@/lib/utils";

type IssuedDoc = {
  id: number;
  title: string;
  documentType: string;
  typeLabel: string;
  status: string;
  parentDownloadable: boolean;
  fileUrl: string;
  templateName: string | null;
  studentName: string;
  studentId: number;
  createdAt: string;
};

export function ParentDocumentsPanel({ childId }: { childId?: string }) {
  const [documents, setDocuments] = useState<IssuedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewDoc, setPreviewDoc] = useState<IssuedDoc | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const url = childId
          ? `/api/parent/issued-docs?childId=${childId}`
          : "/api/parent/issued-docs";
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (mounted && res.ok) {
          setDocuments(data.documents || []);
        } else if (mounted) {
          setError(data?.error ?? "Failed to load documents.");
        }
      } catch {
        if (mounted) setError("Failed to load documents.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [childId]);

  if (loading) {
    return (
      <Card className="glass-panel">
        <CardContent className="p-6 text-sm text-slate-500">Loading documents...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-panel">
        <CardContent className="p-6 text-sm text-rose-600">{error}</CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="glass-panel">
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-500">
          No documents have been issued yet. Documents issued by the school (ID Cards, Certificates, Transcripts, Awards, Testimonials) will appear here.
        </CardContent>
      </Card>
    );
  }

  const grouped = documents.reduce((acc, doc) => {
    const key = doc.studentName || "All";
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {} as Record<string, IssuedDoc[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([studentName, docs]) => (
        <Card key={studentName} className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck className="h-4 w-4 text-indigo-600" />
              {studentName}
              <span className="text-xs font-normal text-slate-400">({docs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{doc.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">{doc.typeLabel}</span>
                    <span className={`rounded px-1.5 py-0.5 font-medium ${doc.status === "FINALIZED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {doc.status}
                    </span>
                    <span className="text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  {doc.parentDownloadable ? (
                    <a
                      href={getCloudinaryInlineUrl(doc.fileUrl)}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  ) : (
                    <span className="flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-400">
                      <Lock className="h-3.5 w-3.5" />
                      Download on request
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">{previewDoc.title}</h3>
              <div className="flex items-center gap-2">
                {previewDoc.parentDownloadable && (
                  <a
                    href={getCloudinaryInlineUrl(previewDoc.fileUrl)}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Download
                  </a>
                )}
                <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
              </div>
            </div>
            <iframe src={getCloudinaryInlineUrl(previewDoc.fileUrl)} title={previewDoc.title} className="h-full w-full bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
