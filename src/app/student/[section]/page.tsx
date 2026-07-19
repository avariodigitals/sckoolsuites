import Link from "next/link";
import { notFound } from "next/navigation";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentAssignmentList } from "@/components/student-assignment-list";
import { requireRole } from "@/lib/auth-guards";
import { getCoreSchoolDataByContext, getCurrentSchoolByUser, getUserAcademicContext } from "@/lib/data";
import { calculateGradeFromBands } from "@/lib/grades";
import { prisma } from "@/lib/db";
import { getActiveSchoolConfig } from "@/lib/school-config";
import { TimetableView } from "@/components/timetable-view";
import { formatDate, humanizeEnum } from "@/lib/utils";
import { AnnouncementListWithModal } from "@/components/announcement-list-with-modal";

const allowed = ["profile", "subjects", "timetable", "assignments", "attendance", "lms", "results", "report-card", "announcements"] as const;

const titles: Record<(typeof allowed)[number], string> = {
  profile: "My Profile",
  subjects: "My Subjects",
  timetable: "Class Timetable",
  assignments: "Assignments",
  attendance: "Attendance",
  lms: "Lesson Notes & Assignments",
  results: "Result Summary",
  "report-card": "Report Card",
  announcements: "Announcements",
};

const descriptions: Record<(typeof allowed)[number], string> = {
  profile: "Your personal and class profile overview.",
  subjects: "Subjects you are currently taking this term.",
  timetable: "Your class and subject learning schedule.",
  assignments: "Track pending and submitted assignments.",
  attendance: "View your attendance record by date and status.",
  lms: "Access lessons, notes, and assignment learning content.",
  results: "Check latest scores and subject performance.",
  "report-card": "Open and print your report card.",
  announcements: "Read official school announcements.",
};

export default async function StudentSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(allowed as readonly string[]).includes(section)) notFound();

  const user = await requireRole(["STUDENT"]);
  const profile = await getCurrentSchoolByUser(user.id);
  if (!profile?.schoolId || !profile.school) {
    return (
      <SetupRequiredScreen
        title="Account Setup Incomplete"
        message="Your student account is not linked to a school yet. Please contact the school admin to complete your profile linkage."
      />
    );
  }

  const context = await getUserAcademicContext(profile.schoolId, user.id);
  const schoolId = profile.schoolId;
  const core = await getCoreSchoolDataByContext(profile.schoolId, {
    sessionId: context.session?.id,
    termId: context.term?.id,
  });

  const studentProfile = core.students.find((student: any) => student.userId === user.id);
  const sectionKey = section as (typeof allowed)[number];

  if (!studentProfile) {
    return (
      <ModernPortalShell
        role={user.role}
        schoolName={core.school?.name}
        schoolLogoUrl={core.school?.branding?.logoUrl ?? undefined}
        userName={user.name ?? "Student"}
        pathname={`/student/${section}`}
        primaryColor={core.school?.branding?.primaryColor}
        secondaryColor={core.school?.branding?.secondaryColor}
      >
        <Card>
          <CardHeader>
            <CardTitle>Student Record Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">No student profile is linked to your account yet.</CardContent>
        </Card>
      </ModernPortalShell>
    );
  }

  const student = studentProfile;

  const mySubjects = core.subjects.filter((subject: any) => subject.classId === student.classId);
  const myAssignments = core.assignments.filter((assignment: any) => assignment.studentId === student.id || (assignment.studentId == null && assignment.classId === student.classId));
  const myAttendance = core.attendance.filter((attendance: any) => attendance.studentId === student.id);
  const myScores = core.scores.filter((score: any) => score.studentId === student.id);
  const approvedResult = await (async () => {
    const whereBase = {
      schoolId,
      studentId: student.id,
      ...(context.session?.id ? { sessionId: context.session.id } : {}),
      ...(context.term?.id ? { termId: context.term.id } : {}),
    };

    try {
      return await prisma.result.findFirst({
        where: {
          ...whereBase,
          status: { in: ["PUBLISHED"] },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("Unknown argument `status`")) {
        throw error;
      }

      return null;
    }
  })() as { fileUrl: string | null; fileName: string | null } | null;

  const activeConfig = core.school ? await getActiveSchoolConfig(core.school.id) : null;
  const timetableTemplates = (activeConfig?.config?.operations?.timetableTemplates ?? []) as any[];
  const gradingBands = (activeConfig?.config.academic.gradingSystem ?? []).map((band) => ({
    min: Number(band.min),
    grade: band.grade,
    gpa: Number(band.gpa),
  }));

  const pendingAssignments = myAssignments.filter((assignment: any) => !assignment.submittedAt).length;
  const presentCount = myAttendance.filter((item: any) => item.status === "PRESENT").length;
  const avgScore = myScores.length ? myScores.reduce((sum: any, score: any) => sum + score.total, 0) / myScores.length : 0;
  const topScore = myScores.length ? [...myScores].sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0] : null;
  const topScoreMeta = topScore ? calculateGradeFromBands(topScore.total ?? 0, gradingBands) : null;

  function renderSection() {
    switch (sectionKey) {
      case "profile":
        return (
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Name: {[student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") || student.user.name}</p>
              <p>Email: {student.user.email}</p>
              <p>Class: {student.class?.name ?? "Not assigned"}</p>
              <p>Current Session: {context.session?.name ?? "-"}</p>
              <p>Current Term: {context.term?.name ?? "-"}</p>
            </CardContent>
          </Card>
        );

      case "subjects":
        return (
          <Card>
            <CardHeader>
              <CardTitle>My Subjects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {mySubjects.length ? mySubjects.map((subject: any) => (
                <div key={subject.id} className="glass-soft rounded-xl p-3">
                  <p className="font-medium">{subject.name}</p>
                  <p>Teacher: {subject.teacher?.user.name ?? "Not assigned"}</p>
                </div>
              )) : <p className="text-slate-500">No subjects found for your class.</p>}
            </CardContent>
          </Card>
        );

      case "timetable":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Class Timetable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <TimetableView templates={timetableTemplates} />
              {mySubjects.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-slate-600">Your subjects:</p>
                  {mySubjects.map((subject: any) => (
                    <div key={subject.id} className="glass-soft rounded-xl p-2">
                      <p className="font-medium text-xs">{subject.name}</p>
                      <p className="text-xs text-slate-500">Teacher: {subject.teacher?.user.name ?? "Not assigned"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "assignments":
        return (
          <StudentAssignmentList
            assignments={myAssignments.map((a: any) => ({
              id: a.id,
              title: a.title,
              instruction: a.instruction,
              dueDate: a.dueDate,
              submittedAt: a.submittedAt,
              submissionNote: a.submissionNote,
              subject: a.subject ? { name: a.subject.name } : null,
            }))}
          />
        );

      case "attendance":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Present days: {presentCount} / {myAttendance.length}</p>
              {myAttendance.slice(0, 20).map((item: any) => (
                <div key={item.id} className="glass-soft rounded-xl p-3">
                  <p className="font-medium">{humanizeEnum(item.status)}</p>
                  <p>{formatDate(item.date)} • Class: {item.class?.name ?? "-"}</p>
                </div>
              ))}
              {!myAttendance.length ? <p className="text-slate-500">No attendance records available.</p> : null}
            </CardContent>
          </Card>
        );

      case "lms":
        return (
          <Card>
            <CardHeader>
              <CardTitle>LMS Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {core.lessons.filter((lesson: any) => lesson.classId === student.classId).slice(0, 20).map((lesson: any) => (
                <div key={lesson.id} className="glass-soft rounded-xl p-3">
                  <p className="font-medium">{lesson.title}</p>
                  <p>{lesson.subject?.name ?? "Subject"} • Uploaded: {formatDate(lesson.createdAt)}</p>
                </div>
              ))}
              {!core.lessons.filter((lesson: any) => lesson.classId === student.classId).length ? <p className="text-slate-500">No lesson notes available.</p> : null}
            </CardContent>
          </Card>
        );

      case "results":
        return (
          <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <CardHeader className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white">
              <CardTitle className="text-lg text-white">Result Summary</CardTitle>
              <p className="text-xs text-white/80">{context.term?.name ?? "-"} / {context.session?.name ?? "-"}</p>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Average Score</p>
                  <p className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900">{avgScore.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Subjects</p>
                  <p className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900">{myScores.length}</p>
                </div>
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Top Grade</p>
                  <p className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900">{topScoreMeta?.grade ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Top Score</p>
                  <p className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900">{myScores.length ? `${Math.max(...myScores.map((s: any) => s.total)).toFixed(1)}%` : "-"}</p>
                </div>
              </div>

              {approvedResult && approvedResult.fileUrl ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">Your result was uploaded as a PDF.</p>
                  <a
                    href={approvedResult.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block rounded-md bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Download Result PDF
                  </a>
                </div>
              ) : approvedResult && myScores.length ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Subject Performance</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-600">
                          <th className="px-3 py-2">Subject</th>
                          <th className="px-3 py-2 text-right">Score</th>
                          <th className="px-3 py-2 text-right">Grade</th>
                          <th className="px-3 py-2 text-right">GPA</th>
                          <th className="px-3 py-2">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myScores.slice(0, 20).map((score: any, idx: any) => (
                          <tr key={score.id} className={idx % 2 ? "bg-white" : "bg-slate-50/70"}>
                            <td className="px-3 py-2 font-medium text-slate-800">{score.subject.name}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">{score.total.toFixed(1)}%</td>
                            <td className="px-3 py-2 text-right"><span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">{calculateGradeFromBands(score.total, gradingBands).grade}</span></td>
                            <td className="px-3 py-2 text-right text-slate-700">{calculateGradeFromBands(score.total, gradingBands).gpa.toFixed(2)}</td>
                            <td className="px-3 py-2">
                              <div className="h-2 rounded-full bg-slate-200">
                                <div className="h-2 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]" style={{ width: `${Math.max(0, Math.min(100, score.total))}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : <p className="text-sm text-slate-500">No approved result has been published for this term yet.</p>}
            </CardContent>
          </Card>
        );

      case "report-card":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Report Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Session: {context.session?.name ?? "-"}</p>
              <p>Term: {context.term?.name ?? "-"}</p>
              {approvedResult ? (
                <Link href={`/reports/${student.id}`} className="inline-block text-[var(--brand-primary)] underline">
                  {approvedResult.fileUrl ? "Open My Report Card / PDF" : "Open My Report Card"}
                </Link>
              ) : (
                <p className="text-slate-500">Report card will be available once result is approved and published.</p>
              )}
            </CardContent>
          </Card>
        );

      case "announcements":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <AnnouncementListWithModal
                announcements={core.announcements.slice(0, 20).map((item: any) => ({
                  id: item.id,
                  title: item.title,
                  body: item.body,
                  isHtml: item.isHtml ?? false,
                  audience: item.audience,
                  attachmentUrl: item.attachmentUrl ?? null,
                  attachmentName: item.attachmentName ?? null,
                  createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
                }))}
                emptyMessage="No announcements available."
              />
            </CardContent>
          </Card>
        );
    }
  }

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={core.school?.name}
      schoolLogoUrl={core.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Student"}
      pathname={`/student/${section}`}
      primaryColor={core.school?.branding?.primaryColor}
      secondaryColor={core.school?.branding?.secondaryColor}
    >
      <Card>
        <CardHeader>
          <CardTitle>{titles[sectionKey]}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">{descriptions[sectionKey]}</CardContent>
      </Card>

      <section className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Class</p><p className="text-lg sm:text-xl font-semibold truncate">{studentProfile.class?.name ?? "N/A"}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Subjects</p><p className="text-lg sm:text-xl font-semibold">{mySubjects.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Pending Tasks</p><p className="text-lg sm:text-xl font-semibold">{pendingAssignments}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Average Score</p><p className="text-lg sm:text-xl font-semibold">{avgScore.toFixed(1)}%</p></CardContent></Card>
      </section>

      {renderSection()}
    </ModernPortalShell>
  );
}
