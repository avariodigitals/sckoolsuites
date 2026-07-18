"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  User,
  Phone,
  BookOpen,
  Building2,
  GraduationCap,
  CalendarCheck,
  FileBarChart,
  X,
  Loader2,
} from "lucide-react";
import { InfoRow, Section, Empty, TableWrap, StatusBadge } from "./student-detail-tabs";
import { formatDate } from "@/lib/utils";

type TabKey = "basic" | "contact" | "login" | "classes" | "subjects" | "students" | "attendance" | "scores" | "lesson-notes" | "assignments";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "basic", label: "Basic", icon: <User className="h-4 w-4" /> },
  { key: "contact", label: "Contact", icon: <Phone className="h-4 w-4" /> },
  { key: "login", label: "User Login", icon: <User className="h-4 w-4" /> },
  { key: "classes", label: "Classes", icon: <Building2 className="h-4 w-4" /> },
  { key: "subjects", label: "Subjects", icon: <BookOpen className="h-4 w-4" /> },
  { key: "students", label: "Students", icon: <GraduationCap className="h-4 w-4" /> },
  { key: "attendance", label: "Attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { key: "scores", label: "Scores", icon: <FileBarChart className="h-4 w-4" /> },
  { key: "lesson-notes", label: "Lesson Notes", icon: <BookOpen className="h-4 w-4" /> },
  { key: "assignments", label: "Assignments", icon: <BookOpen className="h-4 w-4" /> },
];

export function TeacherDetailModal({ teacherId, onClose }: { teacherId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/teachers/${teacherId}/detail`, { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (!res.ok) {
            setError(payload?.error ?? "Failed to load teacher details.");
          } else {
            setData(payload);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load teacher details.");
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [teacherId]);

  const t = data?.teacher;

  function renderContent() {
    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading teacher details...
        </div>
      );
    }
    if (error) {
      return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
    }
    if (!t) return null;

    switch (activeTab) {
      case "basic":
        return (
          <Section title="Basic Information">
            <InfoRow label="Full Name" value={t.user?.name} />
            <InfoRow label="Email" value={t.user?.email} />
            <InfoRow label="Status" value={t.user?.isActive ? "Active" : "Inactive"} />
            <InfoRow label="Created At" value={formatDate(t.createdAt)} />
            <InfoRow label="Classes Assigned" value={t.classes?.length ?? 0} />
            <InfoRow label="Subjects Assigned" value={t.subjects?.length ?? 0} />
            <InfoRow label="Students" value={t.students?.length ?? 0} />
          </Section>
        );
      case "contact":
        return (
          <Section title="Contact Information">
            <InfoRow label="Phone" value={t.user?.phone || "—"} />
            <InfoRow label="Address" value={t.user?.address || "—"} />
            <InfoRow label="Account Email" value={t.user?.email} />
          </Section>
        );
      case "login":
        return (
          <Section title="User Login">
            <InfoRow label="User ID" value={t.user?.id} />
            <InfoRow label="Email" value={t.user?.email} />
            <InfoRow label="Account Status" value={t.user?.isActive ? "Active" : "Inactive"} />
            <InfoRow label="Role" value="Teacher" />
          </Section>
        );
      case "classes":
        return (
          <Section title="Assigned Classes & Arms">
            {t.classes?.length || t.classArms?.length ? (
              <div className="space-y-4">
                {t.classes?.length ? (
                  <TableWrap>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                          <th className="px-3 py-2">Class</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.classes.map((cls: any) => (
                          <tr key={cls.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-900">{cls.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                ) : null}
                {t.classArms?.length ? (
                  <TableWrap>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                          <th className="px-3 py-2">Class Arm</th>
                          <th className="px-3 py-2">Class</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.classArms.map((arm: any) => (
                          <tr key={arm.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-900">{arm.name}</td>
                            <td className="px-3 py-2">{arm.class?.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                ) : null}
              </div>
            ) : (
              <Empty text="No classes or arms assigned." />
            )}
          </Section>
        );
      case "subjects":
        return (
          <Section title="Assigned Subjects">
            {t.subjects?.length ? (
              <TableWrap>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.subjects.map((subject: any) => (
                      <tr key={subject.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-900">{subject.name}</td>
                        <td className="px-3 py-2">{subject.class?.name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <Empty text="No subjects assigned." />
            )}
          </Section>
        );
      case "students":
        return (
          <Section title="Students Under Teacher">
            {t.students?.length ? (
              <TableWrap>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Gender</th>
                      <th className="px-3 py-2">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.students.map((student: any) => (
                      <tr key={student.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-900">{student.user?.name}</td>
                        <td className="px-3 py-2">{student.class?.name ?? "—"}</td>
                        <td className="px-3 py-2">{student.gender ?? "—"}</td>
                        <td className="px-3 py-2">{student.age ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <Empty text="No students assigned directly to this teacher." />
            )}
          </Section>
        );
      case "attendance":
        return (
          <Section title="Attendance Records">
            {t.attendances?.length ? (
              <TableWrap>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.attendances.map((attendance: any) => (
                      <tr key={attendance.id} className="border-b border-slate-100">
                        <td className="px-3 py-2">{formatDate(attendance.date)}</td>
                        <td className="px-3 py-2">{attendance.student?.user?.name}</td>
                        <td className="px-3 py-2">{attendance.class?.name ?? "—"}</td>
                        <td className="px-3 py-2">
                          <StatusBadge text={attendance.status} color={attendance.status === "PRESENT" ? "emerald" : attendance.status === "LATE" ? "amber" : "rose"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <Empty text="No attendance records found." />
            )}
          </Section>
        );
      case "scores":
        return (
          <Section title="Score Records">
            {t.scores?.length ? (
              <TableWrap>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2 text-right">CA</th>
                      <th className="px-3 py-2 text-right">Exam</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.scores.map((score: any) => (
                      <tr key={score.id} className="border-b border-slate-100">
                        <td className="px-3 py-2">{score.student?.user?.name}</td>
                        <td className="px-3 py-2">{score.subject?.name}</td>
                        <td className="px-3 py-2 text-right">{score.caScore}</td>
                        <td className="px-3 py-2 text-right">{score.examScore}</td>
                        <td className="px-3 py-2 text-right font-semibold">{score.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <Empty text="No scores recorded." />
            )}
          </Section>
        );
      case "lesson-notes":
        return (
          <Section title="Lesson Notes">
            {t.lessons?.length ? (
              <div className="space-y-3">
                {t.lessons.map((lesson: any) => (
                  <div key={lesson.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{lesson.title}</p>
                    <p className="text-xs text-slate-400">{formatDate(lesson.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No lesson notes published." />
            )}
          </Section>
        );
      case "assignments":
        return (
          <Section title="Assignments">
            {t.assignments?.length ? (
              <div className="space-y-3">
                {t.assignments.map((assignment: any) => (
                  <div key={assignment.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{assignment.title}</p>
                    <p className="text-xs text-slate-500">Subject: {assignment.subject?.name ?? "—"} · Due: {formatDate(assignment.dueDate)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No assignments created." />
            )}
          </Section>
        );
      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 sm:pt-8">
      <div className="flex h-[calc(100vh-1rem)] sm:h-[calc(100vh-4rem)] w-full max-w-6xl flex-col sm:flex-row overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Left Sidebar Tabs — Desktop */}
        <div className="hidden w-52 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50 sm:flex">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sections</span>
            <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
                  activeTab === t.key
                    ? "bg-indigo-50 font-medium text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile tab bar — horizontal scroll */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-2 sm:hidden">
          <button onClick={onClose} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                activeTab === t.key
                  ? "bg-indigo-50 font-medium text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.icon}
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Right Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="relative shrink-0">
                {t?.user?.avatarUrl ? (
                  <Image src={t.user.avatarUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {t?.user?.name?.charAt(0)?.toUpperCase() ?? "T"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm sm:text-base font-semibold text-slate-900">{t?.user?.name ?? "Teacher Details"}</h2>
                <p className="truncate text-xs text-slate-500">
                  {t?.classes?.length ?? 0} classes · {t?.subjects?.length ?? 0} subjects · {t?.students?.length ?? 0} students
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className={`hidden sm:inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${t?.user?.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {t?.user?.isActive ? "Active" : "Inactive"}
              </span>
              <button
                onClick={onClose}
                className="hidden sm:block rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
