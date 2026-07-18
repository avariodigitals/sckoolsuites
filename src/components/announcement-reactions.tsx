"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const REACTION_EMOJIS = ["👍", "❤️", "🎉", "🙏", "💡", "😮", "😢", "👎"];

type ReactionData = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export function AnnouncementReactions({ announcementId }: { announcementId: number | string }) {
  const [reactions, setReactions] = useState<ReactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  const fetchReactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/announcements/${announcementId}/reactions`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setReactions(data.reactions || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/announcements/${announcementId}/reactions`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active) setReactions(data.reactions || []);
        }
      } catch {
        // silently fail
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [announcementId]);

  const toggleReaction = async (emoji: string) => {
    setPickerOpen(false);
    const prev = reactions;
    const existing = prev.find((r) => r.emoji === emoji);
    if (existing?.reactedByMe) {
      setReactions(prev.map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, reactedByMe: false } : r).filter((r) => r.count > 0));
    } else {
      setReactions(prev => {
        const found = prev.find((r) => r.emoji === emoji);
        if (found) return prev.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r);
        return [...prev, { emoji, count: 1, reactedByMe: true }];
      });
    }
    try {
      await fetch(`/api/announcements/${announcementId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      fetchReactions();
    } catch {
      setReactions(prev);
    }
  };

  if (loading) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
            r.reactedByMe
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}

      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50"
          title="Add reaction"
        >
          😊+
        </button>
        {pickerOpen && (
            <div className="absolute z-20 mt-1 flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="rounded-md p-1 text-lg hover:bg-slate-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}
