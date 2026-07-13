import { prisma } from "./db";

function humanizeRoleName(name: string) {
  return name
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function seedRoles() {
  const roleNames = Object.keys(DEFAULT_ROLE_PRIVILEGES);
  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: {
        name,
        label: humanizeRoleName(name),
        description: `Default ${humanizeRoleName(name)} role`,
      },
    });
  }
}

// All available privileges in the system
// When new features are added, register their privilege codes here
export const ALL_PRIVILEGES = [
  // Students
  { code: "students.view", name: "View Students", category: "students" },
  { code: "students.manage", name: "Manage Students", category: "students" },
  // Parents
  { code: "parents.view", name: "View Parents", category: "parents" },
  { code: "parents.manage", name: "Manage Parents", category: "parents" },
  // Teachers
  { code: "teachers.view", name: "View Teachers", category: "teachers" },
  { code: "teachers.manage", name: "Manage Teachers", category: "teachers" },
  // Classes & Academic
  { code: "classes.view", name: "View Classes", category: "academic" },
  { code: "classes.manage", name: "Manage Classes", category: "academic" },
  { code: "subjects.view", name: "View Subjects", category: "academic" },
  { code: "subjects.manage", name: "Manage Subjects", category: "academic" },
  { code: "sessions.view", name: "View Sessions", category: "academic" },
  { code: "sessions.manage", name: "Manage Sessions", category: "academic" },
  { code: "terms.view", name: "View Terms", category: "academic" },
  { code: "terms.manage", name: "Manage Terms", category: "academic" },
  // Attendance
  { code: "attendance.view", name: "View Attendance", category: "attendance" },
  { code: "attendance.manage", name: "Manage Attendance", category: "attendance" },
  // Results
  { code: "results.view", name: "View Results", category: "results" },
  { code: "results.manage", name: "Manage Results", category: "results" },
  // Assessments
  { code: "assessments.view", name: "View Assessments", category: "academic" },
  { code: "assessments.manage", name: "Manage Assessments", category: "academic" },
  // Admissions
  { code: "admissions.view", name: "View Admissions", category: "admissions" },
  { code: "admissions.manage", name: "Manage Admissions", category: "admissions" },
  // Reception
  { code: "reception.view", name: "View Reception", category: "reception" },
  { code: "reception.manage", name: "Manage Reception", category: "reception" },
  // Branding
  { code: "branding.view", name: "View Branding", category: "settings" },
  { code: "branding.manage", name: "Manage Branding", category: "settings" },
  // Templates
  { code: "templates.view", name: "View Templates", category: "settings" },
  { code: "templates.manage", name: "Manage Templates", category: "settings" },
  // LMS
  { code: "lms.view", name: "View LMS", category: "lms" },
  { code: "lms.manage", name: "Manage LMS", category: "lms" },
  // Finance
  { code: "fees.view", name: "View Fees", category: "finance" },
  { code: "fees.manage", name: "Manage Fees", category: "finance" },
  { code: "bills.view", name: "View Bills", category: "finance" },
  { code: "bills.manage", name: "Manage Bills", category: "finance" },
  { code: "payments.view", name: "View Payments", category: "finance" },
  { code: "payments.manage", name: "Manage Payments", category: "finance" },
  { code: "income.view", name: "View Income", category: "finance" },
  { code: "income.manage", name: "Manage Income", category: "finance" },
  { code: "expenses.view", name: "View Expenses", category: "finance" },
  { code: "expenses.manage", name: "Manage Expenses", category: "finance" },
  { code: "debtors.view", name: "View Debtors", category: "finance" },
  { code: "ledger.view", name: "View Ledger", category: "finance" },
  { code: "revenue.view", name: "View Revenue", category: "finance" },
  // Communication
  { code: "announcements.view", name: "View Announcements", category: "communication" },
  { code: "announcements.manage", name: "Manage Announcements", category: "communication" },
  // Transport
  { code: "transport.view", name: "View Transport", category: "transport" },
  { code: "transport.manage", name: "Manage Transport", category: "transport" },
  // Settings
  { code: "settings.view", name: "View Settings", category: "settings" },
  { code: "settings.manage", name: "Manage Settings", category: "settings" },
  // User Management
  { code: "users.view", name: "View Users", category: "users" },
  { code: "users.manage", name: "Manage Users", category: "users" },
  { code: "roles.view", name: "View Roles", category: "users" },
  { code: "roles.manage", name: "Manage Roles", category: "users" },
  { code: "privileges.view", name: "View Privileges", category: "users" },
  { code: "privileges.manage", name: "Manage Privileges", category: "users" },
  // Profile
  { code: "profile.view", name: "View Profile", category: "profile" },
  { code: "profile.edit", name: "Edit Profile", category: "profile" },
  { code: "profile.change_password", name: "Change Password", category: "profile" },
] as const;

export type PrivilegeCode = (typeof ALL_PRIVILEGES)[number]["code"];

// Default role privileges mapping
export const DEFAULT_ROLE_PRIVILEGES: Record<string, string[]> = {
  SUPER_ADMIN: ALL_PRIVILEGES.map((p) => p.code),
  SCHOOL_ADMIN: [
    "students.view", "students.manage",
    "parents.view", "parents.manage",
    "teachers.view", "teachers.manage",
    "classes.view", "classes.manage",
    "subjects.view", "subjects.manage",
    "sessions.view", "sessions.manage",
    "terms.view", "terms.manage",
    "attendance.view", "attendance.manage",
    "results.view", "results.manage",
    "assessments.view", "assessments.manage",
    "admissions.view", "admissions.manage",
    "reception.view", "reception.manage",
    "branding.view", "branding.manage",
    "templates.view", "templates.manage",
    "lms.view", "lms.manage",
    "fees.view", "fees.manage",
    "bills.view", "bills.manage",
    "payments.view", "payments.manage",
    "income.view", "income.manage",
    "expenses.view", "expenses.manage",
    "debtors.view", "ledger.view", "revenue.view",
    "announcements.view", "announcements.manage",
    "transport.view", "transport.manage",
    "settings.view", "settings.manage",
    "users.view", "users.manage",
    "roles.view", "roles.manage",
    "privileges.view", "privileges.manage",
    "profile.view", "profile.edit", "profile.change_password",
  ],
  PRINCIPAL: [
    "students.view", "students.manage",
    "parents.view", "parents.manage",
    "teachers.view", "teachers.manage",
    "classes.view", "classes.manage",
    "subjects.view", "subjects.manage",
    "sessions.view", "terms.view",
    "attendance.view", "attendance.manage",
    "results.view", "results.manage",
    "assessments.view", "assessments.manage",
    "admissions.view", "admissions.manage",
    "reception.view", "reception.manage",
    "branding.view", "branding.manage",
    "templates.view", "templates.manage",
    "lms.view", "lms.manage",
    "fees.view", "bills.view", "payments.view",
    "income.view", "expenses.view", "debtors.view", "ledger.view", "revenue.view",
    "announcements.view", "announcements.manage",
    "transport.view",
    "settings.view",
    "users.view",
    "roles.view",
    "privileges.view",
    "profile.view", "profile.edit", "profile.change_password",
  ],
  HEAD_OF_SCHOOL: [
    "students.view", "students.manage",
    "parents.view", "parents.manage",
    "teachers.view", "teachers.manage",
    "classes.view", "classes.manage",
    "subjects.view", "subjects.manage",
    "sessions.view", "sessions.manage",
    "terms.view", "terms.manage",
    "attendance.view", "attendance.manage",
    "results.view", "results.manage",
    "assessments.view", "assessments.manage",
    "admissions.view", "admissions.manage",
    "reception.view", "reception.manage",
    "branding.view", "branding.manage",
    "templates.view", "templates.manage",
    "lms.view", "lms.manage",
    "fees.view", "fees.manage",
    "bills.view", "bills.manage",
    "payments.view", "payments.manage",
    "income.view", "income.manage",
    "expenses.view", "expenses.manage",
    "debtors.view", "ledger.view", "revenue.view",
    "announcements.view", "announcements.manage",
    "transport.view", "transport.manage",
    "settings.view", "settings.manage",
    "users.view", "users.manage",
    "roles.view", "roles.manage",
    "privileges.view", "privileges.manage",
    "profile.view", "profile.edit", "profile.change_password",
  ],
  TEACHER: [
    "students.view",
    "classes.view",
    "subjects.view",
    "attendance.view", "attendance.manage",
    "results.view", "results.manage",
    "announcements.view",
    "profile.view", "profile.edit", "profile.change_password",
  ],
  PARENT: [
    "students.view",
    "attendance.view",
    "results.view",
    "bills.view",
    "payments.view",
    "announcements.view",
    "profile.view", "profile.edit", "profile.change_password",
  ],
  STUDENT: [
    "attendance.view",
    "results.view",
    "bills.view",
    "payments.view",
    "announcements.view",
    "profile.view", "profile.edit", "profile.change_password",
  ],
  RECEPTIONIST: [
    "students.view",
    "parents.view",
    "attendance.view", "attendance.manage",
    "reception.view", "reception.manage",
    "announcements.view",
    "profile.view", "profile.edit", "profile.change_password",
  ],
  ACCOUNTANT: [
    "fees.view", "fees.manage",
    "bills.view", "bills.manage",
    "payments.view", "payments.manage",
    "income.view", "income.manage",
    "expenses.view", "expenses.manage",
    "debtors.view", "ledger.view", "revenue.view",
    "announcements.view",
    "settings.view",
    "profile.view", "profile.edit", "profile.change_password",
  ],
  REGISTRAR: [
    "students.view", "students.manage",
    "parents.view", "parents.manage",
    "teachers.view",
    "classes.view", "subjects.view", "sessions.view", "terms.view",
    "attendance.view", "attendance.manage",
    "results.view",
    "admissions.view", "admissions.manage",
    "announcements.view",
    "profile.view", "profile.edit", "profile.change_password",
  ],
};

export async function seedPrivileges() {
  for (const p of ALL_PRIVILEGES) {
    const existing = await prisma.privilege.findFirst({ where: { code: p.code } });
    if (!existing) {
      await prisma.privilege.create({ data: p });
    }
  }
}

export async function seedRolePrivileges() {
  const roles = await prisma.role.findMany();
  const privileges = await prisma.privilege.findMany();
  const privilegeMap = new Map<string, number>(privileges.map((p: any) => [p.code, p.id] as [string, number]));

  for (const role of roles) {
    const codes = DEFAULT_ROLE_PRIVILEGES[role.name] ?? [];
    for (const code of codes) {
      const privilegeId = privilegeMap.get(code);
      if (!privilegeId) continue;
      const existing = await prisma.rolePrivilege.findFirst({
        where: { roleId: role.id, privilegeId },
      });
      if (!existing) {
        await prisma.rolePrivilege.create({
          data: { roleId: role.id, privilegeId, isGranted: true },
        });
      }
    }
  }
}

export async function getUserPrivileges(userId: string | number): Promise<Record<string, boolean>> {
  // Get user's role first
  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  const roleId = user?.roleId ?? null;

  const [rolePrivRows, userPrivRows, allPrivileges] = await Promise.all([
    roleId
      ? prisma.rolePrivilege.findMany({ where: { roleId } })
      : Promise.resolve([] as any[]),
    prisma.userPrivilege.findMany({ where: { userId: Number(userId) } }),
    prisma.privilege.findMany(),
  ]);

  const privById = new Map<number, string>(allPrivileges.map((p: any) => [p.id, p.code] as [number, string]));

  const map: Record<string, boolean> = {};
  for (const rp of rolePrivRows) {
    const code = privById.get(rp.privilegeId);
    if (code) map[code] = rp.isGranted;
  }
  // User overrides take precedence
  for (const up of userPrivRows) {
    const code = privById.get(up.privilegeId);
    if (code) map[code] = up.isGranted;
  }
  return map;
}

export async function checkPrivilege(userId: string | number, code: PrivilegeCode): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user) return false;

  // Admin fallback: only SUPER_ADMIN bypasses privilege checks.
  // Every other role (including SCHOOL_ADMIN, HEAD_OF_SCHOOL, PRINCIPAL, etc.)
  // is evaluated strictly from seeded role privileges and user-specific overrides.
  const role = user.roleId ? await prisma.role.findUnique({ where: { id: user.roleId } }) : null;
  if (role?.name === "SUPER_ADMIN") {
    return true;
  }

  // First-run fallback: if no role privileges exist yet, grant access so the
  // privilege system can be seeded from the UI. Once role privileges exist,
  // this fallback no longer applies and every role is governed by its rows.
  const rolePrivCount = await prisma.rolePrivilege.count();
  if (rolePrivCount === 0) {
    return true;
  }

  const privs = await getUserPrivileges(userId);
  return privs[code] === true;
}

export async function requirePrivilege(userId: number, code: PrivilegeCode) {
  const allowed = await checkPrivilege(userId, code);
  if (!allowed) {
    throw new Error(`Access denied: missing privilege ${code}`);
  }
}
