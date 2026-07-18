"use client";

import { useState, useMemo } from "react";
import { Trophy } from "lucide-react";
import { formatDate, humanizeEnum } from "@/lib/utils";

type AttendanceRow = {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
};

type ChildInfo = {
  id: string;
  name: string;
  className: string;
};

type ChildStats = {
  id: string;
  name: string;
  className: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
};

export function ParentAttendanceDashboard({
  attendance,
  childOptions,
}: {
  attendance: AttendanceRow[];
  childOptions: ChildInfo[];
}) {
  const [selectedChildId, setSelectedChildId] = useState<string>("all");

  const childStats: ChildStats[] = useMemo(() => {
    return childOptions.map((child) => {
      const rows = attendance.filter((r) => r.studentId === child.id);
      const present = rows.filter((r) => r.status === "PRESENT").length;
      const absent = rows.filter((r) => r.status === "ABSENT").length;
      const late = rows.filter((r) => r.status === "LATE").length;
      const excused = rows.filter((r) => r.status === "EXCUSED").length;
      const total = rows.length;
      const rate = total ? (present / total) * 100 : 0;
      return { id: child.id, name: child.name, className: child.className, present, absent, late, excused, total, rate };
    });
  }, [attendance, childOptions]);

  const bestPerformer = useMemo(() => {
    if (!childStats.length) return null;
    return [...childStats].sort((a, b) => b.rate - a.rate)[0];
  }, [childStats]);

  const filteredAttendance = useMemo(() => {
    if (selectedChildId === "all") return attendance;
    return attendance.filter((r) => r.studentId === selectedChildId);
  }, [attendance, selectedChildId]);

  const filteredStats = useMemo(() => {
    if (selectedChildId === "all") {
      const present = filteredAttendance.filter((r) => r.status === "PRESENT").length;
      const absent = filteredAttendance.filter((r) => r.status === "ABSENT").length;
      const late = filteredAttendance.filter((r) => r.status === "LATE").length;
      const excused = filteredAttendance.filter((r) => r.status === "EXCUSED").length;
      const total = filteredAttendance.length;
      const rate = total ? (present / total) * 100 : 0;
      return { present, absent, late, excused, total, rate };
    }
    const stat = childStats.find((s) => s.id === selectedChildId);
    return stat
      ? { present: stat.present, absent: stat.absent, late: stat.late, excused: stat.excused, total: stat.total, rate: stat.rate }
      : { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 };
  }, [filteredAttendance, selectedChildId, childStats]);

  const punctualityLateRate = filteredStats.total ? (filteredStats.late / filteredStats.total) * 100 : 0;
  const punctualityRating = punctualityLateRate <= 5 ? "Excellent" : punctualityLateRate <= 12 ? "Good" : "Needs attention";

  function dateKey(value: Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  const trendDays = useMemo(() => {
    const statusByDay = new Map<string, "PRESENT" | "LATE" | "ABSENT" | "EXCUSED">();
    for (const row of filteredAttendance) {
      const key = dateKey(new Date(row.date));
      const current = statusByDay.get(key);
      if (!current) {
        statusByDay.set(key, row.status);
        continue;
      }
      if (row.status === "ABSENT" || (row.status === "LATE" && current === "PRESENT")) {
        statusByDay.set(key, row.status);
      }
    }
    return Array.from({ length: 14 }, (_, index) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - index));
      const key = dateKey(d);
      return { key, label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), status: statusByDay.get(key) ?? "NONE" };
    });
  }, [filteredAttendance]);

  return (
    <section className="space-y-6">
      {/* Summary: Best performer card */}
      {bestPerformer && childStats.length > 1 && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Best Attendance</p>
              <p className="text-sm font-bold text-slate-900">
                {bestPerformer.name} <span className="font-normal text-slate-500">— {bestPerformer.rate.toFixed(1)}%</span>
              </p>
              <p className="text-xs text-slate-600">
                {bestPerformer.present} present / {bestPerformer.total} total days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Per-child summary cards (when multiple children) */}
      {childStats.length > 1 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-4">
          {childStats.map((stat) => {
            const isSelected = selectedChildId === stat.id;
            const isBest = bestPerformer?.id === stat.id;
            return (
              <button
                key={stat.id}
                onClick={() => setSelectedChildId(isSelected ? "all" : stat.id)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
                    : isBest
                      ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{stat.name}</p>
                  {isBest && <Trophy className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-xs text-slate-500">{stat.className}</p>
                <div className="mt-2 flex items-end justify-between">
                  <p className={`text-xl sm:text-2xl font-extrabold ${stat.rate >= 80 ? "text-emerald-600" : stat.rate >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                    {stat.rate.toFixed(1)}%
                  </p>
                  <div className="flex gap-2 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />{stat.present}</span>
                    <span className="inline-flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-amber-500" />{stat.late}</span>
                    <span className="inline-flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-rose-500" />{stat.absent}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Child selector */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedChildId("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selectedChildId === "all"
              ? "bg-[var(--brand-primary)] text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All Children
        </button>
        {childOptions.map((child: ChildInfo) => (
          <button
            key={child.id}
            onClick={() => setSelectedChildId(child.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedChildId === child.id
                ? "bg-[var(--brand-primary)] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {child.name}
          </button>
        ))}
      </div>

      {/* Hero banner */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] via-[#1a3a6e] to-[var(--brand-secondary)] p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Attendance Dashboard</p>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold truncate">
              {selectedChildId === "all"
                ? "All Children"
                : childOptions.find((c) => c.id === selectedChildId)?.name ?? "Child"}
            </h2>
            <p className="text-sm text-white/85">Real-time attendance visibility for your linked children.</p>
          </div>
          <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-center backdrop-blur-sm shrink-0">
            <p className="text-2xl sm:text-3xl font-extrabold">{filteredStats.rate.toFixed(1)}%</p>
            <p className="text-xs text-white/80">attendance rate</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Present Days</p>
          <p className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">{filteredStats.present}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Absent Days</p>
          <p className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">{filteredStats.absent}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Late Days</p>
          <p className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">{filteredStats.late}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Punctuality</p>
          <p className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900">{punctualityRating}</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Records</p>
          <p className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">{filteredStats.total}</p>
        </div>
      </div>

      {/* 14-day trend */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">Last 14 Days Activity</p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Late</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Absent</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-3 sm:grid-cols-14">
          {trendDays.map((day) => (
            <div key={day.key} className="rounded-lg border border-slate-200 p-2 text-center">
              <div
                className={`mx-auto mb-1 h-3.5 w-3.5 rounded-full ${
                  day.status === "PRESENT"
                    ? "bg-emerald-500"
                    : day.status === "LATE"
                      ? "bg-amber-500"
                      : day.status === "ABSENT"
                        ? "bg-rose-500"
                        : "bg-slate-300"
                }`}
              />
              <p className="text-[10px] font-medium text-slate-600">{day.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance records table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Attendance Records</h3>
        </div>
        {filteredAttendance.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-600">
                  {selectedChildId === "all" && <th className="px-4 py-2">Student</th>}
                  <th className="px-4 py-2">Class</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.slice(0, 25).map((item, idx) => (
                  <tr key={item.id} className={idx % 2 ? "bg-white" : "bg-slate-50/70"}>
                    {selectedChildId === "all" && <td className="px-4 py-2 font-medium text-slate-900">{item.studentName}</td>}
                    <td className="px-4 py-2 text-slate-600">{item.className}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(item.date)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          item.status === "PRESENT"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "LATE"
                              ? "bg-amber-100 text-amber-700"
                              : item.status === "EXCUSED"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {humanizeEnum(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-slate-500">No attendance records found for this term.</div>
        )}
      </div>
    </section>
  );
}
