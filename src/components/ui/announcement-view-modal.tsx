"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export type AnnouncementData = {
  id: string | number;
  title: string;
  body: string;
  isHtml?: boolean;
  audience?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function AnnouncementViewModal({
  announcement,
  onClose,
}: {
  announcement: AnnouncementData | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!announcement) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [announcement, onClose]);

  if (!announcement) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {announcement.title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {announcement.audience && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {announcement.audience}
                </span>
              )}
              {announcement.createdAt && (
                <span>
                  {new Date(announcement.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          {announcement.isHtml ? (
            <div
              className="prose prose-sm sm:prose-base max-w-none text-slate-700 dark:text-slate-300
                [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic
                [&_a]:text-blue-600 [&_a]:underline
                [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mt-4 [&_h3]:mb-2
                [&_p]:leading-relaxed [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: announcement.body }}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {announcement.body}
            </p>
          )}
        </div>

        {/* Footer: Attachment + Close */}
        {(announcement.attachmentUrl || true) && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-3 dark:border-slate-700">
            <div className="flex-1 min-w-0">
              {announcement.attachmentUrl ? (
                <a
                  href={announcement.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                >
                  📎 {announcement.attachmentName ?? "Download attachment"}
                </a>
              ) : (
                <span className="text-xs text-slate-400">No attachment</span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
