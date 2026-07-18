import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getClassGroupGradingProfiles, parseNumericAssessmentScore, resolveClassGroupProfile } from "@/lib/class-group-grading";
import { calculateGradeFromBands } from "@/lib/grades";
import { prisma } from "@/lib/db";
import { getActiveSchoolConfig } from "@/lib/school-config";
import { resolveReportTemplate } from "@/lib/report-templates";
import { APP_POWERED_BY } from "@/lib/constants";
import { formatDate, naira, getCloudinaryInlineUrl, getCloudinaryDownloadUrl } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export default async function ReportCardPage({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }
  const { studentId: rawStudentId } = await params;
  const studentId = Number(rawStudentId);
  if (Number.isNaN(studentId)) {
    notFound();
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      school: { include: { branding: true } },
      user: true,
      class: { include: { classGroup: true } },
      parent: { include: { user: true } },
      teacher: { include: { user: true } },
      scores: { include: { subject: true }, orderBy: { subject: { name: "asc" } } },
      attendances: true,
    },
  });

  if (!student) notFound();

  // Enforce parent/student ownership. Admins/teachers/principals can view any report.
  const allowedAdminRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "TEACHER", "REGISTRAR"];
  if (!allowedAdminRoles.includes(session.user.role)) {
    if (session.user.role === "PARENT") {
      const parent = await prisma.parent.findFirst({
        where: { userId: session.user.id, schoolId: student.schoolId },
      });
      if (!parent || student.parentId !== parent.id) {
        notFound();
      }
    } else if (session.user.role === "STUDENT") {
      if (student.userId !== session.user.id) {
        notFound();
      }
    } else {
      notFound();
    }
  }

  const result = await (async () => {
    try {
      return await prisma.result.findFirst({
        where: {
          schoolId: student.schoolId,
          studentId: student.id,
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

      return null;
    }
  })();
  const reportScores = result
    ? student.scores.filter((score: any) => score.termId === result.termId && score.sessionId === result.sessionId)
    : [];
  const cumulativeTotal = result?.cumulativeTotal ?? (reportScores.length ? reportScores.reduce((sum: number, score: any) => sum + score.total, 0) : 0);
  const average = result?.average ?? (reportScores.length ? cumulativeTotal / reportScores.length : 0);
  const attendancePresent = result?.attendancePresent ?? (result ? student.attendances.filter((item: any) => item.status === "PRESENT").length : 0);
  const attendanceTotal = result?.attendanceTotal ?? (result ? student.attendances.length : 0);
  const termPercentage = result?.termPercentage ?? average;
  const termGpa = result?.termGpa ?? (reportScores.length ? reportScores.reduce((sum: number, score: any) => sum + score.gpa, 0) / reportScores.length : 0);
  const [activeConfig, classGroupProfiles, feeAggregate] = await Promise.all([
    getActiveSchoolConfig(student.schoolId),
    getClassGroupGradingProfiles(student.schoolId),
    prisma.invoice.aggregate({
      where: {
        schoolId: student.schoolId,
        studentId: student.id,
        ...(result ? { termId: result.termId, sessionId: result.sessionId } : {}),
      },
      _sum: { balance: true },
    }),
  ]);
  const reportTemplate = resolveReportTemplate(
    (activeConfig.config.result?.templates as Array<Record<string, unknown>> | undefined)?.map((item) => ({
      name: String(item.name ?? ""),
      level: String(item.level ?? ""),
      classGroupName: String(item.classGroupName ?? ""),
      className: String(item.className ?? ""),
      isDefault: item.isDefault === true,
      layout: item.layout && typeof item.layout === "object" && !Array.isArray(item.layout)
        ? {
            header: (item.layout as Record<string, unknown>).header === undefined ? undefined : Boolean((item.layout as Record<string, unknown>).header),
            sections: Array.isArray((item.layout as Record<string, unknown>).sections)
              ? ((item.layout as Record<string, unknown>).sections as unknown[]).map((section) => String(section ?? "").trim()).filter(Boolean)
              : undefined,
          }
        : undefined,
    })) ?? [],
    {
      className: student.class?.name,
      classGroupName: student.class?.classGroup?.name,
    },
  );
  const isPrenurseryTemplate = reportTemplate.variant === "prenursery";
  const classGroupProfile = resolveClassGroupProfile(classGroupProfiles, student.class?.classGroup?.name);
  const gradingSource = classGroupProfile?.gradeBands?.length
    ? classGroupProfile.gradeBands
    : activeConfig.config.academic.gradingSystem;
  const gradingKey = [...gradingSource]
    .map((band) => ({ min: Number(band.min), grade: band.grade, gpa: Number(band.gpa) }))
    .sort((a, b) => b.min - a.min);
  const passMark = classGroupProfile?.passMark ?? 50;
  const promotionStatus = result ? (termPercentage >= passMark ? "Promoted" : "Promotional review required") : "Pending result approval";
  const feeBalance = feeAggregate._sum.balance ?? 0;
  const themePrimary = student.school.branding?.primaryColor ?? "#0B1F4D";
  const themeSecondary = student.school.branding?.secondaryColor ?? "#0E9F6E";
  const normalizeAssetUrl = (assetUrl: string | null | undefined) => {
    if (!assetUrl) return undefined;
    if (assetUrl.startsWith("http://") || assetUrl.startsWith("https://") || assetUrl.startsWith("/")) {
      return assetUrl;
    }
    return `/${assetUrl}`;
  };

  const schoolLogoUrl = normalizeAssetUrl(student.school.branding?.logoUrl);
  const teacherSignatureUrl = normalizeAssetUrl(student.school.branding?.teacherSignature);
  const principalSignatureUrl = normalizeAssetUrl(student.school.branding?.principalSignature);
  const schoolStampUrl = normalizeAssetUrl(student.school.branding?.schoolStamp);
  const normalizedPassportUrl = student.passportUrl
    ? student.passportUrl.startsWith("http://") || student.passportUrl.startsWith("https://") || student.passportUrl.startsWith("/")
      ? student.passportUrl
      : `/${student.passportUrl}`
    : undefined;
  const fallbackPassport = `https://ui-avatars.com/api/?name=${encodeURIComponent([student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") || student.user.name)}&background=0B1F4D&color=FFFFFF&size=160&bold=true`;
  const headerTemplate = student.school.branding?.reportHeaderText?.trim() || "{term} Report - {session}";
  const resolvedHeaderText = headerTemplate
    .replaceAll("{term}", result?.term.name ?? "Current Term")
    .replaceAll("{session}", result?.session.name ?? "Current Session");

  const attendanceRate = attendanceTotal > 0 ? (attendancePresent / attendanceTotal) * 100 : 0;
  const attendanceBands = classGroupProfile?.attendanceGradeBands?.length ? classGroupProfile.attendanceGradeBands : gradingKey;
  const attendanceMeta = calculateGradeFromBands(attendanceRate, attendanceBands);
  const domainBands = gradingKey;
  const cognitiveScore = parseNumericAssessmentScore(result?.cognitiveAssessment);
  const affectiveScore = parseNumericAssessmentScore(result?.affectiveAssessment);
  const psychomotorScore = parseNumericAssessmentScore(result?.psychomotorAssessment);
  const cognitiveGrade = cognitiveScore === null ? "-" : calculateGradeFromBands(cognitiveScore, domainBands).grade;
  const affectiveGrade = affectiveScore === null ? "-" : calculateGradeFromBands(affectiveScore, domainBands).grade;
  const psychomotorGrade = psychomotorScore === null ? "-" : calculateGradeFromBands(psychomotorScore, domainBands).grade;

  const reportStyle = {
    "--report-primary": isPrenurseryTemplate ? "#8B5E34" : themePrimary,
    "--report-secondary": isPrenurseryTemplate ? "#D97706" : themeSecondary,
  } as React.CSSProperties;

  if (result?.fileUrl) {
    const previewUrl = getCloudinaryInlineUrl(result.fileUrl);
    const downloadUrl = getCloudinaryDownloadUrl(result.fileUrl);
    return (
      <div className="p-4" style={reportStyle}>
        <div className="no-print mx-auto mb-3 flex max-w-[210mm] items-center justify-between">
          <p className="text-sm text-slate-600">Uploaded report: {result.fileName || "Result PDF"}</p>
          <div className="flex gap-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-[var(--report-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Download PDF
            </a>
            <Link
              href="/parent/children"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel Preview
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-[210mm] overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
          <iframe title="Uploaded result report" src={previewUrl} className="h-[90vh] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" style={reportStyle}>
      <div className="no-print mx-auto mb-3 flex max-w-[210mm] justify-end">
        <PrintButton />
      </div>
      <div className="print-sheet overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <div className={isPrenurseryTemplate ? "bg-gradient-to-r from-[#fff6e6] via-white to-[#eefaf4] px-6 py-5 text-slate-900" : "bg-[var(--report-primary)] px-6 py-5 text-white"}>
          <div className={isPrenurseryTemplate ? "grid gap-4 md:grid-cols-[1fr_auto] md:items-center" : "flex flex-wrap items-start justify-between gap-3"}>
            <div className={isPrenurseryTemplate ? "space-y-2" : ""}>
              <div className={isPrenurseryTemplate ? "inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--report-primary)]" : ""}>
                {reportTemplate.template?.name || (isPrenurseryTemplate ? "Prenursery" : "Primary")}
              </div>
              <h1 className={isPrenurseryTemplate ? "text-3xl font-semibold tracking-wide text-slate-900" : "text-2xl font-semibold tracking-wide"}>{student.school.name}</h1>
              <p className={isPrenurseryTemplate ? "max-w-2xl text-sm text-slate-600" : "text-sm text-white/90"}>
                {resolvedHeaderText || student.school.motto || "Comprehensive Term Report"}
              </p>
            </div>
            {schoolLogoUrl ? (
              <div className={isPrenurseryTemplate ? "rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" : "rounded-lg border border-white/30 bg-white/10 p-1"}>
                <Image src={schoolLogoUrl} alt={`${student.school.name} logo`} width={72} height={72} unoptimized className={isPrenurseryTemplate ? "h-16 w-16 rounded-xl object-contain" : "h-14 w-14 rounded bg-white object-contain p-1"} />
              </div>
            ) : null}
          </div>
          <p className={isPrenurseryTemplate ? "mt-3 inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-amber-800" : "mt-2 inline-block rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em]"}>
            Report Card • {result?.term.name ?? "-"} • {result?.session.name ?? "-"}
          </p>
          {!result ? <p className={isPrenurseryTemplate ? "mt-2 text-xs text-slate-500" : "mt-2 text-xs text-white/85"}>Result is pending approval and publishing by school management.</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-4 text-sm md:grid-cols-[132px_1fr_1fr]">
          <div className="rounded-lg border border-slate-300 bg-white p-1">
            <Image
              src={normalizedPassportUrl ?? fallbackPassport}
              alt={`${[student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") || student.user.name} passport`}
              width={320}
              height={380}
              unoptimized
              className="h-[122px] w-full rounded object-cover"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Student Profile</p>
            <p className="text-base font-semibold text-slate-900">{[student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") || student.user.name}</p>
            <p>Class: <strong>{student.class?.name ?? "-"}</strong></p>
            <p>Group: <strong>{student.class?.classGroup?.name ?? "-"}</strong></p>
            <p>Gender: <strong>{student.gender}</strong> • Age: <strong>{student.age}</strong></p>
            <p>Parent: <strong>{student.parent?.user.name ?? "-"}</strong></p>
            <p>Sport House: <strong>{student.sportHouse ?? "-"}</strong></p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Learning Profile</p>
            <p>Co-curricular: <strong>{student.coCurricular ?? "-"}</strong></p>
            <p>Responsibilities: <strong>{student.responsibilities ?? "-"}</strong></p>
            <p>Class Teacher: <strong>{student.teacher?.user.name ?? "-"}</strong></p>
            <p className="mt-2 text-xs text-slate-600">Generated: {formatDate(new Date())}</p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200">
              <div className="h-1.5 rounded-full bg-[var(--report-secondary)]" style={{ width: `${Math.max(8, Math.min(100, termPercentage))}%` }} />
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {isPrenurseryTemplate ? (
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                <p className="uppercase tracking-wide text-amber-700">Class Group Focus</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{student.class?.classGroup?.name ?? student.class?.name ?? "-"}</p>
                <p className="mt-1 text-slate-600">{reportTemplate.template?.level ?? "Prenursery"} template</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
                <p className="uppercase tracking-wide text-emerald-700">Attendance Grade</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{attendanceMeta.grade}</p>
                <p className="mt-1 text-slate-600">{attendanceRate.toFixed(1)}% attendance</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <p className="uppercase tracking-wide text-slate-500">Learning Snapshot</p>
                <p className="mt-1 text-slate-700">Cognitive: {cognitiveScore ?? result?.cognitiveAssessment ?? "-"}</p>
                <p className="text-slate-700">Affective: {affectiveScore ?? result?.affectiveAssessment ?? "-"}</p>
                <p className="text-slate-700">Psychomotor: {psychomotorScore ?? result?.psychomotorAssessment ?? "-"}</p>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-slate-300">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--report-primary)]/95 text-white">
                  <th className="border border-slate-300 p-2 text-left">Subject</th>
                  <th className="border border-slate-300 p-2">CA</th>
                  <th className="border border-slate-300 p-2">Exam</th>
                  <th className="border border-slate-300 p-2">Total</th>
                  <th className="border border-slate-300 p-2">Grade</th>
                  <th className="border border-slate-300 p-2">GPA</th>
                </tr>
              </thead>
              <tbody>
                {reportScores.map((score: any, index: number) => (
                  <tr key={score.id} className={index % 2 ? "bg-slate-50" : "bg-white"}>
                    <td className="border border-slate-300 p-2 font-medium text-slate-800">{score.subject.name}</td>
                    <td className="border border-slate-300 p-2 text-center">{score.caScore}</td>
                    <td className="border border-slate-300 p-2 text-center">{score.examScore}</td>
                    <td className="border border-slate-300 p-2 text-center font-semibold">{score.total}</td>
                    <td className="border border-slate-300 p-2 text-center">{score.grade}</td>
                    <td className="border border-slate-300 p-2 text-center">{score.gpa.toFixed(1)}</td>
                  </tr>
                ))}
                {!reportScores.length ? (
                  <tr>
                    <td className="border border-slate-300 p-3 text-center text-slate-500" colSpan={6}>No approved subject scores available for this report context.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className={isPrenurseryTemplate ? "mt-4 grid grid-cols-1 gap-3 md:grid-cols-3" : "mt-4 grid grid-cols-1 gap-3 md:grid-cols-5"}>
            <div className="rounded-lg border border-slate-300 bg-[#fff8db] p-3 text-center text-xs">
              <p className="text-slate-500">Cumulative</p>
              <p className="text-lg font-bold text-slate-900">{cumulativeTotal.toFixed(1)}</p>
            </div>
            <div className="rounded-lg border border-slate-300 bg-[#e8f7ff] p-3 text-center text-xs">
              <p className="text-slate-500">Average</p>
              <p className="text-lg font-bold text-slate-900">{average.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-slate-300 bg-[#edfce9] p-3 text-center text-xs">
              <p className="text-slate-500">Term Grade</p>
              <p className="text-lg font-bold text-slate-900">{result?.termGrade ?? "-"}</p>
            </div>
            <div className="rounded-lg border border-slate-300 bg-[#ffeef0] p-3 text-center text-xs">
              <p className="text-slate-500">Term %</p>
              <p className="text-lg font-bold text-slate-900">{termPercentage.toFixed(1)}</p>
            </div>
            <div className="rounded-lg border border-slate-300 bg-[#f1ecff] p-3 text-center text-xs">
              <p className="text-slate-500">Term GPA</p>
              <p className="text-lg font-bold text-slate-900">{termGpa.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-300 bg-white p-3 text-xs">
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-600">Promotion Status</p>
              <p className="text-sm font-semibold text-slate-900">{promotionStatus}</p>
            </div>
            <div className="rounded-lg border border-slate-300 bg-white p-3 text-xs">
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-600">Outstanding Fee Balance</p>
              <p className="text-sm font-semibold text-slate-900">{naira(feeBalance)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-300 bg-white p-3 text-xs">
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-600">Assessment Notes</p>
              <p>
                Cognitive: <strong>{cognitiveScore ?? result?.cognitiveAssessment ?? "-"}</strong>
                {cognitiveScore !== null ? ` (Grade ${cognitiveGrade})` : ""}
              </p>
              <p>
                Affective: <strong>{affectiveScore ?? result?.affectiveAssessment ?? "-"}</strong>
                {affectiveScore !== null ? ` (Grade ${affectiveGrade})` : ""}
              </p>
              <p>
                Psychomotor: <strong>{psychomotorScore ?? result?.psychomotorAssessment ?? "-"}</strong>
                {psychomotorScore !== null ? ` (Grade ${psychomotorGrade})` : ""}
              </p>
              <p className="mt-1">
                Attendance: <strong>{attendancePresent}/{attendanceTotal}</strong>
                {attendanceTotal > 0 ? ` (${attendanceRate.toFixed(1)}%, Grade ${attendanceMeta.grade})` : ""}
              </p>
              <p>Resumption: <strong>{result?.nextTermResumption ? formatDate(result.nextTermResumption) : "-"}</strong></p>
              <p className="mt-1 text-[11px] text-slate-500">
                CA/Exam policy: {classGroupProfile?.caWeight ?? 40}/{classGroupProfile?.examWeight ?? 60}
              </p>
            </div>

            <div className="rounded-lg border border-slate-300 bg-white p-3 text-xs">
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-600">Teacher & Principal Comments</p>
              <p><strong>Class Teacher:</strong> {result?.classTeacherComment ?? "-"}</p>
              <p className="mt-2"><strong>Principal:</strong> {result?.principalComment ?? "-"}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
              <p className="mb-1 font-semibold text-slate-700">Teacher Signature</p>
              {teacherSignatureUrl ? (
                <Image src={teacherSignatureUrl} alt="Teacher signature" width={170} height={48} unoptimized className="h-12 w-auto max-w-[170px] object-contain" />
              ) : (
                <p className="text-slate-500">Teacher signature not on file.</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
              <p className="mb-1 font-semibold text-slate-700">Head Signature</p>
              {principalSignatureUrl ? (
                <Image src={principalSignatureUrl} alt="Head signature" width={170} height={48} unoptimized className="h-12 w-auto max-w-[170px] object-contain" />
              ) : (
                <p className="text-slate-500">Head signature not on file.</p>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-xs">
            <p className="mb-1 font-semibold uppercase tracking-wide text-slate-600">School Stamp</p>
            {schoolStampUrl ? (
              <Image src={schoolStampUrl} alt="School stamp" width={64} height={64} unoptimized className="h-16 w-16 rounded object-contain" />
            ) : (
              <p className="text-slate-500">School stamp not on file.</p>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3 text-xs">
            <p className="mb-2 font-semibold uppercase tracking-wide text-slate-600">Grading Key</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {gradingKey.map((band) => (
                <div key={`${band.grade}-${band.min}`} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                  <p className="font-semibold text-slate-800">{band.grade}</p>
                  <p className="text-slate-600">{band.min}% and above • GPA {band.gpa.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-right text-xs text-slate-500">{APP_POWERED_BY}</p>
        </div>
      </div>
    </div>
  );
}
