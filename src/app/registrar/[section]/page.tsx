import { notFound } from "next/navigation";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guards";
import { getCurrentSchoolByUser, getUserAcademicContext } from "@/lib/data";
import { prisma } from "@/lib/db";
import { formatDate, humanizeEnum } from "@/lib/utils";

const allowed = ["applications", "admissions", "student-records", "class-placement", "parent-records", "documents", "id-cards"] as const;
type AllowedSection = (typeof allowed)[number];

const titles: Record<AllowedSection, string> = {
  applications: "New Applications",
  admissions: "Admissions Queue",
  "student-records": "Student Records",
  "class-placement": "Class Placement",
  "parent-records": "Parent Records",
  documents: "Documents",
  "id-cards": "ID Card Management",
};

const descriptions: Record<AllowedSection, string> = {
  applications: "Review and process new admission applications.",
  admissions: "Track applications through the admissions pipeline.",
  "student-records": "Search and manage enrolled student records.",
  "class-placement": "Assign and transfer students between classes.",
  "parent-records": "Manage parent/guardian profiles and linkages.",
  documents: "Issue and manage student documents.",
  "id-cards": "Generate and track student ID cards.",
};

export default async function RegistrarSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(allowed as readonly string[]).includes(section)) notFound();

  const user = await requireRole(["REGISTRAR"]);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  const profile = await getCurrentSchoolByUser(user.id);
  if (!profile?.schoolId || !profile.school) {
    return (
      <SetupRequiredScreen
        title="Account Setup Incomplete"
        message="Your registrar account is not linked to a school yet. Please contact the school admin to complete your profile linkage."
      />
    );
  }

  const context = await getUserAcademicContext(profile.schoolId, user.id);
  const schoolId = profile.schoolId;
  const sectionKey = section as AllowedSection;

  async function getSectionData() {
    switch (sectionKey) {
      case "applications":
      case "admissions": {
        const applications = await prisma.admissionApplication.findMany({
          where: { schoolId },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        return { applications };
      }
      case "student-records": {
        const students = await prisma.student.findMany({
          where: { schoolId },
          include: { user: { select: { name: true, email: true } }, class: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        return { students };
      }
      case "class-placement": {
        const [classes, classArms, students] = await Promise.all([
          prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
          prisma.classArm.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
          prisma.student.findMany({
            where: { schoolId },
            select: { id: true, firstName: true, lastName: true, classId: true, armId: true, user: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
        ]);
        return { classes, classArms, students };
      }
      case "parent-records": {
        const parents = await prisma.parent.findMany({
          where: { schoolId },
          include: { user: { select: { name: true, email: true, isActive: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        return { parents };
      }
      case "documents": {
        const documents = await prisma.studentDocument.findMany({
          where: { schoolId },
          include: { student: { select: { firstName: true, lastName: true, user: { select: { name: true } } } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        return { documents };
      }
      case "id-cards": {
        const students = await prisma.student.findMany({
          where: { schoolId, user: { isActive: true } },
          include: { user: { select: { name: true, email: true, avatarUrl: true } }, class: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        });
        return { students };
      }
      default:
        return {};
    }
  }

  const data = await getSectionData() as any;

  function renderSection() {
    switch (sectionKey) {
      case "applications":
      case "admissions": {
        const apps = data.applications || [];
        const pending = apps.filter((a: any) => a.status === "PENDING").length;
        const approved = apps.filter((a: any) => a.status === "APPROVED").length;
        const rejected = apps.filter((a: any) => a.status === "REJECTED").length;

        return (
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-3">
              <Card><CardContent className="p-3"><p className="text-xs text-slate-500">Pending</p><p className="text-lg font-semibold text-amber-600">{pending}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-xs text-slate-500">Approved</p><p className="text-lg font-semibold text-green-600">{approved}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-xs text-slate-500">Rejected</p><p className="text-lg font-semibold text-red-600">{rejected}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Application List</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {apps.length ? apps.map((app: any) => (
                  <div key={app.id} className="glass-soft rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{app.firstName} {app.lastName}</p>
                        <p className="text-xs text-slate-500">
                          Applied: {formatDate(app.createdAt)} • {app.email}
                          {app.applyingForClassId ? ` • Class ID: ${app.applyingForClassId}` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        app.status === "APPROVED" ? "bg-green-100 text-green-700" :
                        app.status === "REJECTED" ? "bg-red-100 text-red-700" :
                        app.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {humanizeEnum(app.status)}
                      </span>
                    </div>
                  </div>
                )) : <p className="text-slate-500">No applications submitted yet.</p>}
              </CardContent>
            </Card>
          </div>
        );
      }

      case "student-records": {
        const students = data.students || [];
        return (
          <Card>
            <CardHeader><CardTitle>Enrolled Students ({students.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {students.length ? students.map((s: any) => (
                <div key={s.id} className="glass-soft rounded-xl p-3">
                  <p className="font-medium">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-slate-500">
                    {s.user?.email ?? "No email"} • Class: {s.class?.name ?? "Unassigned"}
                    {!s.isActive ? " • Inactive" : ""}
                  </p>
                </div>
              )) : <p className="text-slate-500">No students enrolled yet.</p>}
            </CardContent>
          </Card>
        );
      }

      case "class-placement": {
        const classes = data.classes || [];
        const classArms = data.classArms || [];
        const students = data.students || [];
        return (
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <Card><CardContent className="p-3"><p className="text-xs text-slate-500">Classes</p><p className="text-lg font-semibold">{classes.length}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-xs text-slate-500">Class Arms</p><p className="text-lg font-semibold">{classArms.length}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Class Rosters</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {classes.length ? classes.map((cls: any) => {
                  const classStudents = students.filter((s: any) => s.classId === cls.id);
                  return (
                    <div key={cls.id} className="glass-soft rounded-xl p-3">
                      <p className="font-medium">{cls.name} <span className="text-xs text-slate-500">({classStudents.length} students)</span></p>
                      {classStudents.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {classStudents.slice(0, 10).map((s: any) => (
                            <p key={s.id} className="text-xs text-slate-600">
                              {s.firstName} {s.lastName} {s.armId ? `(Arm: ${classArms.find((a: any) => a.id === s.armId)?.name ?? "-"})` : ""}
                            </p>
                          ))}
                          {classStudents.length > 10 && <p className="text-xs text-slate-400">…and {classStudents.length - 10} more</p>}
                        </div>
                      )}
                    </div>
                  );
                }) : <p className="text-slate-500">No classes configured.</p>}
              </CardContent>
            </Card>
          </div>
        );
      }

      case "parent-records": {
        const parents = data.parents || [];
        return (
          <Card>
            <CardHeader><CardTitle>Parent/Guardian Records ({parents.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {parents.length ? parents.map((p: any) => (
                <div key={p.id} className="glass-soft rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{p.user?.name ?? "Unknown"}</p>
                      <p className="text-xs text-slate-500">{p.user?.email ?? "No email"} • {p.phone ?? "No phone"}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.user?.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {p.user?.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              )) : <p className="text-slate-500">No parent records found.</p>}
            </CardContent>
          </Card>
        );
      }

      case "documents": {
        const documents = data.documents || [];
        return (
          <Card>
            <CardHeader><CardTitle>Student Documents ({documents.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {documents.length ? documents.map((d: any) => (
                <div key={d.id} className="glass-soft rounded-xl p-3">
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-slate-500">
                    Student: {d.student?.firstName} {d.student?.lastName} • Type: {d.documentType} • {formatDate(d.createdAt)}
                  </p>
                  {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 underline">View file</a>}
                  {d.status && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{d.status}</span>}
                </div>
              )) : <p className="text-slate-500">No documents issued yet.</p>}
            </CardContent>
          </Card>
        );
      }

      case "id-cards": {
        const students = data.students || [];
        return (
          <Card>
            <CardHeader><CardTitle>Active Students ({students.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {students.length ? students.map((s: any) => (
                <div key={s.id} className="glass-soft rounded-xl p-3 flex items-center gap-3">
                  {s.user?.avatarUrl ? (
                    <img src={s.user.avatarUrl} alt={s.user.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                      {(s.firstName?.[0] ?? s.user?.name?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-slate-500">{s.class?.name ?? "No class"} • {s.user?.email ?? "No email"}</p>
                  </div>
                </div>
              )) : <p className="text-slate-500">No active students found.</p>}
            </CardContent>
          </Card>
        );
      }
    }
  }

  const totalCount: number = (() => {
    switch (sectionKey) {
      case "applications":
      case "admissions":
        return data.applications?.length ?? 0;
      case "student-records":
        return data.students?.length ?? 0;
      case "class-placement":
        return data.classes?.length ?? 0;
      case "parent-records":
        return data.parents?.length ?? 0;
      case "documents":
        return data.documents?.length ?? 0;
      case "id-cards":
        return data.students?.length ?? 0;
      default:
        return 0;
    }
  })();

  return (
    <ModernPortalShell
      role={user.role}
      schoolName={profile.school?.name}
      schoolLogoUrl={profile.school?.branding?.logoUrl ?? undefined}
      userName={user.name ?? "Registrar"}
      avatarUrl={dbUser?.avatarUrl ?? undefined}
      pathname={`/registrar/${section}`}
      primaryColor={profile.school?.branding?.primaryColor}
      secondaryColor={profile.school?.branding?.secondaryColor}
    >
      <Card>
        <CardHeader><CardTitle>{titles[sectionKey]}</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-600">{descriptions[sectionKey]}</CardContent>
      </Card>

      <section className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Total Records</p><p className="text-lg sm:text-xl font-semibold">{totalCount}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Session</p><p className="text-lg sm:text-xl font-semibold truncate">{context.session?.name ?? "-"}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">Term</p><p className="text-lg sm:text-xl font-semibold truncate">{context.term?.name ?? "-"}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-slate-500">School</p><p className="text-lg sm:text-xl font-semibold truncate">{profile.school?.name ?? "-"}</p></CardContent></Card>
      </section>

      {renderSection()}
    </ModernPortalShell>
  );
}
