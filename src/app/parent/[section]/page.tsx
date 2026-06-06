import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  BookOpen,
  CalendarCheck,
  FileBarChart,
  Megaphone,
  Receipt,
  User,
  Wallet,
  GraduationCap,
  Clock3,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PortalShell } from "@/components/portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guards";
import { getCoreSchoolDataByContext, getCurrentSchoolByUser, getUserAcademicContext } from "@/lib/data";
import { isOptionalFeeItem } from "@/lib/bill-contest";
import { formatDate, humanizeEnum, naira } from "@/lib/utils";
import { ParentBillHub } from "@/app/parent/_components/parent-bill-hub";
import { ParentMessagesPanel } from "@/app/parent/_components/parent-messages-panel";
import { ParentComplaintsPanel } from "@/app/parent/_components/parent-complaints-panel";
import { ParentProfilePanel } from "@/app/parent/_components/parent-profile-panel";
import { SchoolCalendarView } from "@/app/parent/_components/school-calendar-view";
import { ParentResultsPanel } from "@/app/parent/_components/parent-results-panel";
import { ParentLmsPanel } from "@/app/parent/_components/parent-lms-panel";
import { calculateGradeFromBands } from "@/lib/grades";
import { getActiveSchoolConfig } from "@/lib/school-config";

const allowed = ["profile", "children", "fees", "payments", "attendance", "results", "report-cards", "school-calendar", "messages", "complaints", "announcements", "lms"] as const;
type AllowedSection = (typeof allowed)[number];

const tabs: Record<AllowedSection, { title: string; description: string; icon: React.ReactNode }> = {
  profile: { title: "Profile & Settings", description: "Update parent profile details and emergency contact records.", icon: <User className="h-4 w-4" /> },
  children: { title: "Linked Children", description: "Comprehensive child portfolio: biodata, academics, attendance, and fee standing.", icon: <GraduationCap className="h-4 w-4" /> },
  fees: { title: "Fees & Bills", description: "Bill center with filters, fee breakdown, and payment-notice workflow.", icon: <Wallet className="h-4 w-4" /> },
  payments: { title: "Receipts", description: "Confirmed payment receipts and printable proof of payment.", icon: <Receipt className="h-4 w-4" /> },
  attendance: { title: "Attendance", description: "Attendance calendar/list with percentage and punctuality rating.", icon: <CalendarCheck className="h-4 w-4" /> },
  results: { title: "Results", description: "Term result summaries, GPA, comments, and subject performance tables.", icon: <FileBarChart className="h-4 w-4" /> },
  "report-cards": { title: "Report Cards", description: "Open and print full report cards for each child.", icon: <FileBarChart className="h-4 w-4" /> },
  "school-calendar": { title: "School Calendar", description: "Active session/term timeline and key resumption dates.", icon: <Clock3 className="h-4 w-4" /> },
  messages: { title: "Messages", description: "Send tracked messages to school/admin/teacher and monitor status.", icon: <Megaphone className="h-4 w-4" /> },
  complaints: { title: "Complaints", description: "Submit and track complaints to school management and support desks.", icon: <Megaphone className="h-4 w-4" /> },
  announcements: { title: "Announcements", description: "Official school announcements by audience and date.", icon: <Megaphone className="h-4 w-4" /> },
  lms: { title: "LMS Monitoring", description: "Lessons, assignments, teacher notes, and progress indicators.", icon: <BookOpen className="h-4 w-4" /> },
};

export default async function ParentSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(allowed as readonly string[]).includes(section)) notFound();

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

  const children = core.students.filter((student) => student.parentId === parentProfile.id);
  const childIds = new Set(children.map((child) => child.id));
  const childClassIds = new Set(children.map((child) => child.classId).filter((id): id is string => Boolean(id)));

  const bills = core.bills.filter((bill) => childIds.has(bill.studentId));
  const attendance = core.attendance.filter((row) => childIds.has(row.studentId));
  const scores = core.scores.filter((score) => childIds.has(score.studentId));
  const assignments = core.assignments.filter((assignment) => assignment.studentId && childIds.has(assignment.studentId));
  const lessons = core.lessons.filter((lesson) => children.some((child) => child.classId && child.classId === lesson.classId));

  const prismaClient = prisma as unknown as {
    parentMessage?: {
      findMany: (args: {
        where: { schoolId: string; parentId: string };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<Array<{ id: string; recipient: string; subject: string; message: string; status: string; createdAt: Date }>>;
    };
    parentComplaint?: {
      findMany: (args: {
        where: { schoolId: string; parentId: string };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<Array<{ id: string; category: string; subject: string; complaint: string; status: string; createdAt: Date }>>;
    };
  };

  const [parentMessagesRaw, parentComplaintsRaw] = await Promise.all([
    prismaClient.parentMessage?.findMany
      ? prismaClient.parentMessage.findMany({
          where: { schoolId: profile.schoolId, parentId: parentProfile.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    prismaClient.parentComplaint?.findMany
      ? prismaClient.parentComplaint.findMany({
          where: { schoolId: profile.schoolId, parentId: parentProfile.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  const parentMessages = parentMessagesRaw.map((item) => ({
    id: item.id,
    recipient: item.recipient,
    subject: item.subject,
    message: item.message,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
  }));

  const parentComplaints = parentComplaintsRaw.map((item) => ({
    id: item.id,
    category: item.category,
    subject: item.subject,
    complaint: item.complaint,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
  }));

  const [results, receipts] = await Promise.all([
    (async () => {
      const whereBase = {
        schoolId,
        studentId: { in: Array.from(childIds) },
        ...(context.session?.id ? { sessionId: context.session.id } : {}),
        ...(context.term?.id ? { termId: context.term.id } : {}),
      };

      try {
        return await prisma.result.findMany({
          where: {
            ...whereBase,
            status: { in: ["PUBLISHED"] },
          },
          include: { student: { include: { user: true, class: true } }, term: true, session: true },
          orderBy: { createdAt: "desc" },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!message.includes("Unknown argument `status`")) {
          throw error;
        }

        return [];
      }
    })(),
    prisma.receipt.findMany({
      where: { schoolId, OR: [{ parentId: parentProfile.id }, { studentId: { in: Array.from(childIds) } }] },
      include: { student: { include: { user: true } }, parent: { include: { user: true } }, school: { include: { branding: true } }, invoice: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sectionKey = section as AllowedSection;
  const tab = tabs[sectionKey];

  const outstandingTotal = bills.reduce((sum, item) => sum + item.balance, 0);
  const attendancePercent = attendance.length ? (attendance.filter((item) => item.status === "PRESENT").length / attendance.length) * 100 : 0;
  const punctualityLateRate = attendance.length ? (attendance.filter((item) => item.status === "LATE").length / attendance.length) * 100 : 0;
  const punctualityRating = punctualityLateRate <= 5 ? "Excellent" : punctualityLateRate <= 12 ? "Good" : "Needs attention";

  const childInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  const childPhotoUrl = (passportUrl: string | null | undefined, name: string) => {
    if (passportUrl) {
      if (passportUrl.startsWith("http://") || passportUrl.startsWith("https://") || passportUrl.startsWith("/")) {
        return passportUrl;
      }
      return `/${passportUrl}`;
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0B1F4D&color=FFFFFF&size=128&bold=true`;
  };

  function childCard(childId: string) {
    const childAttendance = attendance.filter((item) => item.studentId === childId);
    const childBills = bills.filter((item) => item.studentId === childId);
    const childResults = results.filter((item) => item.studentId === childId);
    const childAssignments = assignments.filter((item) => item.studentId === childId);

    return {
      attendanceSummary: `${childAttendance.filter((item) => item.status === "PRESENT").length} present / ${childAttendance.length} logs`,
      feeSummary: `${naira(childBills.reduce((sum, item) => sum + item.balance, 0))} outstanding`,
      resultSummary: childResults[0] ? `${childResults[0].termPercentage.toFixed(1)}% • ${childResults[0].termGrade}` : "No result summary",
      lmsActivity: `${childAssignments.filter((item) => item.submittedAt).length}/${childAssignments.length} submitted`,
      teacherComment: childResults[0]?.classTeacherComment ?? "No teacher comment yet",
    };
  }

  const billHubData = bills.map((bill) => ({
    id: bill.id,
    invoiceNumber: bill.invoiceNumber,
    studentId: bill.studentId,
    studentName: bill.student.user.name,
    className: bill.class?.name,
    termName: bill.term.name,
    sessionName: bill.session.name,
    totalAmount: bill.totalAmount,
    amountPaid: bill.amountPaid,
    balance: bill.balance,
    status: bill.status,
    dueDate: bill.dueDate?.toISOString() ?? null,
    paymentInstructions: bill.paymentInstructions,
    items: bill.items?.map((item: any) => ({
      id: item.id,
      groupName: item.feeItem?.feeGroup?.name ?? item.feeItem?.category,
      name: item.feeItem?.name,
      amount: item.amount,
      optional: isOptionalFeeItem({ category: item.feeItem?.category, name: item.feeItem?.name }),
    })) ?? [],
  }));

  const activeConfig = core.school ? await getActiveSchoolConfig(core.school.id) : null;
  const gradingBands = (activeConfig?.config.academic.gradingSystem ?? []).map((band: any) => ({
    min: Number(band.min),
    grade: band.grade,
    gpa: Number(band.gpa),
  }));

  const resultPanelData = children.flatMap((child) => {
    const latest = results.find((result) => result.studentId === child.id) ?? null;
    if (!latest) {
      return [];
    }

    const childScores = latest ? scores.filter((score) => score.studentId === child.id) : [];
    const termAverage = latest && childScores.length
      ? childScores.reduce((sum, score) => sum + score.total, 0) / childScores.length
      : null;
    const termGradeMeta = termAverage !== null ? calculateGradeFromBands(termAverage, gradingBands) : null;

    return [{
      studentId: child.id,
      studentName: child.user.name,
      className: child.class?.name ?? "Class not assigned",
      termName: latest?.term.name ?? (context.term?.name ?? ""),
      sessionName: latest?.session.name ?? (context.session?.name ?? ""),
      termPercentage: termAverage ?? latest?.termPercentage ?? null,
      termGrade: termGradeMeta?.grade ?? latest?.termGrade ?? null,
      termGpa: termGradeMeta?.gpa ?? latest?.termGpa ?? null,
      classTeacherComment: latest?.classTeacherComment ?? null,
      principalComment: latest?.principalComment ?? null,
      subjects: childScores.map((score) => ({
        id: score.id,
        subjectName: score.subject.name,
        total: score.total,
        grade: calculateGradeFromBands(score.total, gradingBands).grade,
      })),
    }];
  });

  const lmsChildren = children.map((child) => ({
    id: child.id,
    name: child.user.name,
    className: child.class?.name ?? "Class not assigned",
    classId: child.classId,
  }));

  const lmsAssignments = assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    dueDate: assignment.dueDate.toISOString(),
    submittedAt: assignment.submittedAt ? assignment.submittedAt.toISOString() : null,
    studentId: assignment.studentId,
    classId: assignment.classId,
    subjectName: assignment.subject?.name ?? "Subject",
  }));

  const lmsClassAssignments = core.assignments
    .filter((assignment) => assignment.classId && childClassIds.has(assignment.classId))
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      dueDate: assignment.dueDate.toISOString(),
      submittedAt: assignment.submittedAt ? assignment.submittedAt.toISOString() : null,
      studentId: assignment.studentId,
      classId: assignment.classId,
      subjectName: assignment.subject?.name ?? "Subject",
    }));

  const lmsAssignmentsAll = [...lmsAssignments, ...lmsClassAssignments.filter((item) => !lmsAssignments.some((existing) => existing.id === item.id))];

  const lmsLessons = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    createdAt: lesson.createdAt.toISOString(),
    classId: lesson.classId,
    subjectName: lesson.subject?.name ?? "Subject",
  }));

  const lmsSubjects = core.subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    classId: subject.classId,
  }));

  const lmsQuizzes = core.quizzes
    .filter((quiz) => !quiz.classId || childClassIds.has(quiz.classId))
    .map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      dueDate: quiz.dueDate ? quiz.dueDate.toISOString() : null,
      classId: quiz.classId,
      subjectName: quiz.subject?.name ?? "Subject",
    }));

  const lmsOnlineClasses = core.onlineClasses
    .filter((live) => !live.classId || childClassIds.has(live.classId))
    .map((live) => ({
      id: live.id,
      title: live.title,
      startTime: live.startTime.toISOString(),
      classId: live.classId,
      subjectName: live.subject?.name ?? "Subject",
    }));

  const childrenWithPublishedResults = children.filter((child) => results.some((item) => item.studentId === child.id));

  return (
    <PortalShell
      role={user.role}
      schoolName={core.school?.name}
      schoolLogoUrl={core.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Parent"}
      pathname={`/parent/${section}`}
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
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Parent Portal</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-900">{tab.icon}{tab.title}</h2>
            <p className="text-sm text-slate-600">{tab.description}</p>
          </div>
          <div className="metric-chip text-xs text-slate-600">{context.session?.name ?? "-"} / {context.term?.name ?? "-"}</div>
        </div>
      </section>

      {sectionKey === "children" ? (
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-panel"><CardContent className="p-4"><p className="text-xs text-slate-500">Linked Children</p><p className="text-2xl font-semibold text-slate-900">{children.length}</p></CardContent></Card>
        <Card className="glass-panel"><CardContent className="p-4"><p className="text-xs text-slate-500">Outstanding Fees</p><p className="text-2xl font-semibold text-slate-900">{naira(outstandingTotal)}</p></CardContent></Card>
        <Card className="glass-panel"><CardContent className="p-4"><p className="text-xs text-slate-500">Attendance %</p><p className="text-2xl font-semibold text-slate-900">{attendancePercent.toFixed(1)}%</p></CardContent></Card>
        <Card className="glass-panel"><CardContent className="p-4"><p className="text-xs text-slate-500">Punctuality</p><p className="text-2xl font-semibold text-slate-900">{punctualityRating}</p></CardContent></Card>
      </section>
      ) : null}

      {sectionKey === "children" ? (
        <section className="grid gap-3 xl:grid-cols-2">
          {children.length ? children.map((child) => {
            const summary = childCard(child.id);
            return (
              <Card key={child.id} className="glass-panel rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-700 text-white">
                  <CardTitle className="text-base">Child Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] text-sm font-semibold text-white">
                        {childInitials(child.user.name) || "ST"}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900">{child.user.name}</p>
                        <p className="text-xs text-slate-500">{child.class?.name ?? "Not assigned"} • {child.gender} • Age {child.age}</p>
                        <p className="text-xs text-slate-500">Adm: {child.id.slice(0, 10).toUpperCase()}</p>
                      </div>
                    </div>
                    <Link href={`/parent/children/${child.id}`} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                      View more
                    </Link>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2"><p className="text-[11px] text-slate-500">Attendance</p><p className="font-medium text-slate-900">{summary.attendanceSummary}</p></div>
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2"><p className="text-[11px] text-slate-500">Fees</p><p className="font-medium text-slate-900">{summary.feeSummary}</p></div>
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2"><p className="text-[11px] text-slate-500">Results</p><p className="font-medium text-slate-900">{summary.resultSummary}</p></div>
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2"><p className="text-[11px] text-slate-500">LMS</p><p className="font-medium text-slate-900">{summary.lmsActivity}</p></div>
                  </div>

                  <details className="rounded-lg border border-slate-200 bg-white/60 p-3">
                    <summary className="cursor-pointer text-xs font-medium text-slate-700">More details</summary>
                    <p className="mt-2"><strong>Sport House:</strong> {child.sportHouse ?? "Not set"}</p>
                    <p><strong>Teacher Comment:</strong> {summary.teacherComment}</p>
                  </details>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Link href={`/parent/children/${child.id}#results`} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-white">View Report</Link>
                    <Link href={`/parent/children/${child.id}#fees`} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-white">View Fees</Link>
                    <Link href={`/parent/children/${child.id}#lessons`} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-white">View Lessons</Link>
                    <Link href={`/parent/children/${child.id}#attendance`} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-white">View Attendance</Link>
                  </div>
                </CardContent>
              </Card>
            );
          }) : <Card><CardContent className="p-6 text-sm text-slate-500">No linked children found.</CardContent></Card>}
        </section>
      ) : null}

      {sectionKey === "fees" ? (
        <ParentBillHub
          childOptions={children.map((child) => ({ id: child.id, name: child.user.name }))}
          bills={billHubData}
          bank={{
            bankName: core.school?.branding?.bankName,
            bankAccountName: core.school?.branding?.bankAccountName,
            bankAccountNumber: core.school?.branding?.bankAccountNumber,
            bankInstructions: core.school?.branding?.bankInstructions,
          }}
        />
      ) : null}

      {sectionKey === "payments" ? (
        <Card className="glass-panel">
          <CardHeader><CardTitle>Confirmed Receipts</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {receipts.length ? receipts.map((receipt) => (
              <div key={receipt.id} className="glass-soft rounded-xl p-3">
                <p className="font-medium">{receipt.receiptNumber}</p>
                <p>{receipt.student.user.name} • {naira(receipt.amount)} • {receipt.paymentMethod}</p>
                <p>Date: {formatDate(receipt.paymentDate)} • Balance: {naira(receipt.balance)}</p>
                <Link href={`/receipt/${receipt.id}`} className="text-[var(--brand-primary)] underline">Open Receipt</Link>
              </div>
            )) : <p className="text-slate-500">No confirmed receipts yet.</p>}
          </CardContent>
        </Card>
      ) : null}

      {sectionKey === "results" ? <ParentResultsPanel data={resultPanelData} /> : null}

      {sectionKey === "report-cards" ? (
        <section className="grid gap-3 xl:grid-cols-2">
          {childrenWithPublishedResults.length ? childrenWithPublishedResults.map((child) => {
            const latest = results.find((item) => item.studentId === child.id);
            const childScores = latest ? scores.filter((item) => item.studentId === child.id) : [];
            const topSubjects = [...childScores].sort((a, b) => b.total - a.total).slice(0, 4);
            const average = childScores.length ? childScores.reduce((sum, item) => sum + item.total, 0) / childScores.length : 0;

            return (
              <Card key={child.id} className="glass-panel overflow-hidden rounded-2xl border border-slate-200/70">
                <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-700 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={childPhotoUrl(child.passportUrl, child.user.name)}
                        alt={`${child.user.name} profile photo`}
                        width={48}
                        height={48}
                        unoptimized
                        className="h-12 w-12 rounded-full border border-white/30 bg-white/10 object-cover"
                      />
                      <div>
                        <CardTitle className="text-base text-white">{child.user.name}</CardTitle>
                        <p className="text-xs text-white/80">{child.class?.name ?? "Not assigned"} • Report glimpse</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/35 bg-white/10 px-2 py-1 text-[11px] uppercase tracking-wide">
                      {latest ? `${latest.term.name} • ${latest.session.name}` : "No report yet"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 p-4 text-sm">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2">
                      <p className="text-[11px] text-slate-500">Term Grade</p>
                      <p className="text-base font-semibold text-slate-900">{latest?.termGrade ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2">
                      <p className="text-[11px] text-slate-500">Term GPA</p>
                      <p className="text-base font-semibold text-slate-900">{latest ? latest.termGpa.toFixed(2) : "-"}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2">
                      <p className="text-[11px] text-slate-500">Average Score</p>
                      <p className="text-base font-semibold text-slate-900">{childScores.length ? `${average.toFixed(1)}%` : "-"}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Subject Highlights</p>
                    {topSubjects.length ? (
                      <div className="space-y-2">
                        {topSubjects.map((score) => (
                          <div key={score.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700">{score.subject.name}</span>
                              <span className="text-slate-600">{score.total}% ({score.grade})</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200">
                              <div className="h-2 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]" style={{ width: `${Math.max(0, Math.min(100, score.total))}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No subject scores published yet.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-600">
                    <p className="font-medium text-slate-700">Teacher Comment</p>
                    <p className="mt-1">{latest?.classTeacherComment ?? "Comment not yet published."}</p>
                  </div>

                  <div className="flex justify-end">
                    <Link href={`/reports/${child.id}`} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800">
                      View Full Report Card
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          }) : (
            <Card className="glass-panel">
              <CardContent className="p-6 text-sm text-slate-500">No published result is available yet.</CardContent>
            </Card>
          )}
        </section>
      ) : null}

      {sectionKey === "lms" ? (
        <ParentLmsPanel
          childOptions={lmsChildren}
          assignments={lmsAssignmentsAll}
          lessons={lmsLessons}
          subjects={lmsSubjects}
          quizzes={lmsQuizzes}
          onlineClasses={lmsOnlineClasses}
        />
      ) : null}

      {sectionKey === "attendance" ? (() => {
        const presentCount = attendance.filter((item) => item.status === "PRESENT").length;
        const absentCount = attendance.filter((item) => item.status === "ABSENT").length;
        const lateCount = attendance.filter((item) => item.status === "LATE").length;
        const totalCount = attendance.length;

        function dateKey(value: Date) {
          return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
        }

        const statusByDay = new Map<string, "PRESENT" | "LATE" | "ABSENT" | "EXCUSED">();
        for (const row of attendance) {
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

        const trendDays = Array.from({ length: 14 }, (_, index) => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - (13 - index));
          const key = dateKey(d);
          return { key, label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), status: statusByDay.get(key) ?? "NONE" };
        });

        return (
          <section className="space-y-4">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] via-[#1a3a6e] to-[var(--brand-secondary)] p-6 text-white shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Attendance Dashboard</p>
                  <h2 className="mt-1 text-2xl font-bold">Attendance Calendar / List</h2>
                  <p className="text-sm text-white/85">Real-time attendance visibility for your linked children.</p>
                </div>
                <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                  <p className="text-3xl font-extrabold">{attendancePercent.toFixed(1)}%</p>
                  <p className="text-xs text-white/80">attendance rate</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Present Days</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{presentCount}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Absent Days</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{absentCount}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Late Days</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{lateCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Punctuality</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">{punctualityRating}</p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Records</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{totalCount}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Last 14 Days Activity</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Late</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Absent</span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
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

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">Attendance Records</h3>
              </div>
              {attendance.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-600">
                        <th className="px-4 py-2">Student</th>
                        <th className="px-4 py-2">Class</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.slice(0, 25).map((item, idx) => (
                        <tr key={item.id} className={idx % 2 ? "bg-white" : "bg-slate-50/70"}>
                          <td className="px-4 py-2 font-medium text-slate-900">{item.student.user.name}</td>
                          <td className="px-4 py-2 text-slate-600">{item.class?.name ?? "Class"}</td>
                          <td className="px-4 py-2 text-slate-600">{formatDate(item.date)}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                item.status === "PRESENT"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : item.status === "LATE"
                                    ? "bg-amber-100 text-amber-700"
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
      })() : null}

      {sectionKey === "announcements" ? (
        <Card className="glass-panel">
          <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {core.announcements.length ? core.announcements.slice(0, 20).map((item) => (
              <div key={item.id} className="glass-soft rounded-xl p-3">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-slate-500">Date: {formatDate(item.createdAt)} • Audience: {humanizeEnum(item.audience)}</p>
                <p>{item.body}</p>
                <p className="text-xs text-slate-500">Attachment: Not provided</p>
              </div>
            )) : <p className="text-slate-500">No announcements published yet.</p>}
          </CardContent>
        </Card>
      ) : null}

      {sectionKey === "messages" ? <ParentMessagesPanel initialMessages={parentMessages} /> : null}
      {sectionKey === "complaints" ? <ParentComplaintsPanel initialComplaints={parentComplaints} /> : null}
      {sectionKey === "profile" ? <ParentProfilePanel /> : null}

      {sectionKey === "school-calendar" ? (() => {
        const allTermsForSession = core.terms.filter((t) => t.sessionId === context.session?.id);
        const termStart = context.term?.startDate ? new Date(context.term.startDate) : null;
        const termEnd = context.term?.endDate ? new Date(context.term.endDate) : null;
        const today = new Date();
        const termDuration = termStart && termEnd ? termEnd.getTime() - termStart.getTime() : null;
        const termElapsed = termStart && termDuration ? Math.max(0, Math.min(100, ((today.getTime() - termStart.getTime()) / termDuration) * 100)) : 0;
        const daysLeft = termEnd ? Math.max(0, Math.ceil((termEnd.getTime() - today.getTime()) / 86400000)) : null;
        const presentCount = attendance.filter((a) => a.status === "PRESENT").length;
        const absentCount = attendance.filter((a) => a.status === "ABSENT").length;
        const lateCount = attendance.filter((a) => a.status === "LATE").length;
        const recentAnnouncements = core.announcements.slice(0, 5);

        return (
          <section className="space-y-4">
            {/* hero banner */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] via-[#1a3a6e] to-[var(--brand-secondary)] p-6 text-white shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Active Academic Period</p>
                  <h2 className="mt-1 text-2xl font-bold">{context.session?.name ?? "—"}</h2>
                  <p className="text-base text-white/90">{context.term?.name ?? "—"}</p>
                </div>
                {daysLeft !== null && (
                  <div className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-center backdrop-blur-sm">
                    <p className="text-3xl font-extrabold">{daysLeft}</p>
                    <p className="text-xs text-white/80">days left in term</p>
                  </div>
                )}
              </div>
              <div className="mt-5">
                <div className="mb-1 flex justify-between text-xs text-white/70">
                  <span>{formatDate(context.term?.startDate)}</span>
                  <span>{termElapsed.toFixed(0)}% elapsed</span>
                  <span>{formatDate(context.term?.endDate)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/20">
                  <div className="h-2.5 rounded-full bg-white transition-all" style={{ width: `${termElapsed}%` }} />
                </div>
              </div>
            </div>

            {/* key dates */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-lg">📅</div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Term Start</p>
                  <p className="font-semibold text-slate-900">{formatDate(context.term?.startDate) ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white text-lg">🏁</div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Term End</p>
                  <p className="font-semibold text-slate-900">{formatDate(context.term?.endDate) ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white text-lg">🔔</div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Resumption</p>
                  <p className="font-semibold text-slate-900">{formatDate(context.term?.resumptionDate) ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white text-lg">📚</div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">Terms This Session</p>
                  <p className="font-semibold text-slate-900">{allTermsForSession.length} term{allTermsForSession.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {/* attendance this term */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-4 text-sm font-semibold text-slate-800">📊 Attendance Summary</p>
                <div className="space-y-3">
                  {[
                    { label: "Present", count: presentCount, total: attendance.length, color: "bg-emerald-500" },
                    { label: "Absent",  count: absentCount,  total: attendance.length, color: "bg-rose-500" },
                    { label: "Late",    count: lateCount,    total: attendance.length, color: "bg-amber-500" },
                  ].map(({ label, count, total, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-medium">{label}</span>
                        <span>{count} / {total}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div className={`h-2.5 rounded-full ${color}`} style={{ width: total ? `${(count / total) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* terms timeline */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-4 text-sm font-semibold text-slate-800">🗓️ Terms in Session</p>
                {allTermsForSession.length ? (
                  <ol className="relative border-l-2 border-slate-200 pl-5 space-y-4">
                    {allTermsForSession.map((t, i) => {
                      const isActive = t.id === context.term?.id;
                      const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500"];
                      const dot = colors[i % colors.length];
                      return (
                        <li key={t.id} className="relative">
                          <span className={`absolute -left-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${dot}`} />
                          <div className={`rounded-xl border p-3 text-xs ${isActive ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                            <p className={`font-semibold ${isActive ? "text-blue-700" : "text-slate-800"}`}>{t.name} {isActive && <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">Active</span>}</p>
                            <p className="text-slate-500 mt-0.5">{formatDate(t.startDate)} → {formatDate(t.endDate)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="text-sm text-slate-500">No terms found for this session.</p>
                )}
              </div>
            </div>

            {/* interactive calendar grid */}
            {(() => {
              function toYMD(d: Date | null | undefined) {
                if (!d) return null;
                const dt = new Date(d);
                return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
              }
              type CalEv = { date: string; label: string; type: "term-start" | "term-end" | "resumption" | "announcement" | "holiday" };
              const calEvents: CalEv[] = [];
              // all terms across all sessions
              for (const t of core.terms) {
                if (t.startDate) calEvents.push({ date: toYMD(t.startDate)!, label: t.name, type: "term-start" });
                if (t.endDate)   calEvents.push({ date: toYMD(t.endDate)!,   label: t.name, type: "term-end" });
                if (t.resumptionDate) calEvents.push({ date: toYMD(t.resumptionDate)!, label: `${t.name} Resumption`, type: "resumption" });
              }
              // announcements
              for (const ann of core.announcements) {
                const d = toYMD(ann.createdAt);
                if (d) calEvents.push({ date: d, label: ann.title, type: "announcement" });
              }
              return (
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-800">📆 Activity Calendar</p>
                  <SchoolCalendarView events={calEvents} />
                </div>
              );
            })()}

            {/* announcements */}
            {recentAnnouncements.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p className="mb-3 text-sm font-semibold text-amber-800">📢 Latest School Announcements</p>
                <div className="space-y-2">
                  {recentAnnouncements.map((item) => (
                    <div key={item.id} className="rounded-xl border border-amber-200 bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">{humanizeEnum(item.audience)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.body}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatDate(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })() : null}
    </PortalShell>
  );
}
