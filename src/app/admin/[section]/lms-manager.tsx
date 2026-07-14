"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";

type ContentType = "lessons" | "assignments" | "quizzes" | "online-classes";

type Lesson = {
  id: string;
  type: "lesson";
  subjectId: string;
  subjectName: string | null;
  classId: string | null;
  className: string | null;
  teacherId: string;
  teacherName: string | null;
  title: string;
  note: string;
  createdAt: string;
};

type Assignment = {
  id: string;
  type: "assignment";
  subjectId: string | null;
  subjectName: string | null;
  classId: string | null;
  className: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  teacherId: string;
  teacherName: string | null;
  title: string;
  instruction: string;
  dueDate: string | null;
  createdAt: string;
};

type Quiz = {
  id: string;
  type: "quiz";
  subjectId: string | null;
  subjectName: string | null;
  classId: string | null;
  className: string | null;
  teacherId: string;
  teacherName: string | null;
  title: string;
  instruction: string | null;
  totalMarks: number;
  dueDate: string | null;
  createdAt: string;
};

type OnlineClass = {
  id: string;
  type: "online-class";
  subjectId: string | null;
  subjectName: string | null;
  classId: string | null;
  className: string | null;
  teacherId: string;
  teacherName: string | null;
  title: string;
  platform: string | null;
  meetingLink: string | null;
  startTime: string;
  endTime: string | null;
  createdAt: string;
};

type LMSContent = Lesson | Assignment | Quiz | OnlineClass;

type SubjectOption = { id: string; name: string; classId: string | null; className: string | null; teacherId: string | null; teacherName: string | null };
type ClassOption = { id: string; name: string };
type TeacherOption = { id: string; name: string };
type LessonOption = { id: string; title: string };

const emptyForms: Record<ContentType, Record<string, string>> = {
  lessons: { subjectId: "", teacherId: "", classId: "", title: "", note: "" },
  assignments: { subjectId: "", teacherId: "", classId: "", lessonId: "", title: "", instruction: "", dueDate: "" },
  quizzes: { subjectId: "", teacherId: "", classId: "", title: "", instruction: "", totalMarks: "100", dueDate: "" },
  "online-classes": { subjectId: "", teacherId: "", classId: "", title: "", platform: "", meetingLink: "", startTime: "", endTime: "" },
};

export function LMSManager() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<ContentType>("lessons");
  const [content, setContent] = useState<LMSContent[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(emptyForms.lessons);
  const [submitting, setSubmitting] = useState(false);

  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) return content;
    const query = searchQuery.toLowerCase();
    return content.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      item.subjectName?.toLowerCase().includes(query) ||
      item.className?.toLowerCase().includes(query) ||
      item.teacherName?.toLowerCase().includes(query)
    );
  }, [content, searchQuery]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/lms?type=${activeTab}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Unable to load content.");
        return;
      }

      // Combine all content types
      const allContent: LMSContent[] = [
        ...(payload.lessons?.map((l: Lesson) => ({ ...l, type: "lesson" as const })) || []),
        ...(payload.assignments?.map((a: Assignment) => ({ ...a, type: "assignment" as const })) || []),
        ...(payload.quizzes?.map((q: Quiz) => ({ ...q, type: "quiz" as const })) || []),
        ...(payload.onlineClasses?.map((o: OnlineClass) => ({ ...o, type: "online-class" as const })) || []),
      ];

      setContent(allContent);
      setSubjects(payload.subjects ?? []);
      setClasses(payload.classes ?? []);
      setTeachers(payload.teachers ?? []);
      setLessons(payload.lessons?.map((l: Lesson) => ({ id: l.id, title: l.title })) ?? []);
    } catch {
      setStatus("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Reset form when tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setForm(emptyForms[activeTab]);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  async function handleSubmit() {
    setStatus("");
    setSubmitting(true);

    const typeMap: Record<ContentType, string> = {
      lessons: "lesson",
      assignments: "assignment",
      quizzes: "quiz",
      "online-classes": "online-class",
    };

    const body: Record<string, unknown> = { type: typeMap[activeTab], ...form };

    // Convert numeric fields
    if (activeTab === "quizzes" && body.totalMarks) {
      body.totalMarks = parseInt(body.totalMarks as string, 10);
    }

    try {
      const response = await fetch("/api/admin/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to create content.");
        return;
      }

      setForm(emptyForms[activeTab]);
      setShowForm(false);
      setStatus("Content created successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!(await confirm({
      title: "Delete Content",
      message: `Delete "${title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    }))) {
      return;
    }

    const typeMap: Record<ContentType, string> = {
      lessons: "lesson",
      assignments: "assignment",
      quizzes: "quiz",
      "online-classes": "online-class",
    };

    setStatus("");
    try {
      const response = await fetch(`/api/admin/lms/${id}?type=${typeMap[activeTab]}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to delete content.");
        return;
      }

      setStatus("Content deleted.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  const tabLabels: Record<ContentType, string> = {
    lessons: "Lessons",
    assignments: "Assignments",
    quizzes: "Quizzes",
    "online-classes": "Live Classes",
  };

  const renderForm = () => {
    const commonFields = (
      <>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={form.teacherId}
          onChange={(e) => setForm((prev) => ({ ...prev, teacherId: e.target.value }))}
        >
          <option value="">Select Teacher *</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={form.subjectId}
          onChange={(e) => setForm((prev) => ({ ...prev, subjectId: e.target.value }))}
        >
          <option value="">Select Subject {activeTab !== "lessons" ? "(optional)" : "*"}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name} {s.className ? `(${s.className})` : ""}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={form.classId}
          onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value }))}
        >
          <option value="">Select Class (optional)</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Input
          placeholder="Title *"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />
      </>
    );

    switch (activeTab) {
      case "lessons":
        return (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {commonFields}
            <textarea
              className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Lesson Notes / Content"
              rows={4}
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </div>
        );

      case "assignments":
        return (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {commonFields}
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.lessonId}
              onChange={(e) => setForm((prev) => ({ ...prev, lessonId: e.target.value }))}
            >
              <option value="">Link to Lesson (optional)</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
            <Input
              type="datetime-local"
              placeholder="Due Date *"
              value={form.dueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
            />
            <textarea
              className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Instructions *"
              rows={4}
              value={form.instruction}
              onChange={(e) => setForm((prev) => ({ ...prev, instruction: e.target.value }))}
            />
          </div>
        );

      case "quizzes":
        return (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {commonFields}
            <Input
              type="number"
              placeholder="Total Marks"
              value={form.totalMarks}
              onChange={(e) => setForm((prev) => ({ ...prev, totalMarks: e.target.value }))}
            />
            <Input
              type="datetime-local"
              placeholder="Due Date (optional)"
              value={form.dueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
            />
            <textarea
              className="col-span-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Instructions (optional)"
              rows={4}
              value={form.instruction}
              onChange={(e) => setForm((prev) => ({ ...prev, instruction: e.target.value }))}
            />
          </div>
        );

      case "online-classes":
        return (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {commonFields}
            <Input
              placeholder="Platform (e.g., Zoom, Google Meet, Jitsi)"
              value={form.platform}
              onChange={(e) => setForm((prev) => ({ ...prev, platform: e.target.value }))}
            />
            <Input
              type="datetime-local"
              placeholder="Start Time *"
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
            />
            <Input
              type="datetime-local"
              placeholder="End Time (optional)"
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
            />
            <Input
              className="col-span-full"
              placeholder="Meeting Link (optional)"
              value={form.meetingLink}
              onChange={(e) => setForm((prev) => ({ ...prev, meetingLink: e.target.value }))}
            />
          </div>
        );
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading LMS...</div>;
  }

  return (
    <div className="space-y-4">
      {status && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${status.includes("success") || status.includes("created") || status.includes("deleted") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(Object.keys(tabLabels) as ContentType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setShowForm(false);
              setSearchQuery("");
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Search and Add */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by title, subject, class, or teacher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : `+ Add ${tabLabels[activeTab].slice(0, -1)}`}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Create New {tabLabels[activeTab].slice(0, -1)}
          </h3>
          {renderForm()}
          <div className="mt-3 flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Content List */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          {tabLabels[activeTab]} ({filteredContent.length})
        </h3>
        <div className="space-y-3">
          {filteredContent.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No content found. Create your first {activeTab.slice(0, -1)}!</p>
          ) : (
            filteredContent.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-500">
                      {item.subjectName ? `Subject: ${item.subjectName}` : "No subject"}
                      {item.className ? ` • Class: ${item.className}` : ""}
                      {item.teacherName ? ` • Teacher: ${item.teacherName}` : ""}
                    </p>
                    {"note" in item && item.note && (
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">{item.note}</p>
                    )}
                    {"instruction" in item && item.instruction && (
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">{item.instruction}</p>
                    )}
                    {"dueDate" in item && item.dueDate && (
                      <p className="mt-1 text-xs text-amber-600">
                        Due: {new Date(item.dueDate).toLocaleString()}
                      </p>
                    )}
                    {"startTime" in item && (
                      <p className="mt-1 text-xs text-blue-600">
                        {new Date(item.startTime).toLocaleString()}
                        {item.endTime ? ` - ${new Date(item.endTime).toLocaleTimeString()}` : ""}
                      </p>
                    )}
                    {"meetingLink" in item && item.meetingLink && (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                      >
                        Join Meeting →
                      </a>
                    )}
                    {"totalMarks" in item && (
                      <p className="mt-1 text-xs text-slate-500">Total Marks: {item.totalMarks}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item.id, item.title)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
