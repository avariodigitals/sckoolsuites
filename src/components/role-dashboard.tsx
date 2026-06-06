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
import { getCoreSchoolDataByContext, getCurrentSchoolByUser, getUserAcademicContext } from "@/lib/data";
import { buildSchoolRoleModel, buildSuperAdminModel, type RoleScope } from "@/lib/dashboard/role-dashboard-model";
import { prisma } from "@/lib/db";
import { getSetupWizardState } from "@/lib/setup-wizard";
import { assignSchoolToUser } from "@/app/admin/actions";

const roleAliases: Record<RoleScope, string[]> = {
  superadmin: ["SUPER_ADMIN"],
  admin: ["SCHOOL_ADMIN", "PRINCIPAL"],
  teacher: ["TEACHER"],
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
    const schools = await prisma.school.findMany({
      include: {
        users: true,
        students: true,
        teachers: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = schools.reduce((sum: number, school: any) => sum + (school.payments?.reduce((acc: number, payment: any) => acc + payment.amount, 0) || 0), 0);
    const totalTeachers = schools.reduce((sum, school) => sum + school.teachers.length, 0);
    const totalStudents = schools.reduce((sum, school) => sum + school.students.length, 0);
    const activeSchools = schools.filter((s) => s.isActive).length;

    const model = buildSuperAdminModel({
      schools,
      totalRevenue,
      totalTeachers,
      totalStudents,
    });

    return (
      <ModernPortalShell role={user.role} userName={user.name ?? "Super Admin"} pathname={pathname}>
        <DashboardHeader title={model.title} subtitle={model.subtitle} />
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard title="Total Schools" value={schools.length} iconName="bookOpen" />
          <StatCard title="Active Subscriptions" value={activeSchools} iconName="calendar" />
          <StatCard title="Total Students" value={totalStudents} iconName="graduationCap" />
          <StatCard title="Total Revenue" value={`₦${totalRevenue.toLocaleString()}`} iconName="dollarSign" />
        </div>

        {/* Create School Prompt - If no schools exist */}
        {schools.length === 0 && (
          <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-indigo-100 p-3">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-indigo-900">Set Up Your School</h3>
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
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Your Schools</h3>
              <Link 
                href="/admin/settings/school" 
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                + Add School
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {schools.map((school) => (
                <div key={school.id} className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">{school.name}</h4>
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
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
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

        <div className="grid gap-4 lg:grid-cols-3 mb-6">
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
  
  // If no session or term, redirect to setup wizard
  if (!context.session || !context.term) {
    redirect("/setup");
  }
  
  const core = await getCoreSchoolDataByContext(profile.schoolId, {
    sessionId: context.session?.id,
    termId: context.term?.id,
  });

  // Fetch reception data for admin dashboard
  const [enquiryCount, visitorCount, gatePassCount, complaintCount] = await Promise.all([
    prisma.enquiry.count({ where: { schoolId: profile.schoolId } }),
    prisma.visitor.count({ where: { schoolId: profile.schoolId, status: "CHECKED_IN" } }),
    prisma.gatePass.count({ where: { schoolId: profile.schoolId, status: "ACTIVE" } }),
    prisma.receptionComplaint.count({ where: { schoolId: profile.schoolId, status: "OPEN" } }),
  ]);

  // If Super Admin has school, treat as admin for dashboard model
  const effectiveRole = superAdminWithSchool ? "admin" : roleScope;
  const model = buildSchoolRoleModel(effectiveRole as Exclude<RoleScope, "superadmin">, core);
  const setup = (roleScope === "admin" || superAdminWithSchool) ? await getSetupWizardState(profile.schoolId) : null;

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
        pathname={pathname}
      >
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
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
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
            incomeData={[
              { date: "Week 1", income: 450000, expenses: 180000 },
              { date: "Week 2", income: 520000, expenses: 220000 },
              { date: "Week 3", income: 480000, expenses: 200000 },
              { date: "Week 4", income: 610000, expenses: 250000 },
            ]}
            feeComponents={[
              { name: "Tuition Fee", value: 1250000 },
              { name: "Development Levy", value: 320000 },
              { name: "Textbooks", value: 180000 },
              { name: "Sports & Extra", value: 150000 },
              { name: "Technology Fee", value: 110000 },
              { name: "Others", value: 60000 },
            ]}
          />
        )}

        {/* Reception Overview - Only for Admin */}
        {roleScope === "admin" && (
          <div className="mb-6">
            <SectionCard title="Reception Overview" action={{ label: "View Details", href: "/admin/reception" }}>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-sm text-blue-600 font-medium">Total Enquiries</p>
                  <p className="text-2xl font-bold text-blue-900">{enquiryCount}</p>
                  <Link href="/admin/reception/enquiry" className="text-xs text-blue-600 hover:underline">View all →</Link>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-sm text-amber-600 font-medium">Visitors Checked In</p>
                  <p className="text-2xl font-bold text-amber-900">{visitorCount}</p>
                  <Link href="/admin/reception" className="text-xs text-amber-600 hover:underline">View log →</Link>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-sm text-emerald-600 font-medium">Active Gate Passes</p>
                  <p className="text-2xl font-bold text-emerald-900">{gatePassCount}</p>
                  <Link href="/admin/reception/gate-pass" className="text-xs text-emerald-600 hover:underline">Manage →</Link>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-sm text-red-600 font-medium">Open Complaints</p>
                  <p className="text-2xl font-bold text-red-900">{complaintCount}</p>
                  <Link href="/admin/reception/complaint" className="text-xs text-red-600 hover:underline">Resolve →</Link>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
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
