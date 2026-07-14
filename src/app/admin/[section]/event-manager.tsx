"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Plus, Trash2, X, MapPin, Clock } from "lucide-react";

type SchoolEvent = {
  id: number;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  isAllDay: boolean;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function eventTypeColor(type: string) {
  const t = type.toLowerCase();
  if (t === "holiday") return "border-rose-200 bg-rose-50 text-rose-700";
  if (t === "exam") return "border-amber-200 bg-amber-50 text-amber-700";
  if (t === "meeting") return "border-blue-200 bg-blue-50 text-blue-700";
  if (t === "sport") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (t === "ceremony") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function EventManager() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    eventType: "general",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    location: "",
    isAllDay: true,
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/events", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setEvents(payload.events ?? []);
      } else {
        setToast(payload?.error ?? "Failed to load events.");
      }
    } catch {
      setToast("Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadEvents(), 0);
    return () => clearTimeout(timer);
  }, [loadEvents]);

  async function createEvent() {
    if (!form.title.trim()) {
      setToast("Event title is required.");
      return;
    }
    setBusy(true);
    setToast("");
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          endDate: form.endDate || undefined,
          description: form.description || undefined,
          location: form.location || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setEvents((prev) => [...prev, payload.event].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
        setShowForm(false);
        setForm({
          title: "",
          description: "",
          eventType: "general",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          location: "",
          isAllDay: true,
        });
      } else {
        setToast(payload?.error ?? "Failed to create event.");
      }
    } catch {
      setToast("Failed to create event.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent(id: number) {
    if (!confirm("Delete this event?")) return;
    try {
      const response = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      if (response.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } else {
        setToast("Failed to delete event.");
      }
    } catch {
      setToast("Failed to delete event.");
    }
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">School Calendar Events</h3>
          <p className="text-xs text-slate-500">Create and manage events visible on the parent portal calendar.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Calendar className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">No events created yet. Click "Add Event" to create one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <article
              key={event.id}
              className={`group relative overflow-hidden rounded-2xl border p-4 ${eventTypeColor(event.eventType)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      {event.eventType}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                  {event.description && (
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{event.description}</p>
                  )}
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {formatDate(event.startDate)}
                      {event.endDate && ` → ${formatDate(event.endDate)}`}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteEvent(event.id)}
                  className="rounded-md p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-rose-100 hover:text-rose-600 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Create Calendar Event</h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Title *</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="e.g. Mid-Term Break"
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</label>
                <textarea
                  className="h-20 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Optional event description..."
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Event Type</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={form.eventType}
                    onChange={(e) => setForm((s) => ({ ...s, eventType: e.target.value }))}
                  >
                    <option value="general">General</option>
                    <option value="holiday">Holiday</option>
                    <option value="exam">Examination</option>
                    <option value="meeting">Meeting</option>
                    <option value="sport">Sports</option>
                    <option value="ceremony">Ceremony</option>
                    <option value="resumption">Resumption</option>
                    <option value="closure">Closure</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Location</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="e.g. School Hall"
                    value={form.location}
                    onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Start Date *</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={form.startDate}
                    onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">End Date (optional)</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={form.endDate}
                    onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isAllDay}
                  onChange={(e) => setForm((s) => ({ ...s, isAllDay: e.target.checked }))}
                  className="rounded"
                />
                All-day event
              </label>

              <button
                type="button"
                onClick={createEvent}
                disabled={busy}
                className="w-full rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Creating..." : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
