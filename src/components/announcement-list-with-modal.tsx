"use client";

import { useState } from "react";
import { AnnouncementViewModal, type AnnouncementData } from "@/components/ui/announcement-view-modal";

type AnnouncementItem = {
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

export function AnnouncementListWithModal({
  announcements,
  emptyMessage = "No announcements available.",
  maxPreviewLength = 180,
}: {
  announcements: AnnouncementItem[];
  emptyMessage?: string;
  maxPreviewLength?: number;
}) {
  const [viewing, setViewing] = useState<AnnouncementData | null>(null);

  if (!announcements.length) {
    return <p className="text-slate-500">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {announcements.map((item) => (
          <div key={item.id} className="glass-soft rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{item.title}</p>
                {item.isHtml ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: item.body }}
                  />
                ) : (
                  <p className="text-slate-600 line-clamp-3">{item.body.slice(0, maxPreviewLength)}</p>
                )}
                {item.attachmentUrl && (
                  <a
                    href={item.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    📎 {item.attachmentName ?? "Download attachment"}
                  </a>
                )}
                {item.createdAt && (
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewing(item)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnnouncementViewModal announcement={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
