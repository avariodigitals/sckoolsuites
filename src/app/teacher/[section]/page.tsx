import { notFound } from "next/navigation";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherAttendanceForm } from "@/app/teacher/_components/teacher-attendance-form";
import { TeacherScoreEntryForm } from "@/app/teacher/_components/teacher-score-entry-form";
import { TeacherResultUploadForm } from "@/app/teacher/_components/teacher-result-upload-form";
import { TeacherProfilePanel } from "@/app/teacher/_components/teacher-profile-panel";
import { TeacherLessonForm } from "@/app/teacher/_components/teacher-lesson-form";
import { TeacherAssignmentForm } from "@/app/teacher/_components/teacher-assignment-form";
import { TimetableView } from "@/components/timetable-view";
import { requireRole } from "@/lib/auth-guards";
import { getCoreSchoolDataByContext, getCurrentSchoolByUser, getUserAcademicContext } from "@/lib/data";
import { prisma } from "@/lib/db";
import { getActiveSchoolConfig } from "@/lib/school-config";
import { formatDate, humanizeEnum } from "@/lib/utils";
import { AnnouncementListWithModal } from "@/components/announcement-list-with-modal";

const allowed = [
  "profile",
  "my-classes",
  "my-subjects",
  "attendance",
  "score-entry",
  "assignments",
  "lesson-notes",
  "timetable",
  "student-reports",
  "lms",
  "announcements",
  "scores",
  "comments",
] as const;

type AllowedSection = (typeof allowed)[number];

const aliases: Record<AllowedSection, Exclude<AllowedSection, "scores" | "comments">> = {
  profile: "profile",
  "my-classes": "my-classes",
  "my-subjects": "my-subjects",
  attendance: "attendance",
  "score-entry": "score-entry",
  assignments: "assignments",
  "lesson-notes": "lesson-notes",
  timetable: "timetable",
  "student-reports": "student-reports",
  lms: "lms",
  announcements: "announcements",
  scores: "score-entry",
  comments: "announcements",
};

const titles: Record<Exclude<AllowedSection, "scores" | "comments">, string> = {
  profile: "My Profile",
  "my-classes": "My Classes",
  "my-subjects": "My Subjects",
  attendance: "Attendance",
  "score-entry": "Score Entry",
  assignments: "Assignments",
  "lesson-notes": "Lesson Notes",
  timetable: "Timetable",
  "student-reports": "Student Reports",
  lms: "LMS Workspace",
  announcements: "Announcements",
};

const descriptions: Record<Exclude<AllowedSection, "scores" | "comments">, string> = {
  profile: "Your personal and contact details as an employee of the school.",
  "my-classes": "View all classes assigned to you this session and term.",
  "my-subjects": "Review your subject load and mapped class groups.",
  attendance: "Mark and monitor attendance records for your classes.",
  "score-entry": "Manage CA and exam scores for assigned subjects.",
  assignments: "Track assignment publishing and submission status.",
  "lesson-notes": "Manage uploaded lesson notes and teaching content.",
  timetable: "Preview your teaching timetable and lesson sequence.",
  "student-reports": "Inspect learner performance and report readiness.",
  lms: "Combined learning operations for lessons and assignments.",
  announcements: "Stay updated with school notices and announcements.",
};

export default async function TeacherSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(allowed as readonly string[]).includes(section)) notFound();

  const user = await requireRole(["TEACHER", "CLASS_ASSISTANT"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  const profile = await getCurrentSchoolByUser(user.id);
  if (!profile?.schoolId || !profile.school) {
    return (
      <SetupRequiredScreen
        title="Account Setup Incomplete"
        message="Your teacher account is not linked to a school yet. Please contact the school admin to complete your profile linkage."
      />
    );
  }

  const context = await getUserAcademicContext(profile.schoolId, user.id);
  const core = await getCoreSchoolDataByContext(profile.schoolId, {
    sessionId: context.session?.id,
    termId: context.term?.id,
  });

  const teacher = core.teachers.find((item: any) => item.userId === user.id) as any;
  if (!teacher) {
    return (
      <SetupRequiredScreen
        title="Teacher Profile Missing"
        message="Your user account is active but no teacher profile exists yet. Ask an admin to create your teacher record."
      />
    );
  }

  const myClasses = core.classes.filter((item: any) => item.teacherId === teacher.id);
  const classIds = new Set(myClasses.map((item: any) => item.id));

  // Fetch ALL students in the teacher's classes directly from DB.
  // core.students is limited to 20 school-wide which misses most students.
  const myStudents = classIds.size > 0
    ? await prisma.student.findMany({
        where: { schoolId: profile.schoolId, classId: { in: [...classIds] } },
        include: { user: true, class: true },
        orderBy: { firstName: "asc" },
      })
    : [];

  // Also fetch subjects where the teacher is assigned OR subjects linked to the teacher's classes
  const mySubjects = core.subjects.filter(
    (item: any) => item.teacherId === teacher.id || (item.classId ? classIds.has(item.classId) : false)
  );
  const subjectIds = new Set(mySubjects.map((item: any) => item.id));

  // Fetch lessons and assignments directly by teacher ID instead of school-wide take:20
  const [myLessons, myAssignments] = await Promise.all([
    prisma.lesson.findMany({
      where: { schoolId: profile.schoolId, teacherId: teacher.id },
      include: { subject: true, class: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.assignment.findMany({
      where: {
        schoolId: profile.schoolId,
        OR: [
          { teacherId: teacher.id },
          { subjectId: { in: [...subjectIds] } },
        ],
      },
      include: { subject: true, class: true, lesson: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const myScores = core.scores.filter((item: any) => subjectIds.has(item.subjectId));
  const myAttendance = core.attendance.filter((item: any) => item.classId && classIds.has(item.classId));

  const activeConfig = profile.schoolId ? await getActiveSchoolConfig(profile.schoolId) : null;
  const timetableTemplates = (activeConfig?.config?.operations?.timetableTemplates ?? []) as any[];

  const canonical = aliases[section as AllowedSection];

  function renderSection() {
    switch (canonical) {
      case "profile":
        return (
          <section className="space-y-4">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Teacher Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                    <p className="text-[11px] text-slate-500">Full Name</p>
                    <p className="font-medium text-slate-900">{teacher?.user?.name}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                    <p className="text-[11px] text-slate-500">Email</p>
                    <p className="font-medium text-slate-900">{teacher?.user?.email}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                    <p className="text-[11px] text-slate-500">Phone</p>
                    <p className="font-medium text-slate-900">{teacher?.user?.phone ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                    <p className="text-[11px] text-slate-500">Address</p>
                    <p className="font-medium text-slate-900">{teacher?.user?.address ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                    <p className="text-[11px] text-slate-500">Designation</p>
                    <p className="font-medium text-slate-900">{teacher?.designation ? teacher.designation.replace(/_/g, " ") : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                    <p className="text-[11px] text-slate-500">Reports To</p>
                    <p className="font-medium text-slate-900">{teacher?.reportsTo?.user?.name ?? "—"}</p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-900">Assigned Workload</h4>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                      <p className="text-[11px] text-slate-500">Classes</p>
                      <p className="font-medium text-slate-900">{myClasses.length}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                      <p className="text-[11px] text-slate-500">Subjects</p>
                      <p className="font-medium text-slate-900">{mySubjects.length}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                      <p className="text-[11px] text-slate-500">Students</p>
                      <p className="font-medium text-slate-900">{myStudents.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <TeacherProfilePanel />
          </section>
        );
      case "my-classes":
        return (
          <Card>
            <CardHeader><CardTitle>Assigned Classes</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {myClasses.length ? myClasses.map((item: any) => (
                <div key={item.id} className="glass-soft rounded-xl p-3">
                  <p className="font-medium">{item.name}</p>
                  <p>Students: {item.students.length}</p>
                </div>
              )) : <p className="text-slate-500">No classes assigned to you yet.</p>}
            </CardContent>
          </Card>
        );
      case "my-subjects":
        return (
          <Card>
            <CardHeader><CardTitle>Assigned Subjects</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {mySubjects.length ? mySubjects.map((item: any) => (
                <div key={item.id} className="glass-soft rounded-xl p-3">
                  <p className="font-medium">{item.name}</p>
                  <p>Class: {item.class?.name ?? "No class mapping"}</p>
                </div>
              )) : <p className="text-slate-500">No subjects assigned.</p>}
            </CardContent>
          </Card>
        );
      case "attendance":
        return (
          <div className="space-y-3">
            <TeacherAttendanceForm
              classOptions={myClasses.map((item: any) => ({
                id: item.id,
                name: item.name,
                students: myStudents
                  .filter((student: any) => student.classId === item.id)
                  .map((student: any) => ({ id: student.id, name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") || student.user.name })),
              }))}
            />
            <Card>
              <CardHeader><CardTitle>Attendance Records</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {myAttendance.slice(0, 20).map((item: any) => (
                  <div key={item.id} className="glass-soft rounded-xl p-3">
                    <p className="font-medium">{[item.student.firstName, item.student.middleName, item.student.lastName].filter(Boolean).join(" ") || item.student.user.name}</p>
                    <p>{item.class?.name ?? "Class"} • {humanizeEnum(item.status)} • {formatDate(item.date)}</p>
                  </div>
                ))}
                {!myAttendance.length ? <p className="text-slate-500">No attendance records yet.</p> : null}
              </CardContent>
            </Card>
          </div>
        );
      case "score-entry":
        return (
          <div className="space-y-3">
            <TeacherScoreEntryForm
              subjectOptions={mySubjects.map((item: any) => ({ id: item.id, name: item.name, classId: item.classId }))}
              studentOptions={myStudents.map((item: any) => ({ id: item.id, name: [item.firstName, item.middleName, item.lastName].filter(Boolean).join(" ") || item.user.name, classId: item.classId }))}
            />
            <TeacherResultUploadForm studentOptions={myStudents.map((item: any) => ({ id: item.id, name: [item.firstName, item.middleName, item.lastName].filter(Boolean).join(" ") || item.user.name }))} />
            <Card>
              <CardHeader><CardTitle>Score Entry Queue</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {myScores.slice(0, 20).map((item: any) => (
                  <div key={item.id} className="glass-soft rounded-xl p-3">
                    <p className="font-medium">{[item.student.firstName, item.student.middleName, item.student.lastName].filter(Boolean).join(" ") || item.student.user.name} • {item.subject.name}</p>
                    <p>CA: {item.caScore} • Exam: {item.examScore} • Total: {item.total}%</p>
                  </div>
                ))}
                {!myScores.length ? <p className="text-slate-500">No score rows yet for your subjects.</p> : null}
              </CardContent>
            </Card>
          </div>
        );
      case "assignments":
        return (
          <div className="space-y-3">
            <TeacherAssignmentForm
              subjectOptions={mySubjects.map((item: any) => ({ id: String(item.id), name: item.name, classId: item.classId ? String(item.classId) : null }))}
              classOptions={myClasses.map((item: any) => ({ id: String(item.id), name: item.name }))}
            />
            <Card>
              <CardHeader><CardTitle>Assignment List</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {myAssignments.slice(0, 30).map((item: any) => (
                  <div key={item.id} className="glass-soft rounded-xl p-3">
                    <p className="font-medium">{item.title}</p>
                    <p>Subject: {item.subject?.name ?? "-"} • Class: {item.class?.name ?? "-"} • Due: {formatDate(item.dueDate)}</p>
                    {item.instruction ? <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.instruction}</p> : null}
                  </div>
                ))}
                {!myAssignments.length ? <p className="text-slate-500">No assignments created yet. Use the form above to create one.</p> : null}
              </CardContent>
            </Card>
          </div>
        );
      case "lesson-notes":
        return (
          <div className="space-y-3">
            <TeacherLessonForm
              subjectOptions={mySubjects.map((item: any) => ({ id: String(item.id), name: item.name, classId: item.classId ? String(item.classId) : null }))}
              classOptions={myClasses.map((item: any) => ({ id: String(item.id), name: item.name }))}
            />
            <Card>
              <CardHeader><CardTitle>Lesson Notes</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {myLessons.slice(0, 30).map((item: any) => (
                  <div key={item.id} className="glass-soft rounded-xl p-3">
                    <p className="font-medium">{item.title}</p>
                    <p>Subject: {item.subject?.name ?? "-"} • Class: {item.class?.name ?? "-"} • Created: {formatDate(item.createdAt)}</p>
                    {item.note ? <p className="mt-1 text-xs text-slate-500 line-clamp-3">{item.note}</p> : null}
                  </div>
                ))}
                {!myLessons.length ? <p className="text-slate-500">No lesson notes created yet. Use the form above to create one.</p> : null}
              </CardContent>
            </Card>
          </div>
        );
      case "timetable": {
        const mySubjectNames = new Set(mySubjects.map((s: any) => s.name.toLowerCase()));
        return (
          <Card>
            <CardHeader><CardTitle>Teaching Timetable</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <TimetableView
                templates={timetableTemplates}
                filterSubject={(name) => mySubjectNames.has(name.toLowerCase())}
              />
              {mySubjects.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-slate-600">Your assigned subjects:</p>
                  {mySubjects.map((item: any) => (
                    <div key={item.id} className="glass-soft rounded-xl p-2">
                      <p className="font-medium text-xs">{item.name}</p>
                      <p className="text-xs text-slate-500">Class: {item.class?.name ?? "-"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      }
      case "student-reports":
        return (
          <Card>
            <CardHeader><CardTitle>Student Reports</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {myScores.slice(0, 25).map((item: any) => (
                <div key={item.id} className="glass-soft rounded-xl p-3">
                  <p className="font-medium">{[item.student.firstName, item.student.middleName, item.student.lastName].filter(Boolean).join(" ") || item.student.user.name}</p>
                  <p>{item.subject.name} • Grade: {item.grade} • GPA: {item.gpa.toFixed(2)}</p>
                </div>
              ))}
              {!myScores.length ? <p className="text-slate-500">No report-ready scores yet.</p> : null}
            </CardContent>
          </Card>
        );
      case "lms":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-3">
                <TeacherLessonForm
                  subjectOptions={mySubjects.map((item: any) => ({ id: String(item.id), name: item.name, classId: item.classId ? String(item.classId) : null }))}
                  classOptions={myClasses.map((item: any) => ({ id: String(item.id), name: item.name }))}
                />
                <Card>
                  <CardHeader><CardTitle>Recent Lessons</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {myLessons.slice(0, 10).map((item: any) => (
                      <div key={item.id} className="glass-soft rounded-xl p-2">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.subject?.name ?? "-"} • {formatDate(item.createdAt)}</p>
                      </div>
                    ))}
                    {!myLessons.length ? <p className="text-slate-500">No lessons yet.</p> : null}
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-3">
                <TeacherAssignmentForm
                  subjectOptions={mySubjects.map((item: any) => ({ id: String(item.id), name: item.name, classId: item.classId ? String(item.classId) : null }))}
                  classOptions={myClasses.map((item: any) => ({ id: String(item.id), name: item.name }))}
                />
                <Card>
                  <CardHeader><CardTitle>Recent Assignments</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {myAssignments.slice(0, 10).map((item: any) => (
                      <div key={item.id} className="glass-soft rounded-xl p-2">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.subject?.name ?? "-"} • Due: {formatDate(item.dueDate)}</p>
                      </div>
                    ))}
                    {!myAssignments.length ? <p className="text-slate-500">No assignments yet.</p> : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
      case "announcements":
        return (
          <Card>
            <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <AnnouncementListWithModal
                announcements={core.announcements.slice(0, 15).map((item: any) => ({
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
      userName={user.name ?? "Teacher"}
      avatarUrl={dbUser?.avatarUrl ?? undefined}
      pathname={`/teacher/${section}`}
      primaryColor={core.school?.branding?.primaryColor}
      secondaryColor={core.school?.branding?.secondaryColor}
    >
      <Card>
        <CardHeader><CardTitle>{titles[canonical]}</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-600">{descriptions[canonical]}</CardContent>
      </Card>

      <section className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Classes</p><p className="text-lg sm:text-xl font-semibold">{myClasses.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Subjects</p><p className="text-lg sm:text-xl font-semibold">{mySubjects.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Scores</p><p className="text-lg sm:text-xl font-semibold">{myScores.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Attendance Logs</p><p className="text-lg sm:text-xl font-semibold">{myAttendance.length}</p></CardContent></Card>
      </section>

      {renderSection()}
    </ModernPortalShell>
  );
}
