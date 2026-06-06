import { z } from "zod";
import { prisma } from "@/lib/db";

const assessmentTypeSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(100),
});

const gradingBandSchema = z.object({
  min: z.number().min(0).max(100),
  grade: z.string().min(1),
  gpa: z.number().min(0),
});

const classGroupPolicySchema = z.object({
  groupName: z.string().min(1),
  caWeight: z.number().min(0).max(100),
  examWeight: z.number().min(0).max(100),
  passMark: z.number().min(0).max(100),
  promotionRule: z.string().optional(),
  gradeBands: z.array(gradingBandSchema).default([]),
  attendanceGradeBands: z.array(gradingBandSchema).default([]),
  assessmentComponents: z.array(z.object({ name: z.string().min(1), maxScore: z.number().min(0) })).default([]),
});

const classArmSchema = z.object({
  name: z.string().min(1),
  subjects: z.array(z.string().min(1)).default([]),
});

const classSchema = z.object({
  name: z.string().min(1),
  groupName: z.string().optional(),
  arms: z.array(classArmSchema).default([]),
});

const academicConfigSchema = z.object({
  sessions: z.array(z.object({ name: z.string().min(1), isCurrent: z.boolean().optional(), status: z.string().optional() })).default([]),
  terms: z.array(z.object({ name: z.string().min(1), sessionName: z.string().optional(), isCurrent: z.boolean().optional(), status: z.string().optional() })).default([]),
  classes: z.array(classSchema).default([]),
  arms: z.array(z.string().min(1)).default([]),
  subjects: z.array(z.object({ name: z.string().min(1), className: z.string().optional(), classGroupName: z.string().optional(), armName: z.string().optional() })).default([]),
  assessmentTypes: z.array(assessmentTypeSchema).default([]),
  gradingSystem: z.array(gradingBandSchema).default([]),
  classGroupPolicies: z.array(classGroupPolicySchema).default([]),
});

const financeConfigSchema = z.object({
  feeStructures: z
    .array(
      z.object({
        category: z.string().min(1),
        name: z.string().min(1),
        amount: z.number().min(0),
        className: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .default([]),
  paymentChannels: z
    .array(
      z.object({
        name: z.string().min(1),
        provider: z.string().optional(),
        isActive: z.boolean().optional(),
        config: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .default([]),
});

const resultConfigSchema = z.object({
  templates: z
    .array(
      z.object({
        name: z.string().min(1),
        level: z.string().optional(),
        classGroupName: z.string().optional(),
        className: z.string().optional(),
        isDefault: z.boolean().optional(),
        layout: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .default([]),
});

const communicationConfigSchema = z.object({
  emailTemplates: z
    .array(
      z.object({
        key: z.string().min(1),
        subject: z.string().min(1),
        body: z.string().min(1),
        isActive: z.boolean().optional(),
      })
    )
    .default([]),
  smsTemplates: z
    .array(
      z.object({
        key: z.string().min(1),
        body: z.string().min(1),
        isActive: z.boolean().optional(),
      })
    )
    .default([]),
});

const operationsConfigSchema = z.object({
  attendanceRules: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .default([]),
  schoolCalendar: z
    .array(
      z.object({
        title: z.string().min(1),
        date: z.string().min(1),
        category: z.string().optional(),
      })
    )
    .default([]),
  timetableTemplates: z
    .array(
      z.object({
        name: z.string().min(1),
        level: z.string().optional(),
        periods: z.array(z.record(z.string(), z.unknown())).optional(),
      })
    )
    .default([]),
});

const governanceConfigSchema = z.object({
  userRoles: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        permissions: z.array(z.string()).default([]),
      })
    )
    .default([]),
});

const portalConfigSchema = z.object({
  visibility: z
    .object({
      parentPortal: z.boolean().default(true),
      teacherPortal: z.boolean().default(true),
      studentPortal: z.boolean().default(true),
      accountantPortal: z.boolean().default(true),
    })
    .default({
      parentPortal: true,
      teacherPortal: true,
      studentPortal: true,
      accountantPortal: true,
    }),
  notificationControls: z
    .object({
      email: z.boolean().default(true),
      sms: z.boolean().default(true),
      push: z.boolean().default(true),
      inApp: z.boolean().default(true),
    })
    .default({
      email: true,
      sms: true,
      push: true,
      inApp: true,
    }),
});

export const schoolConfigSchema = z.object({
  academic: academicConfigSchema,
  finance: financeConfigSchema,
  result: resultConfigSchema.default({ templates: [] }),
  communication: communicationConfigSchema.default({ emailTemplates: [], smsTemplates: [] }),
  operations: operationsConfigSchema.default({ attendanceRules: [], schoolCalendar: [], timetableTemplates: [] }),
  governance: governanceConfigSchema.default({ userRoles: [] }),
  portal: portalConfigSchema.default({
    visibility: { parentPortal: true, teacherPortal: true, studentPortal: true, accountantPortal: true },
    notificationControls: { email: true, sms: true, push: true, inApp: true },
  }),
});

export type SchoolConfig = z.infer<typeof schoolConfigSchema>;

type SchoolConfigTx = any;

function slugifyCode(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function buildFeeItemDedupeKey(input: {
  feeGroupId: string;
  name: string;
  classId?: string | null;
  armId?: string | null;
  sessionId: string;
  termId: string;
}) {
  return [
    input.feeGroupId,
    input.name.trim().toLowerCase(),
    input.classId ?? "global",
    input.armId ?? "all-arms",
    input.sessionId,
    input.termId,
  ].join("::");
}

const DEFAULT_ASSESSMENTS: SchoolConfig["academic"]["assessmentTypes"] = [
  { name: "Test 1", weight: 10 },
  { name: "Test 2", weight: 10 },
  { name: "Assignment", weight: 20 },
  { name: "Exam", weight: 60 },
];

const DEFAULT_GRADING: SchoolConfig["academic"]["gradingSystem"] = [
  { min: 90, grade: "A", gpa: 5 },
  { min: 80, grade: "B", gpa: 4 },
  { min: 70, grade: "C", gpa: 3 },
  { min: 60, grade: "D", gpa: 2 },
  { min: 50, grade: "E", gpa: 1 },
  { min: 0, grade: "F", gpa: 0 },
];

export function normalizeSchoolConfig(input: unknown): SchoolConfig {
  const parsed = schoolConfigSchema.parse(input);

  const weightTotal = parsed.academic.assessmentTypes.reduce((sum, item) => sum + item.weight, 0);
  if (parsed.academic.assessmentTypes.length > 0 && weightTotal !== 100) {
    throw new Error("Assessment type weights must total 100.");
  }

  return parsed;
}

async function syncFeeStructuresToDatabase(tx: SchoolConfigTx, schoolId: string, config: SchoolConfig) {
  const [classes, currentSession, currentTerm] = await Promise.all([
    tx.class.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    }),
    tx.session.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    }),
    tx.term.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!currentSession?.id || !currentTerm?.id) {
    return;
  }

  const classByName = new Map(classes.map((item: any) => [item.name.trim().toLowerCase(), item.id]));

  const feeGroupsByCategory = new Map<string, string>();

  for (const item of config.finance.feeStructures) {
    const category = item.category.trim();
    if (!category || feeGroupsByCategory.has(category.toLowerCase())) continue;

    const groupCode = slugifyCode(category) || "finance";
    const feeGroup = await tx.feeGroup.upsert({
      where: {
        schoolId_code: {
          schoolId,
          code: groupCode,
        },
      },
      update: { name: category, isActive: true },
      create: {
        schoolId,
        name: category,
        code: groupCode,
        isActive: true,
      },
      select: { id: true, name: true },
    });
    feeGroupsByCategory.set(feeGroup.name.toLowerCase(), feeGroup.id);
  }

  const incoming = config.finance.feeStructures
    .filter((item) => item.category.trim() && item.name.trim())
    .map((item) => {
      const className = item.className?.trim();
      const classId = className ? (classByName.get(className.toLowerCase()) as string | undefined) ?? null : null;
      const feeGroupId = feeGroupsByCategory.get(item.category.trim().toLowerCase());
      if (!feeGroupId) return null;
      const dedupeKey = buildFeeItemDedupeKey({
        feeGroupId,
        name: item.name.trim(),
        classId,
        armId: null,
        sessionId: currentSession.id,
        termId: currentTerm.id,
      });
      return {
        dedupeKey,
        feeGroupId,
        category: item.category.trim(),
        name: item.name.trim(),
        amount: Number(item.amount) || 0,
        isOptional: false,
        isActive: item.isActive !== false,
        classId,
        armId: null,
        sessionId: currentSession.id,
        termId: currentTerm.id,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!incoming.length) {
    await tx.feeItem.updateMany({ where: { schoolId }, data: { isActive: false } });
    return;
  }

  for (const item of incoming) {
    await tx.feeItem.upsert({
      where: {
        schoolId_dedupeKey: {
          schoolId,
          dedupeKey: item.dedupeKey,
        },
      },
      update: {
        feeGroupId: item.feeGroupId,
        classId: item.classId,
        armId: item.armId,
        sessionId: item.sessionId,
        termId: item.termId,
        category: item.category,
        name: item.name,
        amount: item.amount,
        isOptional: item.isOptional,
        isActive: item.isActive,
      },
      create: {
        schoolId,
        feeGroupId: item.feeGroupId,
        classId: item.classId,
        armId: item.armId,
        sessionId: item.sessionId,
        termId: item.termId,
        category: item.category,
        name: item.name,
        description: null,
        amount: item.amount,
        isOptional: item.isOptional,
        dueDate: null,
        sortOrder: 0,
        isActive: item.isActive,
        dedupeKey: item.dedupeKey,
      },
    });
  }

  await tx.feeItem.updateMany({
    where: {
      schoolId,
      dedupeKey: {
        notIn: incoming.map((item) => item.dedupeKey),
      },
    },
    data: { isActive: false },
  });
}

async function buildSchoolConfigFromCurrentData(schoolId: string): Promise<SchoolConfig> {
  const [sessions, terms, classes, subjects, feeItems] = await Promise.all([
    prisma.session.findMany({ where: { schoolId }, orderBy: { createdAt: "asc" } }),
    prisma.term.findMany({ where: { schoolId }, include: { session: true }, orderBy: { createdAt: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, include: { classGroup: true }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { schoolId }, include: { class: true, classGroup: true }, orderBy: { name: "asc" } }),
    prisma.feeItem.findMany({ where: { schoolId }, include: { class: true, feeGroup: true }, orderBy: { createdAt: "asc" } }),
  ]);

  return normalizeSchoolConfig({
    academic: {
      sessions: sessions.map((item) => ({ name: item.name, isCurrent: item.isCurrent, status: item.status })),
      terms: terms.map((item) => ({
        name: item.name,
        sessionName: item.session.name,
        isCurrent: item.isCurrent,
        status: item.status,
      })),
      classes: classes.map((item) => ({ name: item.name, groupName: item.classGroup?.name, arms: [] })),
      arms: [],
      subjects: subjects.map((item) => ({ name: item.name, className: item.class?.name, classGroupName: item.classGroup?.name })),
      assessmentTypes: DEFAULT_ASSESSMENTS,
      gradingSystem: DEFAULT_GRADING,
    },
    finance: {
      feeStructures: feeItems.map((item) => ({
        category: item.category,
        name: item.name,
        amount: item.amount,
        className: item.class?.name,
        isActive: item.isActive,
      })),
      paymentChannels: [],
    },
    result: {
      templates: [],
    },
    communication: {
      emailTemplates: [],
      smsTemplates: [],
    },
    operations: {
      attendanceRules: [],
      schoolCalendar: [],
      timetableTemplates: [],
    },
    governance: {
      userRoles: [],
    },
    portal: {
      visibility: {
        parentPortal: true,
        teacherPortal: true,
        studentPortal: true,
        accountantPortal: true,
      },
      notificationControls: {
        email: true,
        sms: true,
        push: true,
        inApp: true,
      },
    },
  });
}

export async function publishSchoolConfigVersion(params: {
  schoolId: string;
  config: unknown;
  createdById?: string;
  notes?: string;
  source?: string;
}) {
  const normalized = normalizeSchoolConfig(params.config);

  return prisma.$transaction(async (tx) => {
    const latest = await tx.schoolConfigVersion.aggregate({
      where: { schoolId: params.schoolId },
      _max: { version: true },
    });

    const nextVersion = (latest._max.version ?? 0) + 1;

    await tx.schoolConfigVersion.updateMany({
      where: { schoolId: params.schoolId, isActive: true },
      data: { isActive: false },
    });

    const created = await tx.schoolConfigVersion.create({
      data: {
        schoolId: params.schoolId,
        version: nextVersion,
        isActive: true,
        config: normalized as Record<string, unknown>,
        source: params.source ?? "manual",
        notes: params.notes,
        createdById: params.createdById,
      },
    });

    await syncFeeStructuresToDatabase(tx, params.schoolId, normalized);

    return created;
  });
}

export async function activateSchoolConfigVersion(schoolId: string, configVersionId: string) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.schoolConfigVersion.findFirst({ where: { id: configVersionId, schoolId } });
    if (!version) throw new Error("Configuration version not found.");

    const normalized = normalizeSchoolConfig(version.config);

    await tx.schoolConfigVersion.updateMany({ where: { schoolId, isActive: true }, data: { isActive: false } });
    const updated = await tx.schoolConfigVersion.update({ where: { id: configVersionId }, data: { isActive: true } });

    await syncFeeStructuresToDatabase(tx, schoolId, normalized);

    return updated;
  });
}

export async function getSchoolConfigVersions(schoolId: string) {
  return prisma.schoolConfigVersion.findMany({
    where: { schoolId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      isActive: true,
      source: true,
      notes: true,
      createdAt: true,
    },
  });
}

export async function getActiveSchoolConfig(schoolId: string) {
  let active = await prisma.schoolConfigVersion.findFirst({
    where: { schoolId, isActive: true },
    orderBy: { version: "desc" },
  });

  if (!active) {
    const bootstrapConfig = await buildSchoolConfigFromCurrentData(schoolId);
    active = await publishSchoolConfigVersion({
      schoolId,
      config: bootstrapConfig,
      source: "bootstrap",
      notes: "Auto-created from existing school data.",
    });
  }

  return {
    id: active.id,
    version: active.version,
    isActive: active.isActive,
    source: active.source,
    notes: active.notes,
    createdAt: active.createdAt,
    config: normalizeSchoolConfig(active.config),
  };
}
