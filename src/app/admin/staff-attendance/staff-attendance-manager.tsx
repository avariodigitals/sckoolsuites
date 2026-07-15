"use client";

import { useEffect, useState, useMemo } from "react";
import { CalendarCheck, MapPin, Clock, Search, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";

type StaffRecord = {
  id: number;
  type: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  facePhotoUrl: string | null;
  note: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
  teacher: { id: number; designation: string | null } | null;
};

export function StaffAttendanceManager() {
  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterType !== "ALL") params.set("type", filterType);
      if (filterDate) params.set("date", filterDate);
      params.set("take", "200");

      const res = await fetch(`/api/admin/staff-attendance?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Failed to load staff attendance.");
        return;
      }
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load staff attendance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void loadData(), 0);
    return () => clearTimeout(timer);
  }, [filterType, filterDate]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.user.name.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        r.user.role.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  const clockInCount = records.filter((r) => r.type === "CLOCK_IN").length;
  const clockOutCount = records.filter((r) => r.type === "CLOCK_OUT").length;
  const uniqueStaff = new Set(records.map((r) => r.user.id)).size;

  function formatTime(ts: string) {
    return new Date(ts).toLocaleString();
  }

  function roleLabel(role: string) {
    return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading staff attendance...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Clock-Ins</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{clockInCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Clock-Outs</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{clockOutCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarCheck className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Unique Staff</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{uniqueStaff}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="ALL">All Types</option>
          <option value="CLOCK_IN">Clock In Only</option>
          <option value="CLOCK_OUT">Clock Out Only</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setFilterType("ALL");
            setFilterDate("");
            setSearchQuery("");
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Clear
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Timestamp</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Face Photo</th>
              <th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No staff attendance records found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {r.user.avatarUrl ? (
                        <img src={r.user.avatarUrl} alt={r.user.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                          {r.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{r.user.name}</p>
                        <p className="text-xs text-slate-500">{r.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{roleLabel(r.user.role)}</span>
                    {r.teacher?.designation && (
                      <span className="ml-1 rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                        {r.teacher.designation.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.type === "CLOCK_IN"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {r.type === "CLOCK_IN" ? "Clock In" : "Clock Out"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{formatTime(r.timestamp)}</td>
                  <td className="px-3 py-2">
                    {r.latitude && r.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <MapPin className="h-3 w-3" />
                        {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.facePhotoUrl ? (
                      <a href={r.facePhotoUrl} target="_blank" rel="noopener noreferrer" title="View face photo">
                        <img
                          src={r.facePhotoUrl}
                          alt="Face capture"
                          className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                        />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Camera className="h-3 w-3" />
                        No photo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{r.note ?? <span className="text-slate-400">—</span>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
