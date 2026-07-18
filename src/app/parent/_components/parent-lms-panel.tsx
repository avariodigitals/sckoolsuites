"use client";

import { BookOpen, ClipboardList, FileText, Video, HelpCircle, Sparkles, Rocket, Clock } from "lucide-react";

type ChildOption = {
  id: string;
  name: string;
  className: string;
  classId: string | null;
};

type AssignmentItem = {
  id: string;
  title: string;
  dueDate: string;
  submittedAt: string | null;
  studentId: string | null;
  classId: string | null;
  subjectName: string;
};

type LessonItem = {
  id: string;
  title: string;
  createdAt: string;
  classId: string | null;
  subjectName: string;
};

type SubjectItem = {
  id: string;
  name: string;
  classId: string | null;
};

type QuizItem = {
  id: string;
  title: string;
  dueDate: string | null;
  classId: string | null;
  subjectName: string;
};

type OnlineClassItem = {
  id: string;
  title: string;
  startTime: string;
  classId: string | null;
  subjectName: string;
};

export function ParentLmsPanel({
  childOptions: _childOptions,
  assignments: _assignments,
  lessons: _lessons,
  subjects: _subjects,
  quizzes: _quizzes,
  onlineClasses: _onlineClasses,
}: {
  childOptions: ChildOption[];
  assignments: AssignmentItem[];
  lessons: LessonItem[];
  subjects: SubjectItem[];
  quizzes: QuizItem[];
  onlineClasses: OnlineClassItem[];
}) {
  const features = [
    { icon: ClipboardList, title: "Assignment Tracker", desc: "Monitor pending and submitted assignments with due date alerts." },
    { icon: FileText, title: "Lesson Resources", desc: "Access published lesson notes, worksheets, and study materials." },
    { icon: HelpCircle, title: "Interactive Quizzes", desc: "Track quiz participation and performance in real time." },
    { icon: Video, title: "Live Online Classes", desc: "Join scheduled virtual classes and review session recordings." },
    { icon: BookOpen, title: "Reading Lists", desc: "Curated reading materials aligned with the curriculum." },
    { icon: Sparkles, title: "Progress Analytics", desc: "Visual insights into your child's learning journey and milestones." },
  ];

  return (
    <section className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--brand-primary)] via-[#1a3a6e] to-[var(--brand-secondary)] p-5 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col items-center gap-4 sm:gap-6 text-center">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
            <Rocket className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Learning Management System</p>
            <h2 className="mt-2 text-3xl font-bold">Coming Soon</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/80">
              We&apos;re building a powerful LMS experience for parents to monitor assignments, lessons,
              quizzes, and live classes — all in one place.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm ring-1 ring-white/20">
            <Clock className="h-3.5 w-3.5" />
            Launching soon
          </div>
        </div>
      </div>

      {/* Feature preview grid */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-secondary)]/5" />
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{feature.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <Sparkles className="h-3 w-3" />
                  In Development
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Notification card */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 sm:p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Clock className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">
          You&apos;ll be notified when the LMS portal goes live for your child&apos;s class.
        </p>
        <p className="text-xs text-slate-400">
          In the meantime, assignments and lesson notes are shared through the school announcements and your child&apos;s teacher.
        </p>
      </div>
    </section>
  );
}
