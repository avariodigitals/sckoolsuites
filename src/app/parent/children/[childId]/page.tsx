import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalShell } from "@/components/portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { requireRole } from "@/lib/auth-guards";
import { getCoreSchoolDataByContext, getCurrentSchoolByUser, getUserAcademicContext } from "@/lib/data";
import { formatDate, humanizeEnum, naira } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { ChildWorkspaceSwitcher } from "@/app/parent/_components/child-workspace-switcher";

export default async function ParentChildWorkspacePage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;

  const user = await requireRole(["PARENT"]);
  const profile = await getCurrentSchoolByUser(user.id);

  if (!profile?.schoolId || !profile.school) {
    return (
      <SetupRequiredScreen
        title="Account Setup Incomplete"
        message="Your parent account is not linked to a school yet. Please contact the school admin to complete your profile linkage."
      />
    );
  }

  const context = await getUserAcademicContext(profile.schoolId, user.id);
  const schoolId = profile.schoolId;
  const core = await getCoreSchoolDataByContext(profile.schoolId, {
    sessionId: context.session?.id,
    termId: context.term?.id,
  });

  const parentProfile = core.parents.find((parent) => parent.userId === user.id);
  if (!parentProfile) {
    return (
      <SetupRequiredScreen
        title="Parent Profile Missing"
        message="Your user account is active but no parent profile exists yet. Ask an admin to create your parent record and link children."
      />
    );
  }

  const child = core.students.find((student) => student.id === childId && student.parentId === parentProfile.id);
  if (!child) {
    notFound();
  }
  const linkedChildren = core.students.filter((student) => student.parentId === parentProfile.id);

  const childInvoices = core.bills.filter((invoice: any) => invoice.studentId === child.id);
  const childAttendance = core.attendance.filter((row) => row.studentId === child.id);
  const childScoresAll = core.scores.filter((score) => score.studentId === child.id);
  const childLessons = core.lessons.filter((lesson) => child.classId && lesson.classId === child.classId);
  const childAssignments = core.assignments.filter((assignment) => assignment.studentId === child.id || (child.classId && assignment.classId === child.classId));

  const childResults = await (async () => {
    const whereBase = {
      schoolId,
      studentId: child.id,
      ...(context.session?.id ? { sessionId: context.session.id } : {}),
      ...(context.term?.id ? { termId: context.term.id } : {}),
    };

    try {
      return await prisma.result.findMany({
        where: {
          ...whereBase,
          status: { in: ["PUBLISHED"] },
        },
        include: { term: true, session: true },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("Unknown argument `status`")) {
        throw error;
      }

      return [];
    }
  })();

  const latestResult = childResults[0] ?? null;
  const childScores = latestResult ? childScoresAll : [];
  const totalOutstanding = childInvoices.reduce((sum, item) => sum + item.balance, 0);
  const presentCount = childAttendance.filter((item) => item.status === "PRESENT").length;
  const attendancePercent = childAttendance.length ? (presentCount / childAttendance.length) * 100 : 0;
  const submittedAssignments = childAssignments.filter((item) => Boolean(item.submittedAt)).length;

  return (
    <PortalShell
      role={user.role}
      schoolName={core.school?.name}
      schoolLogoUrl={core.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Parent"}
      pathname="/parent/children"
      currentSessionName={context.session?.name}
      currentTermName={context.term?.name}
      sessions={core.sessions.map((item) => ({ id: item.id, name: item.name }))}
      terms={core.terms.map((item) => ({ id: item.id, name: item.name, sessionId: item.sessionId }))}
      selectedSessionId={context.session?.id}
      selectedTermId={context.term?.id}
      primaryColor={core.school?.branding?.primaryColor}
      secondaryColor={core.school?.branding?.secondaryColor}
    >
      <section className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">My Children / Child Workspace</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{child.user.name}</h2>
            <p className="text-sm text-slate-600">{child.class?.name ?? "Not assigned"} • {child.gender} • Age {child.age}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <ChildWorkspaceSwitcher
              childOptions={linkedChildren.map((item) => ({ id: item.id, name: item.user.name }))}
              currentChildId={child.id}
            />
            <Link href="/parent/children" className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-white">Back to children</Link>
            <Link href="#lessons" className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-white">Lessons</Link>
            <Link href="#attendance" className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-white">Attendance</Link>
            <Link href="#fees" className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-white">Fees</Link>
            <Link href="#results" className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-white">Results</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-panel"><CardContent className="p-4"><p className="text-xs text-slate-500">Outstanding Fees</p><p className="text-2xl font-semibold text-slate-900">{naira(totalOutstanding)}</p></CardContent></Card>
        <Card className="glass-panel"><CardContent className="p-4"><p className="text-xs text-slate-500">Attendance %</p><p className="text-2xl font-semibold text-slate-900">{attendancePercent.toFixed(1)}%</p></CardContent></Card>
        <Card className="glass-panel"><CardContent className="p-4"><p className="text-xs text-slate-500">Term Grade</p><p className="text-2xl font-semibold text-slate-900">{latestResult?.termGrade ?? "-"}</p></CardContent></Card>
        <Card className="glass-panel"><CardContent className="p-4"><p className="text-xs text-slate-500">Assignments</p><p className="text-2xl font-semibold text-slate-900">{submittedAssignments}/{childAssignments.length}</p></CardContent></Card>
      </section>

      <section id="lessons" className="scroll-mt-24">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Lessons</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {childLessons.length ? childLessons.slice(0, 20).map((lesson) => (
              <div key={lesson.id} className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <p className="font-medium text-slate-900">{lesson.title}</p>
                <p className="text-slate-600">{lesson.subject?.name ?? "Subject"} • {formatDate(lesson.createdAt)}</p>
              </div>
            )) : <p className="text-slate-500">No lessons found for this child in selected term context.</p>}
          </CardContent>
        </Card>
      </section>

      <section id="attendance" className="scroll-mt-24">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Attendance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {childAttendance.length ? childAttendance.slice(0, 30).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 p-3">
                <p className="text-slate-700">{formatDate(row.date)}</p>
                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-700">{humanizeEnum(row.status)}</span>
              </div>
            )) : <p className="text-slate-500">No attendance logs in selected term.</p>}
          </CardContent>
        </Card>
      </section>

      <section id="fees" className="scroll-mt-24">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Fees & Bills</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {childInvoices.length ? childInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">Bill #{invoice.invoiceNumber}</p>
                    <p className="text-slate-600">{invoice.term.name} / {invoice.session.name}</p>
                  </div>
                  <p className="text-right text-slate-700">{naira(invoice.amountPaid)} paid / {naira(invoice.totalAmount)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">Balance: {naira(invoice.balance)}</p>
              </div>
            )) : <p className="text-slate-500">No bills for selected term.</p>}
          </CardContent>
        </Card>
      </section>

      <section id="results" className="scroll-mt-24">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Results & Reports</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {latestResult ? (
              <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <p className="font-medium text-slate-900">Latest Result Snapshot</p>
                <p className="text-slate-600">{latestResult.term.name} / {latestResult.session.name}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-2"><p className="text-[11px] text-slate-500">Percentage</p><p className="font-semibold text-slate-900">{latestResult.termPercentage.toFixed(1)}%</p></div>
                  <div className="rounded-lg border border-slate-200 bg-white p-2"><p className="text-[11px] text-slate-500">Grade</p><p className="font-semibold text-slate-900">{latestResult.termGrade}</p></div>
                  <div className="rounded-lg border border-slate-200 bg-white p-2"><p className="text-[11px] text-slate-500">GPA</p><p className="font-semibold text-slate-900">{latestResult.termGpa.toFixed(2)}</p></div>
                </div>
                <p className="mt-2 text-xs text-slate-600">Class teacher: {latestResult.classTeacherComment ?? "No comment yet."}</p>
              </div>
            ) : <p className="text-slate-500">No published result for selected term.</p>}

            <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
              <p className="mb-2 font-medium text-slate-900">Subject Scores</p>
              {childScores.length ? (
                <div className="space-y-2">
                  {childScores.map((score) => (
                    <div key={score.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2">
                      <span className="text-slate-700">{score.subject.name}</span>
                      <span className="text-xs text-slate-600">{score.total.toFixed(1)}% ({score.grade})</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-500">No subject scores in selected term.</p>}
            </div>

            <div className="flex justify-end">
              <Link href={`/reports/${child.id}`} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800">
                Open Printable Report Card
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </PortalShell>
  );
}