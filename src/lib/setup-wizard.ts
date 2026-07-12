import { prisma } from "@/lib/db";

export const setupStepOrder = [
  "school-profile",
  "academic-setup",
  "classes-arms",
  "subjects",
  "grading-assessment",
  "finance-setup",
  "users-roles",
  "review-activate",
] as const;

export type SetupStepId = (typeof setupStepOrder)[number];

export type SetupWizardStatus = {
  lastCompletedStep: number;
  completedSteps: SetupStepId[];
  setupCompleted: boolean;
  updatedAt: string;
};

type SetupChecklist = Record<Exclude<SetupStepId, "review-activate">, boolean>;

function defaultStatus(): SetupWizardStatus {
  return {
    lastCompletedStep: 0,
    completedSteps: [],
    setupCompleted: false,
    updatedAt: new Date().toISOString(),
  };
}

function parseStatus(rawValue?: string | null): SetupWizardStatus {
  if (!rawValue) return defaultStatus();
  try {
    const parsed = JSON.parse(rawValue) as Partial<SetupWizardStatus>;
    const completedSteps = Array.isArray(parsed.completedSteps)
      ? parsed.completedSteps.filter((step): step is SetupStepId => setupStepOrder.includes(step as SetupStepId))
      : [];

    return {
      lastCompletedStep: Math.max(0, Number(parsed.lastCompletedStep ?? 0)),
      completedSteps,
      setupCompleted: Boolean(parsed.setupCompleted),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return defaultStatus();
  }
}

export async function computeSetupChecklist(schoolId: string): Promise<SetupChecklist> {
  const [school, currentSession, currentTerm, classCount, armCount, subjectCount, subjectAssignedCount, gradingSettingCount, feeGroupCount, feeItemCount, teacherCount, studentCount, parentCount, teacherAssignedCount, schoolSetting] =
    await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId }, include: { branding: true } }),
      prisma.session.findFirst({ where: { schoolId, isCurrent: true } }),
      prisma.term.findFirst({ where: { schoolId, isCurrent: true } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.classArm.count({ where: { schoolId, isActive: true } }),
      prisma.subject.count({ where: { schoolId } }),
      prisma.subject.count({
        where: {
          schoolId,
          OR: [
            { classId: { not: null } },
            { classNames: { not: null } },
          ],
        },
      }),
      prisma.schoolSetting.count({
        where: {
          schoolId,
          key: {
            in: ["setup_ca_structure", "setup_exam_structure", "setup_grade_bands", "setup_pass_mark", "setup_promotion_rule"],
          },
        },
      }),
      prisma.feeGroup.count({ where: { schoolId, isActive: true } }),
      prisma.feeItem.count({ where: { schoolId, isActive: true } }),
      prisma.teacher.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.parent.count({ where: { schoolId } }),
      prisma.subject.count({ where: { schoolId, teacherId: { not: null } } }),
      prisma.schoolSetting.findFirst({ where: { schoolId, key: "result_publication_setting" } }),
    ]);

  const schoolProfile =
    Boolean(school?.name?.trim()) &&
    Boolean(school?.address?.trim()) &&
    Boolean(school?.phone?.trim()) &&
    Boolean(school?.email?.trim()) &&
    Boolean(school?.branding?.logoUrl?.trim());

  return {
    "school-profile": schoolProfile,
    "academic-setup": Boolean(currentSession && currentTerm && currentTerm.startDate && currentTerm.endDate && schoolSetting?.value),
    "classes-arms": classCount > 0 && armCount > 0,
    subjects: subjectCount > 0 && subjectAssignedCount > 0,
    "grading-assessment": gradingSettingCount >= 5,
    "finance-setup": feeGroupCount > 0 && feeItemCount > 0,
    "users-roles": teacherCount > 0 && studentCount > 0 && parentCount > 0 && teacherAssignedCount > 0,
  };
}

export async function getSetupWizardState(schoolId: string) {
  const [setting, checklist, schoolRecord] = await Promise.all([
    prisma.schoolSetting.findFirst({ where: { schoolId, key: "setup_wizard_status" } }),
    computeSetupChecklist(schoolId),
    prisma.school.findUnique({ where: { id: schoolId } }),
  ]);

  const current = parseStatus(setting?.value);
  const completedSteps = setupStepOrder.filter((step) => step !== "review-activate" && checklist[step]);
  const completionPercentage = Math.round((completedSteps.length / (setupStepOrder.length - 1)) * 100);

  const canActivate = completedSteps.length === setupStepOrder.length - 1;
  const schoolIsSetup = (schoolRecord as any)?.is_setup ?? (schoolRecord as any)?.isSetup ?? false;
  const effective: SetupWizardStatus = {
    ...current,
    completedSteps,
    lastCompletedStep: completedSteps.length,
    setupCompleted: current.setupCompleted || schoolIsSetup || canActivate,
    updatedAt: current.updatedAt,
  };

  return {
    checklist,
    status: effective,
    completionPercentage,
    canActivate: completedSteps.length === setupStepOrder.length - 1,
  };
}

export async function saveSetupWizardStatus(schoolId: string, status: SetupWizardStatus) {
  await prisma.schoolSetting.upsert({
    where: { schoolId_key: { schoolId, key: "setup_wizard_status" } },
    update: { value: JSON.stringify(status) },
    create: { schoolId, key: "setup_wizard_status", value: JSON.stringify(status) },
  });
}
