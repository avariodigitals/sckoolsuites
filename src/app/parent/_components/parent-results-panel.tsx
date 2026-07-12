"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type SubjectScore = {
  id: string;
  subjectName: string;
  total: number;
  grade: string;
};

type ChildResultSummary = {
  studentId: string;
  studentName: string;
  className: string;
  termName: string;
  sessionName: string;
  termPercentage: number | null;
  termGrade: string | null;
  termGpa: number | null;
  classTeacherComment: string | null;
  principalComment: string | null;
  fileUrl: string | null;
  fileName: string | null;
  subjects: SubjectScore[];
};

export function ParentResultsPanel({ data }: { data: ChildResultSummary[] }) {
  const [activeTab, setActiveTab] = useState<"recent" | "preview">("recent");
  const [selectedStudentId, setSelectedStudentId] = useState(data[0]?.studentId ?? "");

  const selected = useMemo(() => data.find((item) => item.studentId === selectedStudentId) ?? null, [data, selectedStudentId]);
  const previewUrl = selected ? `/reports/${selected.studentId}` : "";

  if (!data.length) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">No published result is available yet.</div>;
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("recent")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${activeTab === "recent" ? "bg-[var(--brand-primary)] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          Recent Results
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${activeTab === "preview" ? "bg-[var(--brand-primary)] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          A4 Preview
        </button>
      </div>

      {activeTab === "recent" ? (
        <section className="space-y-3">
          {data.map((item) => {
            const average = item.subjects.length ? item.subjects.reduce((sum, row) => sum + row.total, 0) / item.subjects.length : 0;
            const isUploadedPdf = Boolean(item.fileUrl);

            return (
              <article key={item.studentId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] px-4 py-3 text-white">
                  <p className="text-base font-semibold">{item.studentName} - Result Summary</p>
                  <p className="text-xs text-white/80">{item.className} • {item.termName || "-"} / {item.sessionName || "-"}</p>
                </div>

                {isUploadedPdf ? (
                  <div className="space-y-3 p-4">
                    <p className="text-sm text-slate-600">This result was uploaded as a PDF by the class teacher.</p>
                    <a
                      href={item.fileUrl!}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Download PDF ({item.fileName || "result.pdf"})
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4 p-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Term Percentage</p>
                      <p className="mt-1 text-xl font-extrabold text-slate-900">{item.termPercentage !== null ? `${item.termPercentage.toFixed(1)}%` : "-"}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Term Grade</p>
                      <p className="mt-1 text-xl font-extrabold text-slate-900">{item.termGrade ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Term GPA</p>
                      <p className="mt-1 text-xl font-extrabold text-slate-900">{item.termGpa !== null ? item.termGpa.toFixed(2) : "-"}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Subject Average</p>
                      <p className="mt-1 text-xl font-extrabold text-slate-900">{item.subjects.length ? `${average.toFixed(1)}%` : "-"}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">Class Teacher Comment</p>
                      <p className="text-sm text-slate-700">{item.classTeacherComment ?? "No class teacher comment yet."}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">Principal Comment</p>
                      <p className="text-sm text-slate-700">{item.principalComment ?? "No principal comment yet."}</p>
                    </div>
                  </div>

                  <section className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Subject Performance</p>
                    </div>
                    {item.subjects.length ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-600">
                              <th className="px-3 py-2">Subject</th>
                              <th className="px-3 py-2 text-right">Score</th>
                              <th className="px-3 py-2 text-right">Grade</th>
                              <th className="px-3 py-2">Progress</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.subjects.map((score, index) => (
                              <tr key={score.id} className={index % 2 ? "bg-white" : "bg-slate-50/70"}>
                                <td className="px-3 py-2 font-medium text-slate-800">{score.subjectName}</td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900">{score.total.toFixed(1)}%</td>
                                <td className="px-3 py-2 text-right"><span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">{score.grade}</span></td>
                                <td className="px-3 py-2">
                                  <div className="h-2 rounded-full bg-slate-200">
                                    <div className="h-2 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]" style={{ width: `${Math.max(0, Math.min(100, score.total))}%` }} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="p-3 text-sm text-slate-500">No subject performance records.</p>}
                  </section>
                </div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Select Report</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
              >
                {data.map((item) => (
                  <option key={item.studentId} value={item.studentId}>{item.studentName} - {item.termName || "Current Term"}</option>
                ))}
              </select>
            </div>

            <Link
              href={previewUrl || "#"}
              target="_blank"
              className={`rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium ${previewUrl ? "bg-white text-slate-800 hover:bg-slate-50" : "pointer-events-none bg-slate-100 text-slate-400"}`}
            >
              Open Full Report
            </Link>

            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${previewUrl ? "bg-[var(--brand-primary)]" : "bg-slate-400"}`}
              disabled={!previewUrl}
              onClick={() => {
                if (!previewUrl) return;
                window.open(previewUrl, "_blank", "noopener,noreferrer");
              }}
            >
              Download / Print
            </button>
          </div>

          {previewUrl ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">A4 Report Preview</div>
              <iframe
                key={previewUrl}
                title="A4 report preview"
                src={previewUrl}
                className="h-[900px] w-full bg-white"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Select a report to preview.</div>
          )}
        </section>
      )}
    </section>
  );
}
