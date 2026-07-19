import Link from "next/link";
import { redirect } from "next/navigation";
import { ModernPortalShell } from "@/components/modern-portal-shell";
import { SetupRequiredScreen } from "@/components/setup-required-screen";
import { DashboardAnalytics } from "@/components/dashboard-analytics";
import { 
  DashboardHeader,
  StatCard,
  QuickAction,
  SectionCard,
  ActivityItem,
  EmptyState 
} from "@/components/modern-dashboard";
import { requireRole } from "@/lib/auth-guards";
import { getDashboardData, getCoreSchoolDataByContext, getCurrentSchoolByUser, getUserAcademicContext } from "@/lib/data";
import { buildSchoolRoleModel, buildSuperAdminModel, type RoleScope } from "@/lib/dashboard/role-dashboard-model";
import { prisma } from "@/lib/db";
import { getSetupWizardState } from "@/lib/setup-wizard";
import { assignSchoolToUser } from "@/app/admin/actions";

const roleAliases: Record<RoleScope, string[]> = {
  superadmin: ["SUPER_ADMIN"],
  admin: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"],
  teacher: ["TEACHER", "CLASS_ASSISTANT"],
  accountant: ["ACCOUNTANT"],
  parent: ["PARENT"],
  student: ["STUDENT"],
  registrar: ["REGISTRAR"],
};

export async function RoleDashboard({ roleScope, pathname }: { roleScope: RoleScope; pathname: string }) {
  const user = await requireRole(roleAliases[roleScope]);

  // If Super Admin has a school assigned, treat them as school admin
  const superAdminWithSchool = roleScope === "superadmin" && "default";

  // If Super Admin has no school, redirect to setup wizard
  if (roleScope === "superadmin" && !superAdminWithSchool) {
    const schools = await prisma.school.findMany({ take: 1 });
    if (schools.length === 0) {
      redirect("/setup");
    }
  }

  if (roleScope === "superadmin" && !superAdminWithSchool) {
    const [schools, dbUser] = await Promise.all([
      prisma.school.findMany({
        include: {
          users: true,
          students: true,
          teachers: true,
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } }),
    ]);

    const totalRevenue = schools.reduce((sum: number, school: any) => sum + (school.payments?.reduce((acc: number, payment: any) => acc + payment.amount, 0) || 0), 0);
    const totalTeachers = schools.reduce((sum: any, school: any) => sum + school.teachers.length, 0);
    const totalStudents = schools.reduce((sum: any, school: any) => sum + school.students.length, 0);
    const activeSchools = schools.filter((s: any) => s.isActive).length;

    const model = buildSuperAdminModel({
      schools,
      totalRevenue,
      totalTeachers,
      totalStudents,
    });

    return (
      <ModernPortalShell role={user.role} userName={user.name ?? "Super Admin"} avatarUrl={dbUser?.avatarUrl ?? undefined} pathname={pathname}>
        <DashboardHeader title={model.title} subtitle={model.subtitle} />
        
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
          <StatCard title="Total Schools" value={schools.length} iconName="bookOpen" />
          <StatCard title="Active Subscriptions" value={activeSchools} iconName="calendar" />
          <StatCard title="Total Students" value={totalStudents} iconName="graduationCap" />
          <StatCard title="Total Revenue" value={`₦${totalRevenue.toLocaleString()}`} iconName="dollarSign" />
        </div>

        {/* Create School Prompt - If no schools exist */}
        {schools.length === 0 && (
          <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="rounded-full bg-indigo-100 p-2.5 sm:p-3 shrink-0">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-indigo-900">Set Up Your School</h3>
                <p className="mt-1 text-sm text-indigo-700">
                  You are logged in as Super Admin. To start using the system, create your school first. 
                  Once created, you can manage students, teachers, classes, fees, and all other features.
                </p>
                <Link 
                  href="/admin/settings/school" 
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Create School Now
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Manage Schools Section - If schools exist */}
        {schools.length > 0 && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Your Schools</h3>
              <Link 
                href="/admin/settings/school" 
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium shrink-0"
              >
                + Add School
              </Link>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {schools.map((school: any) => (
                <div key={school.id} className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{school.name}</h4>
                      <p className="text-sm text-slate-500">{school.students.length} students • {school.teachers.length} teachers</p>
                      <span className={`inline-flex mt-2 px-2 py-1 text-xs rounded-full ${school.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {school.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        await assignSchoolToUser(school.id);
                        redirect("/admin/dashboard");
                      }}
                    >
                      <button
                        type="submit"
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium shrink-0"
                      >
                        Manage →
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Click &quot;Manage&quot; to access full school features (students, classes, fees, etc.)
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3 mb-4 sm:mb-6">
          <SectionCard title="Quick Actions" action={{ label: "View All", href: "/super-admin/dashboard" }}>
            <div className="space-y-3">
              <QuickAction title="Add New School" description="Onboard a new institution" href="/admin/settings/school" iconName="bookOpen" color="indigo" />
              <QuickAction title="Manage Plans" description="Configure subscription plans" href="/super-admin/dashboard" iconName="settings" color="emerald" />
              <QuickAction title="View Billing" description="Check revenue and payments" href="/super-admin/dashboard" iconName="dollarSign" color="amber" />
            </div>
          </SectionCard>
          
          <SectionCard title="Recent Activity">
            {model.activities.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {model.activities.slice(0, 5).map((activity) => (
                  <ActivityItem key={activity.id} title={activity.title} description={activity.detail} time={activity.time} />
                ))}
              </div>
            ) : (
              <EmptyState message="No recent activity" />
            )}
          </SectionCard>
          
          <SectionCard title="Tasks">
            <div className="space-y-3">
              {model.tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                  <div className="h-2 w-2 mt-2 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">{task.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </ModernPortalShell>
    );
  }

  const profile = await getCurrentSchoolByUser(user.id);
  if (!profile?.schoolId) {
    return (
      <SetupRequiredScreen
        title="Session Out Of Sync"
        message="Your account session is active, but your user record could not be found or is not linked to a school. Please sign out and log in again."
        actionHref="/login"
        actionLabel="Sign in again"
        actionMode="signout"
      />
    );
  }

  const context = await getUserAcademicContext(profile.schoolId, user.id);

  // For teacher role, use getCoreSchoolDataByContext which returns full arrays
  // (subjects, lessons, assignments, classes, etc.) needed by buildSchoolRoleModel.
  // getDashboardData only returns counts for these, resulting in an empty dashboard.
  const isTeacherRole = roleScope === "teacher";

  const core = isTeacherRole
    ? await getCoreSchoolDataByContext(profile.schoolId, {
        sessionId: context.session?.id ?? undefined,
        termId: context.term?.id ?? undefined,
      })
    : await getDashboardData(profile.schoolId, {
        sessionId: context.session?.id ?? undefined,
        termId: context.term?.id ?? undefined,
      });

  // For teachers, filter the school-wide data to only their assigned records
  // so the dashboard shows teacher-specific stats, not school-wide totals.
  if (isTeacherRole) {
    const teacher = (core as any).teachers?.find((t: any) => t.userId === user.id);
    if (teacher) {
      const myClasses = ((core as any).classes ?? []).filter((c: any) => c.teacherId === teacher.id);
      const classIds = new Set(myClasses.map((c: any) => c.id));
      const mySubjects = ((core as any).subjects ?? []).filter(
        (s: any) => s.teacherId === teacher.id || (s.classId ? classIds.has(s.classId) : false)
      );
      const subjectIds = new Set(mySubjects.map((s: any) => s.id));
      const myScores = ((core as any).scores ?? []).filter((s: any) => subjectIds.has(s.subjectId));
      const myLessons = ((core as any).lessons ?? []).filter((l: any) => l.teacherId === teacher.id);
      const myAssignments = ((core as any).assignments ?? []).filter(
        (a: any) => a.subjectId && subjectIds.has(a.subjectId)
      );
      const myAttendance = ((core as any).attendance ?? []).filter(
        (a: any) => a.classId && classIds.has(a.classId)
      );
      const myStudents = ((core as any).students ?? []).filter(
        (s: any) => s.classId && classIds.has(s.classId)
      );

      (core as any).classes = myClasses;
      (core as any).subjects = mySubjects;
      (core as any).scores = myScores;
      (core as any).lessons = myLessons;
      (core as any).assignments = myAssignments;
      (core as any).attendance = myAttendance;
      (core as any).students = myStudents;
      (core as any).classCount = myClasses.length;
      (core as any).subjectCount = mySubjects.length;
      (core as any).studentCount = myStudents.length;
    }
  }

  // Fetch reception data for admin dashboard only
  let enquiryCount = 0;
  let visitorCount = 0;
  let gatePassCount = 0;
  let complaintCount = 0;

  if (roleScope === "admin" || superAdminWithSchool) {
    [enquiryCount, visitorCount, gatePassCount, complaintCount] = await Promise.all([
      prisma.enquiry.count({ where: { schoolId: profile.schoolId } }),
      prisma.visitor.count({ where: { schoolId: profile.schoolId, status: "CHECKED_IN" } }),
      prisma.gatePass.count({ where: { schoolId: profile.schoolId, status: "ACTIVE" } }),
      prisma.receptionComplaint.count({ where: { schoolId: profile.schoolId, status: "OPEN" } }),
    ]);
  }

  // Fetch real income/expense data for current month (admin only)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let incomeData: Array<{ date: string; income: number; expenses: number }> = [];
  let feeComponents: Array<{ name: string; value: number }> = [];

  if (roleScope === "admin" || superAdminWithSchool) {
    const [incomeRecords, expenseRecords, feeItems] = await Promise.all([
      prisma.income.findMany({
        where: { schoolId: profile.schoolId, date: { gte: startOfMonth, lte: endOfMonth } },
        orderBy: { date: "asc" },
      }),
      prisma.expense.findMany({
        where: { schoolId: profile.schoolId, date: { gte: startOfMonth, lte: endOfMonth } },
        orderBy: { date: "asc" },
      }),
      prisma.feeItem.findMany({ where: { schoolId: profile.schoolId } }),
    ]);

    // Group income/expense by date for chart
    const dateKey = (d: Date) => `${d.getDate()}`;
    const incomeByDate = new Map<string, number>();
    const expensesByDate = new Map<string, number>();

    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      incomeByDate.set(String(i), 0);
      expensesByDate.set(String(i), 0);
    }

    incomeRecords.forEach((r: any) => {
      const k = dateKey(new Date(r.date));
      incomeByDate.set(k, (incomeByDate.get(k) || 0) + Number(r.amount));
    });
    expenseRecords.forEach((r: any) => {
      const k = dateKey(new Date(r.date));
      expensesByDate.set(k, (expensesByDate.get(k) || 0) + Number(r.amount));
    });

    incomeData = Array.from(incomeByDate.entries())
      .map(([date, income]) => ({ date, income, expenses: expensesByDate.get(date) || 0 }))
      .filter((d) => d.income > 0 || d.expenses > 0);

    feeComponents = feeItems.length > 0
      ? feeItems.map((item: any) => ({ name: item.name, value: Number(item.amount) })).sort((a: any, b: any) => b.value - a.value)
      : [];
  }

  // For parents, filter data to only their children
  if (roleScope === "parent") {
    const parent = await prisma.parent.findFirst({
      where: { schoolId: profile.schoolId, userId: user.id },
    });
    if (parent) {
      const myChildren = await prisma.student.findMany({
        where: { schoolId: profile.schoolId, parentId: parent.id },
        include: { user: true, class: true },
        orderBy: { createdAt: "desc" },
      });
      const childIds = new Set(myChildren.map((s: any) => s.id));

      (core as any).students = myChildren;
      (core as any).studentCount = myChildren.length;
      (core as any).scores = ((core as any).scores ?? []).filter((s: any) => childIds.has(s.studentId));
      (core as any).attendance = ((core as any).attendance ?? []).filter((a: any) => childIds.has(a.studentId));
      (core as any).bills = ((core as any).bills ?? []).filter((b: any) => childIds.has(b.studentId));
      (core as any).payments = ((core as any).payments ?? []).filter((p: any) => childIds.has(p.studentId));
    }
  }

  // If Super Admin has school, treat as admin for dashboard model
  const effectiveRole = superAdminWithSchool ? "admin" : roleScope;
  const model = buildSchoolRoleModel(effectiveRole as Exclude<RoleScope, "superadmin">, core);
  const setup = (roleScope === "admin" || superAdminWithSchool) ? await getSetupWizardState(profile.schoolId) : null;

  // Personalize title for parent role with time-based greeting
  if (roleScope === "parent" && model) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : hour < 21 ? "Good Evening" : "Good Night";
    const parentName = user.name?.trim() ?? "there";
    const titlePrefix = "Parent";
    model.title = `${greeting}, ${titlePrefix} ${parentName}`;
    model.subtitle = "Track child performance, fee balances, and school communication.";
  }

  // Ensure model has required fields
  if (!model || !model.title) {
    return (
      <SetupRequiredScreen
        title="Dashboard Error"
        message="Unable to load dashboard data. Please try again or contact support."
        actionHref="/admin/dashboard"
        actionLabel="Refresh"
      />
    );
  }

    return (
      <ModernPortalShell
        role={user.role}
        schoolName={core.school?.name}
        schoolLogoUrl={core.school?.branding?.logoUrl ?? undefined}
        userName={user.name ?? "User"}
        avatarUrl={profile?.avatarUrl ?? undefined}
        pathname={pathname}
        primaryColor={core.school?.branding?.primaryColor}
        secondaryColor={core.school?.branding?.secondaryColor}
      >
        {roleScope === "admin" && (!context.session || !context.term) && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="font-semibold text-rose-900">No Active Academic Session or Term</p>
            <p className="mt-1 text-sm text-rose-700">You must create and select an academic session and term before the dashboard can display data.</p>
            <Link href="/admin/setup" className="mt-3 inline-flex rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
              Go to Setup
            </Link>
          </div>
        )}

        {roleScope === "admin" && setup && !setup.status.setupCompleted && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">School setup is not complete.</p>
            <p className="mt-1 text-sm text-amber-700">Complete all setup steps before running full billing and result publishing workflows. Current progress: {setup.completionPercentage}%.</p>
            <Link href="/admin/setup" className="mt-3 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
              Continue Setup Wizard
            </Link>
          </div>
        )}
        
        <DashboardHeader title={model.title} subtitle={model.subtitle} />
        
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
          {model.stats.slice(0, 4).map((stat) => (
            <StatCard 
              key={stat.label}
              title={stat.label} 
              value={stat.value} 
              iconName={stat.label.toLowerCase().includes("student") ? "graduationCap" : stat.label.toLowerCase().includes("teacher") ? "users" : stat.label.toLowerCase().includes("bill") ? "dollarSign" : "bookOpen"}
            />
          ))}
        </div>

        {/* Financial Analytics Charts */}
        {roleScope === "admin" && (
          <DashboardAnalytics
            incomeData={incomeData.length > 0 ? incomeData : [{ date: "No data", income: 0, expenses: 0 }]}
            feeComponents={feeComponents.length > 0 ? feeComponents : [{ name: "No fees configured", value: 0 }]}
          />
        )}

        {/* Reception Overview - Only for Admin */}
        {roleScope === "admin" && (
          <div className="mb-6">
            <SectionCard title="Reception Overview" action={{ label: "View Details", href: "/admin/reception" }}>
              <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="p-3 sm:p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs sm:text-sm text-blue-600 font-medium truncate">Total Enquiries</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900">{enquiryCount}</p>
                  <Link href="/admin/reception/enquiry" className="text-xs text-blue-600 hover:underline">View all →</Link>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs sm:text-sm text-amber-600 font-medium truncate">Visitors Checked In</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-900">{visitorCount}</p>
                  <Link href="/admin/reception" className="text-xs text-amber-600 hover:underline">View log →</Link>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-xs sm:text-sm text-emerald-600 font-medium truncate">Active Gate Passes</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-900">{gatePassCount}</p>
                  <Link href="/admin/reception/gate-pass" className="text-xs text-emerald-600 hover:underline">Manage →</Link>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-xs sm:text-sm text-red-600 font-medium truncate">Open Complaints</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-900">{complaintCount}</p>
                  <Link href="/admin/reception/complaint" className="text-xs text-red-600 hover:underline">Resolve →</Link>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          <SectionCard title="Quick Actions">
            <div className="space-y-3">
              {model.quickActions.slice(0, 4).map((action) => (
                <QuickAction 
                  key={action.label}
                  title={action.label} 
                  description={`Go to ${action.label.toLowerCase()}`}
                  href={action.href}
                  iconName="bookOpen"
                />
              ))}
            </div>
          </SectionCard>
          
          <SectionCard title="Recent Activity">
            {model.activities.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {model.activities.slice(0, 5).map((activity) => (
                  <ActivityItem key={activity.id} title={activity.title} description={activity.detail} time={activity.time} />
                ))}
              </div>
            ) : (
              <EmptyState message="No recent activity" />
            )}
          </SectionCard>
          
          <SectionCard title="Tasks">
            <div className="space-y-3">
              {model.tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                  <div className="h-2 w-2 mt-2 rounded-full bg-indigo-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">{task.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </ModernPortalShell>
    );
}
