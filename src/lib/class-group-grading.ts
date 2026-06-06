import { prisma } from "@/lib/db";
import type { GradingBand } from "@/lib/grades";
import { getActiveSchoolConfig } from "@/lib/school-config";

export type AssessmentComponent = {
  name: string;
  maxScore: number;
};

export type ClassGroupGradingProfile = {
  groupName: string;
  caWeight: number;
  examWeight: number;
  passMark: number;
  promotionRule?: string;
  gradeBands: GradingBand[];
  attendanceGradeBands: GradingBand[];
  assessmentComponents: AssessmentComponent[];
};

function normalizeBands(value: unknown): GradingBand[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Partial<GradingBand>;
      return {
        min: Number(row.min ?? 0),
        grade: String(row.grade ?? "").trim(),
        gpa: Number(row.gpa ?? 0),
      };
    })
    .filter((row) => row.grade && Number.isFinite(row.min) && Number.isFinite(row.gpa))
    .sort((a, b) => b.min - a.min);
}

function normalizeComponents(value: unknown): AssessmentComponent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Partial<AssessmentComponent>;
      return {
        name: String(row.name ?? "").trim(),
        maxScore: Number(row.maxScore ?? 0),
      };
    })
    .filter((row) => row.name && Number.isFinite(row.maxScore) && row.maxScore >= 0);
}

function normalizeProfiles(value: unknown): ClassGroupGradingProfile[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Partial<ClassGroupGradingProfile>;
      return {
        groupName: String(row.groupName ?? "").trim(),
        caWeight: Number(row.caWeight ?? 40),
        examWeight: Number(row.examWeight ?? 60),
        passMark: Number(row.passMark ?? 50),
        promotionRule: row.promotionRule ? String(row.promotionRule).trim() : undefined,
        gradeBands: normalizeBands(row.gradeBands),
        attendanceGradeBands: normalizeBands(row.attendanceGradeBands),
        assessmentComponents: normalizeComponents(row.assessmentComponents),
      };
    })
    .filter((row) => row.groupName);
}

export async function getClassGroupGradingProfiles(schoolId: string): Promise<ClassGroupGradingProfile[]> {
  const setting = await prisma.schoolSetting.findUnique({
    where: { schoolId_key: { schoolId, key: "setup_group_grading_profiles" } },
    select: { value: true },
  });

  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value) as unknown;
      const profiles = normalizeProfiles(parsed);
      if (profiles.length > 0) return profiles;
    } catch {
      // Fall through to config-based fallback.
    }
  }

  const activeConfig = await getActiveSchoolConfig(schoolId);
  return normalizeProfiles((activeConfig.config.academic as { classGroupPolicies?: unknown })?.classGroupPolicies);
}

export function resolveClassGroupProfile(
  profiles: ClassGroupGradingProfile[],
  groupName?: string | null,
): ClassGroupGradingProfile | null {
  if (!groupName) return null;
  const wanted = groupName.trim().toLowerCase();
  return profiles.find((item) => item.groupName.trim().toLowerCase() === wanted) ?? null;
}

export function parseNumericAssessmentScore(value?: string | null): number | null {
  if (!value) return null;
  const n = Number(value.trim());
  if (!Number.isFinite(n)) return null;
  return n;
}
