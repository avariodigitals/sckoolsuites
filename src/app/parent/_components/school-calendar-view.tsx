"use client";

import { useState } from "react";

type CalendarEvent = {
  date: string; // ISO yyyy-mm-dd
  label: string;
  type: "term-start" | "term-end" | "resumption" | "announcement" | "holiday" | "school-event";
};

interface SchoolCalendarViewProps {
  events: CalendarEvent[];
}

const TYPE_META: Record<CalendarEvent["type"], { dot: string; badge: string; text: string; emoji: string }> = {
  "term-start":    { dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700 border-blue-300",   text: "Term Start",    emoji: "📅" },
  "term-end":      { dot: "bg-rose-500",   badge: "bg-rose-100 text-rose-700 border-rose-300",   text: "Term End",      emoji: "🏁" },
  resumption:      { dot: "bg-emerald-500",badge: "bg-emerald-100 text-emerald-700 border-emerald-300",text: "Resumption", emoji: "🔔" },
  announcement:    { dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700 border-amber-300", text: "Announcement",  emoji: "📢" },
  holiday:         { dot: "bg-violet-500", badge: "bg-violet-100 text-violet-700 border-violet-300",text: "Holiday",     emoji: "🎉" },
  "school-event":  { dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700 border-indigo-300",text: "School Event", emoji: "🏫" },
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SchoolCalendarView({ events }: SchoolCalendarViewProps) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [selected, setSelected] = useState<string | null>(null);

  // build the days grid
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const leadBlanks = firstDay.getDay(); // 0=Sun
  const totalCells = leadBlanks + lastDay.getDate();
  const cells = Math.ceil(totalCells / 7) * 7;

  // event index by date
  const eventMap: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!eventMap[ev.date]) eventMap[ev.date] = [];
    eventMap[ev.date].push(ev);
  }

  const todayYMD = toYMD(today);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const selectedEvents = selected ? (eventMap[selected] ?? []) : [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] px-5 py-3 text-white">
        <button
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-lg font-bold"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-lg font-bold">{MONTH_NAMES[month]}</p>
          <p className="text-xs text-white/70">{year}</p>
        </div>
        <button
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-lg font-bold"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* day-of-week header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {DAY_LABELS.map((d) => (
          <div key={d} className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wide ${d === "Sun" || d === "Sat" ? "text-rose-400" : "text-slate-500"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* day cells */}
      <div className="grid grid-cols-7">
        {Array.from({ length: cells }, (_, i) => {
          const dayNum = i - leadBlanks + 1;
          if (dayNum < 1 || dayNum > lastDay.getDate()) {
            return <div key={i} className="h-20 border-b border-r border-slate-100 bg-slate-50/50" />;
          }
          const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const dayEvents = eventMap[ymd] ?? [];
          const isToday   = ymd === todayYMD;
          const isSelected = ymd === selected;
          const col = i % 7;
          const isWeekend = col === 0 || col === 6;

          return (
            <button
              key={i}
              onClick={() => setSelected(isSelected ? null : ymd)}
              className={[
                "relative flex h-20 flex-col border-b border-r border-slate-100 p-1 text-left transition-colors overflow-hidden",
                isWeekend ? "bg-rose-50/40" : "bg-white hover:bg-slate-50",
                isSelected ? "ring-2 ring-inset ring-blue-400 bg-blue-50" : "",
              ].join(" ")}
            >
              {/* day number */}
              <span className={[
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                isToday ? "bg-[var(--brand-primary)] text-white" : isWeekend ? "text-rose-500" : "text-slate-700",
              ].join(" ")}>
                {dayNum}
              </span>

              {/* event excerpts */}
              {dayEvents.length > 0 && (
                <div className="mt-0.5 w-full space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, 2).map((ev, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-0.5 rounded px-1 py-0.5 leading-tight ${TYPE_META[ev.type].badge} border`}
                      style={{ fontSize: "9px" }}
                    >
                      <span className="shrink-0">{TYPE_META[ev.type].emoji}</span>
                      <span className="truncate font-medium">{ev.label}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <p style={{ fontSize: "9px" }} className="pl-1 text-slate-400">+{dayEvents.length - 2} more</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* selected day events panel */}
      {selected && (
        <div className="border-t border-slate-200 px-5 py-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            {new Date(selected + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          {selectedEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedEvents.map((ev, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${TYPE_META[ev.type].badge}`}>
                  <span>{TYPE_META[ev.type].emoji}</span>
                  <span className="font-medium">{TYPE_META[ev.type].text}</span>
                  <span className="text-slate-600">— {ev.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No scheduled events on this day.</p>
          )}
        </div>
      )}

      {/* legend */}
      <div className="flex flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
        {(Object.keys(TYPE_META) as CalendarEvent["type"][]).map((type) => (
          <div key={type} className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className={`h-2.5 w-2.5 rounded-full ${TYPE_META[type].dot}`} />
            {TYPE_META[type].text}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[9px] text-white font-bold">T</span>
          Today
        </div>
      </div>
    </div>
  );
}
