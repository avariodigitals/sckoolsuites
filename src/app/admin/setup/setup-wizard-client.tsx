"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------
let _id = 0;
function uid() {
  return String(++_id);
}

type ClassArmRow = { _id: string; className: string; groupName: string; arms: string[] };
type ClassGroupRow = { _id: string; name: string };
type SubjectRow = { _id: string; name: string; classNames: string[]; classGroupNames: string[] };
type GradeBandRow = { _id: string; min: string; grade: string; gpa: string };
type GroupGradingProfileRow = {
  _id: string;
  groupName: string;
  caWeight: string;
  examWeight: string;
  passMark: string;
  promotionRule: string;
  gradeBandsText: string;
  attendanceBandsText: string;
  assessmentComponentsText: string;
};
type FeeGroupRow = { _id: string; name: string; code: string; description: string };
type FeeItemRow = {
  _id: string;
  groupName: string;
  name: string;
  category: string;
  amount: string;
  className: string;
  isOptional: boolean;
  dueDate: string;
  description: string;
};
type PersonRow = { _id: string; name: string; email: string; avatarUrl: string };
type StudentRow = {
  _id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  className: string;
  parentEmail: string;
  gender: string;
  age: string;
  passportUrl: string;
};
type AssignRow = { _id: string; target: string; email: string };

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------
type SetupStepId =
  | "school-profile"
  | "academic-setup"
  | "classes-arms"
  | "subjects"
  | "grading-assessment"
  | "finance-setup"
  | "users-roles"
  | "review-activate";

const stepOrder: SetupStepId[] = [
  "school-profile",
  "academic-setup",
  "classes-arms",
  "subjects",
  "grading-assessment",
  "finance-setup",
  "users-roles",
  "review-activate",
];

const stepLabels: Record<SetupStepId, string> = {
  "school-profile": "School Profile",
  "academic-setup": "Academic Setup",
  "classes-arms": "Classes & Arms",
  subjects: "Subjects",
  "grading-assessment": "Grading & Assessment",
  "finance-setup": "Finance Setup",
  "users-roles": "Users & Roles",
  "review-activate": "Review & Activate",
};

// ---------------------------------------------------------------------------
// API response type
// ---------------------------------------------------------------------------
type ApiArm = { id: string; name: string; classId: string; class: { id: string; name: string } };
type ApiClassGroup = { id: string; name: string };
type ApiSubject = {
  id: string;
  name: string;
  class?: { name: string } | null;
  classNames?: string | null;
  classGroup?: { name: string } | null;
  classGroupNames?: string | null;
};
type ApiFeeGroup = { id: string; name: string; code: string; description?: string | null };
type ApiFeeItem = {
  id: string;
  name: string;
  category: string;
  amount: number;
  description?: string | null;
  isOptional: boolean;
  dueDate?: string | null;
  feeGroup: { name: string };
  class?: { name: string } | null;
};
type ApiSetupState = {
  checklist: Record<string, boolean>;
  completionPercentage: number;
  canActivate: boolean;
  status: { lastCompletedStep: number; setupCompleted: boolean; completedSteps: SetupStepId[] };
};
type SetupApiResponse = {
  school?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string | null;
    branding?: { logoUrl?: string | null; reportHeaderText?: string | null } | null;
  };
  appIconLogo?: string;
  activeSessionId?: string | null;
  activeTermId?: string | null;
  groupGradingProfiles?: string;
  sessions?: Array<{ id: string; name: string; isCurrent?: boolean }>;
  terms?: Array<{ id: string; name: string; sessionId: string; isCurrent?: boolean; startDate?: string | null; endDate?: string | null }>;
  classGroups?: ApiClassGroup[];
  classes?: Array<{ id: string; name: string; classGroup?: { id: string; name: string } | null }>;
  arms?: ApiArm[];
  subjects?: ApiSubject[];
  feeGroups?: ApiFeeGroup[];
  feeItems?: ApiFeeItem[];
  teachers?: Array<{ id: string; name?: string | null; email?: string | null; avatarUrl?: string | null }>;
  parents?: Array<{ id: string; name?: string | null; email?: string | null; avatarUrl?: string | null }>;
  students?: Array<{ id: string; name?: string | null; email?: string | null; className?: string | null; parentEmail?: string | null; passportUrl?: string | null }>;
  setup?: ApiSetupState;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
type FieldErrors = Record<string, string>;

function isEmpty(s: string) {
  return !s.trim();
}

function splitDelimitedList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinDelimitedList(values: string[]) {
  return values.map((item) => item.trim()).filter(Boolean).join(", ");
}

function toggleListValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function validateSchoolProfile(d: { schoolName: string; address: string; phone: string; email: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (isEmpty(d.schoolName)) errors.schoolName = "School name is required";
  if (isEmpty(d.address)) errors.address = "Address is required";
  if (isEmpty(d.phone)) errors.phone = "Phone is required";
  if (isEmpty(d.email)) errors.email = "Email is required";
  return errors;
}

function validateAcademic(d: { currentSession: string; currentTerm: string; termStartDate: string; termEndDate: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (isEmpty(d.currentSession)) errors.currentSession = "Session name is required";
  if (isEmpty(d.currentTerm)) errors.currentTerm = "Term name is required";
  if (isEmpty(d.termStartDate)) errors.termStartDate = "Start date is required";
  if (isEmpty(d.termEndDate)) errors.termEndDate = "End date is required";
  if (d.termStartDate && d.termEndDate && d.termStartDate >= d.termEndDate)
    errors.termEndDate = "End date must be after start date";
  return errors;
}

function validateClassArms(rows: ClassArmRow[]): FieldErrors {
  const errors: FieldErrors = {};
  const validRows = rows.filter((r) => r.className.trim());
  if (validRows.length === 0) errors._list = "Add at least one class";
  rows.forEach((r, i) => {
    if (!r.className.trim()) errors[`row_${i}_className`] = "Class name required";
    if (!r.groupName.trim()) errors[`row_${i}_groupName`] = "Stage group required";
    if (!r.arms.length) errors[`row_${i}_arms`] = "Select at least one arm";
  });
  return errors;
}

function validateSubjects(rows: SubjectRow[]): FieldErrors {
  const errors: FieldErrors = {};
  const valid = rows.filter((r) => r.name.trim() && (r.classNames.length > 0 || r.classGroupNames.length > 0));
  if (valid.length === 0) errors._list = "Add at least one subject assigned to one or more stage groups or classes";
  rows.forEach((r, i) => {
    if (!r.name.trim()) errors[`row_${i}_name`] = "Subject name required";
    if (!r.classNames.length && !r.classGroupNames.length) errors[`row_${i}_className`] = "Select at least one stage group or class";
  });
  return errors;
}

function validateGrading(
  meta: { caStructure: string; examStructure: string; passMark: string },
  bands: GradeBandRow[],
): FieldErrors {
  const errors: FieldErrors = {};
  if (isEmpty(meta.caStructure)) errors.caStructure = "CA weight required";
  if (isEmpty(meta.examStructure)) errors.examStructure = "Exam weight required";
  if (isEmpty(meta.passMark)) errors.passMark = "Pass mark required";
  const ca = Number(meta.caStructure);
  const exam = Number(meta.examStructure);
  if (Number.isFinite(ca) && (ca < 0 || ca > 100)) errors.caStructure = "Must be 0-100";
  if (Number.isFinite(exam) && (exam < 0 || exam > 100)) errors.examStructure = "Must be 0-100";
  if (Number.isFinite(ca) && Number.isFinite(exam) && ca + exam !== 100)
    errors.examStructure = `CA + Exam must equal 100 (currently ${ca + exam})`;
  if (bands.length === 0) errors._bands = "Add at least one grade band";
  bands.forEach((b, i) => {
    if (!b.min.trim()) errors[`band_${i}_min`] = "Min score required";
    if (!b.grade.trim()) errors[`band_${i}_grade`] = "Grade label required";
  });
  return errors;
}

function validateFinance(groups: FeeGroupRow[], items: FeeItemRow[]): FieldErrors {
  const errors: FieldErrors = {};
  if (groups.length === 0) errors._groups = "Add at least one fee group";
  if (items.length === 0) errors._items = "Add at least one fee item";
  groups.forEach((g, i) => {
    if (!g.name.trim()) errors[`group_${i}_name`] = "Group name required";
  });
  items.forEach((item, i) => {
    if (!item.name.trim()) errors[`item_${i}_name`] = "Item name required";
    if (!item.groupName.trim()) errors[`item_${i}_groupName`] = "Fee group required";
    if (!item.amount.trim() || isNaN(Number(item.amount))) errors[`item_${i}_amount`] = "Valid amount required";
  });
  return errors;
}

function validateUsers(teachers: PersonRow[], students: StudentRow[], parents: PersonRow[]): FieldErrors {
  const errors: FieldErrors = {};
  if (teachers.length === 0) errors._teachers = "Add at least one teacher";
  if (students.length === 0) errors._students = "Add at least one student";
  if (parents.length === 0) errors._parents = "Add at least one parent";
  teachers.forEach((t, i) => {
    if (!t.name.trim()) errors[`teacher_${i}_name`] = "Name required";
    if (!t.email.trim()) errors[`teacher_${i}_email`] = "Email required";
  });
  parents.forEach((p, i) => {
    if (!p.name.trim()) errors[`parent_${i}_name`] = "Name required";
    if (!p.email.trim()) errors[`parent_${i}_email`] = "Email required";
  });
  students.forEach((s, i) => {
    if (!s.firstName.trim()) errors[`student_${i}_firstName`] = "First name required";
    if (!s.lastName.trim()) errors[`student_${i}_lastName`] = "Last name required";
    if (!s.email.trim()) errors[`student_${i}_email`] = "Email required";
    if (!s.className.trim()) errors[`student_${i}_className`] = "Class required";
  });
  return errors;
}

type ValidationState = {
  schoolProfile: { schoolName: string; address: string; phone: string; email: string };
  academic: { currentSession: string; currentTerm: string; termStartDate: string; termEndDate: string };
  classArmRows: ClassArmRow[];
  subjectRows: SubjectRow[];
  gradingMeta: { caStructure: string; examStructure: string; passMark: string };
  gradeBandRows: GradeBandRow[];
  groupGradingRows: GroupGradingProfileRow[];
  feeGroupRows: FeeGroupRow[];
  feeItemRows: FeeItemRow[];
  teacherRows: PersonRow[];
  studentRows: StudentRow[];
  parentRows: PersonRow[];
};

function validateStep(step: SetupStepId, state: ValidationState): FieldErrors {
  if (step === "school-profile") return validateSchoolProfile(state.schoolProfile);
  if (step === "academic-setup") return validateAcademic(state.academic);
  if (step === "classes-arms") return validateClassArms(state.classArmRows);
  if (step === "subjects") return validateSubjects(state.subjectRows);
  if (step === "grading-assessment") return validateGrading(state.gradingMeta, state.gradeBandRows);
  if (step === "finance-setup") return validateFinance(state.feeGroupRows, state.feeItemRows);
  if (step === "users-roles") return validateUsers(state.teacherRows, state.studentRows, state.parentRows);
  return {};
}

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------
function classArmRowsToText(rows: ClassArmRow[]) {
  return rows
    .filter((r) => r.className.trim())
    .map((r) => `${r.className}|${r.groupName}|${joinDelimitedList(r.arms)}`)
    .join("\n");
}
function classGroupRowsToText(rows: ClassGroupRow[]) {
  return rows
    .filter((r) => r.name.trim())
    .map((r) => r.name.trim())
    .join("\n");
}
function subjectRowsToText(rows: SubjectRow[]) {
  return rows
    .filter((r) => r.name.trim())
    .map((r) => `${r.name}|${joinDelimitedList(r.classNames)}|${joinDelimitedList(r.classGroupNames)}`)
    .join("\n");
}
function gradeBandRowsToText(rows: GradeBandRow[]) {
  return rows
    .filter((r) => r.min.trim() && r.grade.trim())
    .map((r) => `${r.min}:${r.grade}:${r.gpa}`)
    .join("\n");
}

function gradeBandRowsToMultiline(rows: GradeBandRow[]) {
  return rows
    .filter((r) => r.min.trim() && r.grade.trim())
    .map((r) => `${r.min.trim()}:${r.grade.trim()}:${r.gpa.trim() || "0"}`)
    .join("\n");
}

function createDefaultGroupGradingRow(groupName: string, gradeBandsText: string): GroupGradingProfileRow {
  return {
    _id: uid(),
    groupName,
    caWeight: "40",
    examWeight: "60",
    passMark: "50",
    promotionRule: "Promote if average >= pass mark",
    gradeBandsText,
    attendanceBandsText: "95:A:5\n85:B:4\n75:C:3\n60:D:2\n0:F:0",
    assessmentComponentsText: "Cognitive:100\nAffective:100\nPsychomotor:100",
  };
}

function serializeGroupGradingProfiles(rows: GroupGradingProfileRow[]) {
  return JSON.stringify(
    rows
      .filter((row) => row.groupName.trim())
      .map((row) => ({
        groupName: row.groupName.trim(),
        caWeight: Number(row.caWeight || "0"),
        examWeight: Number(row.examWeight || "0"),
        passMark: Number(row.passMark || "0"),
        promotionRule: row.promotionRule.trim(),
        gradeBands: row.gradeBandsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [min, grade, gpa] = line.split(":").map((part) => part.trim());
            return { min: Number(min || "0"), grade, gpa: Number(gpa || "0") };
          })
          .filter((item) => item.grade),
        attendanceGradeBands: row.attendanceBandsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [min, grade, gpa] = line.split(":").map((part) => part.trim());
            return { min: Number(min || "0"), grade, gpa: Number(gpa || "0") };
          })
          .filter((item) => item.grade),
        assessmentComponents: row.assessmentComponentsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, maxScore] = line.split(":").map((part) => part.trim());
            return { name, maxScore: Number(maxScore || "0") };
          })
          .filter((item) => item.name),
      })),
  );
}
function feeGroupRowsToText(rows: FeeGroupRow[]) {
  return rows
    .filter((r) => r.name.trim())
    .map((r) => `${r.name}|${r.code || r.name.toLowerCase().replace(/\s+/g, "-")}|${r.description}`)
    .join("\n");
}
function feeItemRowsToText(rows: FeeItemRow[], sessionId: string, termId: string) {
  return rows
    .filter((r) => r.name.trim() && r.groupName.trim())
    .map(
      (r, i) =>
        `${r.groupName}|${r.name}|${r.category || r.groupName}|${r.amount}|${r.className}||${sessionId}|${termId}|${r.isOptional}|${r.dueDate}|${r.description}|${i + 1}`,
    )
    .join("\n");
}
function teacherRowsToText(rows: PersonRow[]) {
  return rows
    .filter((r) => r.name.trim() && r.email.trim())
    .map((r) => `${r.name}|${r.email}|${r.avatarUrl}`)
    .join("\n");
}
function parentRowsToText(rows: PersonRow[]) {
  return rows
    .filter((r) => r.name.trim() && r.email.trim())
    .map((r) => `${r.name}|${r.email}|${r.avatarUrl}`)
    .join("\n");
}
function studentRowsToText(rows: StudentRow[]) {
  return rows
    .filter((r) => (r.firstName.trim() || r.lastName.trim()) && r.email.trim())
    .map((r) => {
      const fullName = [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ");
      return `${fullName}|${r.email}|${r.className}|${r.parentEmail}|${r.gender || "UNSPECIFIED"}|${r.age || "10"}|${r.passportUrl}`;
    })
    .join("\n");
}
function assignRowsToText(rows: AssignRow[]) {
  return rows
    .filter((r) => r.target.trim() && r.email.trim())
    .map((r) => `${r.target}|${r.email}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Review groups config
// ---------------------------------------------------------------------------
const REVIEW_GROUPS: Array<{
  label: string;
  stepIndex: number;
  key: SetupStepId;
  requiredDescription: string;
  optionalNote?: string;
}> = [
  {
    label: "School Profile",
    stepIndex: 0,
    key: "school-profile",
    requiredDescription: "School name, address, phone, email, and logo URL must be set.",
  },
  {
    label: "Academic Setup",
    stepIndex: 1,
    key: "academic-setup",
    requiredDescription: "Active session, term, and term start/end dates must be configured.",
  },
  {
    label: "Classes & Arms",
    stepIndex: 2,
    key: "classes-arms",
    requiredDescription: "At least one class and one active arm must be created.",
  },
  {
    label: "Subjects",
    stepIndex: 3,
    key: "subjects",
    requiredDescription: "At least one subject must be assigned to a class.",
  },
  {
    label: "Results Readiness",
    stepIndex: 4,
    key: "grading-assessment",
    requiredDescription: "CA/Exam split, grade bands, and pass mark must be configured.",
    optionalNote: "Subject-teacher assignments can be done after activation.",
  },
  {
    label: "Finance Setup",
    stepIndex: 5,
    key: "finance-setup",
    requiredDescription: "At least one fee group and one fee item are required to generate invoices.",
  },
  {
    label: "Users & Roles",
    stepIndex: 6,
    key: "users-roles",
    requiredDescription: "At least one teacher, student, and parent must be onboarded.",
    optionalNote: "Additional users can be added after activation.",
  },
];

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-rose-600">{msg}</p>;
}

function SectionError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {msg}
    </div>
  );
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 py-6 text-center">
      <p className="text-sm text-slate-500">No {label} added yet.</p>
      <Button type="button" variant="outline" onClick={onAdd}>
        + Add {label}
      </Button>
    </div>
  );
}

const DEFAULT_STAGE_GROUPS = [
  "EYFS",
  "Nursery",
  "Lower Primary",
  "Upper Primary",
  "Junior Secondary School",
  "Senior Secondary School",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SetupWizardClient() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalStatus, setGlobalStatus] = useState("");
  const [stepErrors, setStepErrors] = useState<FieldErrors>({});
  const [setupState, setSetupState] = useState<ApiSetupState>();
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [activating, setActivating] = useState(false);
  const [uploadingKey, setUploadingKey] = useState("");

  const [schoolProfile, setSchoolProfile] = useState({
    schoolName: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    logoUrl: "",
    appIconLogo: "",
    reportHeaderPreference: "",
  });

  const [academic, setAcademic] = useState({
    currentSession: "",
    currentTerm: "",
    termStartDate: "",
    termEndDate: "",
    resultPublicationSetting: "manual",
  });
  const [sessionId, setSessionId] = useState("");
  const [termId, setTermId] = useState("");

  const [classGroupRows, setClassGroupRows] = useState<ClassGroupRow[]>([]);
  const [classArmRows, setClassArmRows] = useState<ClassArmRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([]);
  const [gradingMeta, setGradingMeta] = useState({
    caStructure: "40",
    examStructure: "60",
    passMark: "50",
    promotionRule: "Promote if average >= pass mark",
  });
  const [gradeBandRows, setGradeBandRows] = useState<GradeBandRow[]>([
    { _id: uid(), min: "70", grade: "A", gpa: "5" },
    { _id: uid(), min: "60", grade: "B", gpa: "4" },
    { _id: uid(), min: "50", grade: "C", gpa: "3" },
    { _id: uid(), min: "45", grade: "D", gpa: "2" },
    { _id: uid(), min: "0", grade: "F", gpa: "0" },
  ]);
  const [groupGradingRows, setGroupGradingRows] = useState<GroupGradingProfileRow[]>([]);
  const [feeGroupRows, setFeeGroupRows] = useState<FeeGroupRow[]>([]);
  const [feeItemRows, setFeeItemRows] = useState<FeeItemRow[]>([]);
  const [teacherRows, setTeacherRows] = useState<PersonRow[]>([]);
  const [parentRows, setParentRows] = useState<PersonRow[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [classTeacherRows, setClassTeacherRows] = useState<AssignRow[]>([]);
  const [subjectTeacherRows, setSubjectTeacherRows] = useState<AssignRow[]>([]);

  const classOptions = useMemo(() => classArmRows.map((row) => row.className.trim()).filter(Boolean), [classArmRows]);
  const classGroupOptions = useMemo(() => {
    const source = classGroupRows.map((row) => row.name.trim()).filter(Boolean);
    return Array.from(new Set(source));
  }, [classGroupRows]);
  const armOptions = useMemo(() => ["A", "B", "C"], []);
  const defaultClassName = classOptions[0] ?? "";
  const defaultClassGroupName = classGroupOptions[0] ?? DEFAULT_STAGE_GROUPS[0];

  const activeStep = stepOrder[activeStepIndex];
  const completion = useMemo(() => setupState?.completionPercentage ?? 0, [setupState]);
  useEffect(() => {
    if (classGroupOptions.length === 0) return;
    const timer = window.setTimeout(() => {
      setGroupGradingRows((prev) => {
        const existingByName = new Map(prev.map((row) => [row.groupName.trim().toLowerCase(), row] as const));
        const defaults = gradeBandRowsToMultiline(gradeBandRows);
        return classGroupOptions.map((groupName) => {
          const existing = existingByName.get(groupName.trim().toLowerCase());
          return existing ?? createDefaultGroupGradingRow(groupName, defaults);
        });
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [classGroupOptions, gradeBandRows]);

  async function uploadImage(file: File, folder: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      throw new Error(payload.error || "Upload failed");
    }
    return payload.url;
  }

  async function loadSetup() {
    setLoading(true);
    const response = await fetch("/api/admin/setup", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as SetupApiResponse & { error?: string };

    if (!response.ok) {
      setGlobalStatus(typeof payload.error === "string" ? payload.error : "Unable to load setup wizard.");
      setLoading(false);
      return;
    }

    setSetupState(payload.setup);

    setSchoolProfile((prev) => ({
      ...prev,
      schoolName: payload.school?.name ?? "",
      address: payload.school?.address ?? "",
      phone: payload.school?.phone ?? "",
      email: payload.school?.email ?? "",
      website: payload.school?.website ?? "",
      logoUrl: payload.school?.branding?.logoUrl ?? "",
      appIconLogo: payload.appIconLogo ?? "",
      reportHeaderPreference: payload.school?.branding?.reportHeaderText ?? "",
    }));

    const currentSession = payload.sessions?.find((s) => s.id === payload.activeSessionId) ?? payload.sessions?.find((s) => s.isCurrent);
    const currentTerm = payload.terms?.find((t) => t.id === payload.activeTermId) ?? payload.terms?.find((t) => t.isCurrent);
    if (currentSession || currentTerm) {
      setAcademic((prev) => ({
        ...prev,
        currentSession: currentSession?.name ?? prev.currentSession,
        currentTerm: currentTerm?.name ?? prev.currentTerm,
        termStartDate: currentTerm?.startDate ? currentTerm.startDate.slice(0, 10) : prev.termStartDate,
        termEndDate: currentTerm?.endDate ? currentTerm.endDate.slice(0, 10) : prev.termEndDate,
      }));
      setSessionId(currentSession?.id ?? "");
      setTermId(currentTerm?.id ?? "");
    }

    if (payload.classGroups && payload.classGroups.length > 0) {
      setClassGroupRows(payload.classGroups.map((group) => ({ _id: group.id, name: group.name })));
    } else {
      setClassGroupRows(DEFAULT_STAGE_GROUPS.map((name) => ({ _id: uid(), name })));
    }

    if (payload.groupGradingProfiles) {
      try {
        const parsed = JSON.parse(payload.groupGradingProfiles) as Array<{
          groupName?: string;
          caWeight?: number;
          examWeight?: number;
          passMark?: number;
          promotionRule?: string;
          gradeBands?: Array<{ min?: number; grade?: string; gpa?: number }>;
          attendanceGradeBands?: Array<{ min?: number; grade?: string; gpa?: number }>;
          assessmentComponents?: Array<{ name?: string; maxScore?: number }>;
        }>;
        setGroupGradingRows(
          parsed.map((item) => ({
            _id: uid(),
            groupName: item.groupName ?? "",
            caWeight: String(item.caWeight ?? 40),
            examWeight: String(item.examWeight ?? 60),
            passMark: String(item.passMark ?? 50),
            promotionRule: item.promotionRule ?? "Promote if average >= pass mark",
            gradeBandsText: (item.gradeBands ?? [])
              .map((band) => `${band.min ?? 0}:${band.grade ?? ""}:${band.gpa ?? 0}`)
              .join("\n"),
            attendanceBandsText: (item.attendanceGradeBands ?? [])
              .map((band) => `${band.min ?? 0}:${band.grade ?? ""}:${band.gpa ?? 0}`)
              .join("\n"),
            assessmentComponentsText: (item.assessmentComponents ?? [])
              .map((component) => `${component.name ?? ""}:${component.maxScore ?? 0}`)
              .join("\n"),
          })),
        );
      } catch {
        setGroupGradingRows([]);
      }
    }

    if (payload.classes && payload.arms) {
      const grouped = payload.classes.map((cls) => ({
        _id: cls.id,
        className: cls.name,
        groupName: cls.classGroup?.name ?? "",
        arms: (payload.arms ?? [])
          .filter((a) => a.classId === cls.id)
          .map((a) => a.name)
          .filter(Boolean),
      }));
      if (grouped.length > 0) setClassArmRows(grouped);
    }

    if (payload.subjects && payload.subjects.length > 0) {
      const preloadedClassName = payload.classes?.find((cls) => cls.name.trim())?.name ?? "";
      setSubjectRows(
        payload.subjects.map((s) => ({
          _id: s.id,
          name: s.name,
          classNames: splitDelimitedList(s.classNames ?? s.class?.name ?? preloadedClassName),
          classGroupNames: splitDelimitedList(s.classGroupNames ?? s.classGroup?.name ?? ""),
        })),
      );
    }

    if (payload.feeGroups && payload.feeGroups.length > 0) {
      setFeeGroupRows(
        payload.feeGroups.map((g) => ({
          _id: g.id,
          name: g.name,
          code: g.code,
          description: g.description ?? "",
        })),
      );
    }

    if (payload.feeItems && payload.feeItems.length > 0) {
      setFeeItemRows(
        payload.feeItems.map((item) => ({
          _id: item.id,
          groupName: item.feeGroup.name,
          name: item.name,
          category: item.category,
          amount: String(item.amount),
          className: item.class?.name ?? "",
          isOptional: item.isOptional,
          dueDate: item.dueDate ? item.dueDate.toString().slice(0, 10) : "",
          description: item.description ?? "",
        })),
      );
    }

    if (payload.teachers && payload.teachers.length > 0) {
      setTeacherRows(payload.teachers.map((t) => ({ _id: t.id, name: t.name ?? "", email: t.email ?? "", avatarUrl: t.avatarUrl ?? "" })));
    }
    if (payload.parents && payload.parents.length > 0) {
      setParentRows(payload.parents.map((p) => ({ _id: p.id, name: p.name ?? "", email: p.email ?? "", avatarUrl: p.avatarUrl ?? "" })));
    }
    if (payload.students && payload.students.length > 0) {
      setStudentRows(
        payload.students.map((s) => {
          const parts = (s.name ?? "").trim().split(/\s+/);
          const firstName = parts[0] ?? "";
          const lastName = parts.length >= 2 ? parts[parts.length - 1] : "";
          const middleName = parts.length >= 3 ? parts.slice(1, -1).join(" ") : "";
          return {
            _id: s.id,
            firstName,
            middleName,
            lastName,
            email: s.email ?? "",
            className: s.className ?? "",
            parentEmail: s.parentEmail ?? "",
            gender: "UNSPECIFIED",
            age: "10",
            passportUrl: s.passportUrl ?? "",
          };
        }),
      );
    }

    const resumeStep = Math.max(0, (payload.setup?.status.lastCompletedStep ?? 0) - 1);
    setActiveStepIndex(Math.min(resumeStep, stepOrder.length - 1));
    setLoading(false);
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadSetup();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  function currentValidationState(): ValidationState {
    return {
      schoolProfile,
      academic,
      classArmRows,
      subjectRows,
      gradingMeta,
      gradeBandRows,
      groupGradingRows,
      feeGroupRows,
      feeItemRows,
      teacherRows,
      studentRows,
      parentRows,
    };
  }

  function runValidation(): FieldErrors {
    return validateStep(activeStep, currentValidationState());
  }

  async function submitStep(step: SetupStepId, data: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    setGlobalStatus("");
    const response = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, data }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; setup?: ApiSetupState; ok?: boolean };
    setSaving(false);

    if (!response.ok || !payload.ok) {
      setGlobalStatus(typeof payload.error === "string" ? payload.error : "Unable to save this step.");
      return false;
    }

    setSetupState(payload.setup);
    setGlobalStatus("Saved successfully.");
    return true;
  }

  async function saveCurrentStep() {
    const errors = runValidation();
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      setGlobalStatus("Please fix the errors below before saving.");
      return;
    }
    setStepErrors({});

    if (activeStep === "school-profile") {
      await submitStep(activeStep, schoolProfile);
    } else if (activeStep === "academic-setup") {
      await submitStep(activeStep, academic);
    } else if (activeStep === "classes-arms") {
      await submitStep(activeStep, {
        classGroups: classGroupRowsToText(classGroupRows),
        classArms: classArmRowsToText(classArmRows),
      });
    } else if (activeStep === "subjects") {
      await submitStep(activeStep, { subjects: subjectRowsToText(subjectRows) });
    } else if (activeStep === "grading-assessment") {
      await submitStep(activeStep, {
        ...gradingMeta,
        gradeBands: gradeBandRowsToText(gradeBandRows),
        groupGradingProfiles: serializeGroupGradingProfiles(groupGradingRows),
      });
    } else if (activeStep === "finance-setup") {
      await submitStep(activeStep, {
        sessionId,
        termId,
        feeGroups: feeGroupRowsToText(feeGroupRows),
        feeItems: feeItemRowsToText(feeItemRows, sessionId, termId),
      });
    } else if (activeStep === "users-roles") {
      await submitStep(activeStep, {
        teachers: teacherRowsToText(teacherRows),
        parents: parentRowsToText(parentRows),
        students: studentRowsToText(studentRows),
        classTeachers: assignRowsToText(classTeacherRows),
        subjectTeachers: assignRowsToText(subjectTeacherRows),
      });
    }
  }

  async function activateSetup() {
    setActivating(true);
    const ok = await submitStep("review-activate", { activate: true });
    setActivating(false);
    if (ok) {
      setShowActivateConfirm(false);
      setGlobalStatus("School setup is now active. Invoice and result modules are unlocked.");
    }
  }

  function goToStep(index: number) {
    setStepErrors({});
    setGlobalStatus("");
    setActiveStepIndex(index);
  }

  function handleNext() {
    const errors = runValidation();
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      setGlobalStatus("Complete required fields before proceeding.");
      return;
    }
    setStepErrors({});
    setGlobalStatus("");
    setActiveStepIndex((prev) => Math.min(stepOrder.length - 1, prev + 1));
  }

  function err(key: string) {
    return stepErrors[key];
  }

  function inputCls(key: string) {
    return stepErrors[key] ? "border-rose-400 focus-visible:ring-rose-400" : "";
  }

  function addRow<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, blank: T) {
    setter((prev) => [...prev, blank]);
  }

  function removeRow<T extends { _id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string) {
    setter((prev) => prev.filter((r) => r._id !== id));
    setStepErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (/^(row|band|group|item|teacher|parent|student)_/.test(key)) delete next[key];
      }
      return next;
    });
  }

  function updateRow<T extends { _id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string, patch: Partial<T>) {
    setter((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }

  // ---- Step panels ----

  function renderSchoolProfile() {
    const set = (k: keyof typeof schoolProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setSchoolProfile((prev) => ({ ...prev, [k]: e.target.value }));
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">School Name *</label>
          <Input placeholder="e.g. Greenfield Academy" value={schoolProfile.schoolName} onChange={set("schoolName")} className={inputCls("schoolName")} />
          <FieldError msg={err("schoolName")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Address *</label>
          <Input placeholder="e.g. 12 School Road, Lagos" value={schoolProfile.address} onChange={set("address")} className={inputCls("address")} />
          <FieldError msg={err("address")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Phone *</label>
          <Input placeholder="e.g. 08012345678" value={schoolProfile.phone} onChange={set("phone")} className={inputCls("phone")} />
          <FieldError msg={err("phone")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Email *</label>
          <Input type="email" placeholder="admin@school.edu.ng" value={schoolProfile.email} onChange={set("email")} className={inputCls("email")} />
          <FieldError msg={err("email")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Website</label>
          <Input placeholder="https://school.edu.ng" value={schoolProfile.website} onChange={set("website")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Logo URL</label>
          <div className="flex gap-2">
            <Input placeholder="https://cdn.example.com/logo.png" value={schoolProfile.logoUrl} onChange={set("logoUrl")} />
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="max-w-[220px]"
              disabled={uploadingKey === "school-logo"}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setUploadingKey("school-logo");
                try {
                  const url = await uploadImage(file, "branding");
                  setSchoolProfile((prev) => ({ ...prev, logoUrl: url }));
                } catch (error) {
                  setGlobalStatus(error instanceof Error ? error.message : "Unable to upload logo image.");
                } finally {
                  setUploadingKey("");
                  event.target.value = "";
                }
              }}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">App / Favicon URL</label>
          <div className="flex gap-2">
            <Input placeholder="https://cdn.example.com/icon.png" value={schoolProfile.appIconLogo} onChange={set("appIconLogo")} />
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="max-w-[220px]"
              disabled={uploadingKey === "app-icon"}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setUploadingKey("app-icon");
                try {
                  const url = await uploadImage(file, "branding");
                  setSchoolProfile((prev) => ({ ...prev, appIconLogo: url }));
                } catch (error) {
                  setGlobalStatus(error instanceof Error ? error.message : "Unable to upload app icon.");
                } finally {
                  setUploadingKey("");
                  event.target.value = "";
                }
              }}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Report Header Text</label>
          <Input placeholder="e.g. FIRST TERM REPORT 2025/2026" value={schoolProfile.reportHeaderPreference} onChange={set("reportHeaderPreference")} />
          <p className="mt-1 text-[11px] text-slate-500">You can use placeholders: {"{term}"} and {"{session}"}. Example: {"{term}"} Report - {"{session}"}.</p>
        </div>
      </div>
    );
  }

  function renderAcademic() {
    const set = (k: keyof typeof academic) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setAcademic((prev) => ({ ...prev, [k]: e.target.value }));
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Current Session *</label>
          <Input placeholder="e.g. 2025/2026" value={academic.currentSession} onChange={set("currentSession")} className={inputCls("currentSession")} />
          <FieldError msg={err("currentSession")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Current Term *</label>
          <Input placeholder="e.g. First Term" value={academic.currentTerm} onChange={set("currentTerm")} className={inputCls("currentTerm")} />
          <FieldError msg={err("currentTerm")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Term Start Date *</label>
          <Input type="date" value={academic.termStartDate} onChange={set("termStartDate")} className={inputCls("termStartDate")} />
          <FieldError msg={err("termStartDate")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Term End Date *</label>
          <Input type="date" value={academic.termEndDate} onChange={set("termEndDate")} className={inputCls("termEndDate")} />
          <FieldError msg={err("termEndDate")} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700">Result Publication</label>
          <select
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={academic.resultPublicationSetting}
            onChange={(e) => setAcademic((prev) => ({ ...prev, resultPublicationSetting: e.target.value }))}
          >
            <option value="manual">Manual (admin publishes when ready)</option>
            <option value="auto">Automatic (publish when all scores entered)</option>
          </select>
        </div>
      </div>
    );
  }

  function renderClassArms() {
    return (
      <div className="space-y-3">
        <SectionError msg={err("_list")} />
        <p className="text-xs text-slate-500">Manage stage groups, then attach each class to a stage group and select its arms (streams).</p>

        <div className="space-y-2 rounded-md border border-slate-200 p-3">
          <p className="text-xs font-medium text-slate-700">Stage Groups</p>
          <div className="flex flex-wrap gap-2">
            {classGroupRows.map((group) => (
              <span key={group._id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700">
                {group.name}
                <button
                  type="button"
                  className="text-rose-500 hover:text-rose-700"
                  onClick={() => {
                    setClassGroupRows((prev) => prev.filter((item) => item._id !== group._id));
                    setClassArmRows((prev) => prev.map((item) => (item.groupName === group.name ? { ...item, groupName: "" } : item)));
                    setSubjectRows((prev) => prev.map((item) => ({ ...item, classGroupNames: item.classGroupNames.filter((name) => name !== group.name) })));
                  }}
                  aria-label={`Remove ${group.name}`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Add stage group e.g. Lower Primary"
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const target = event.target as HTMLInputElement;
                const value = target.value.trim();
                if (!value) return;
                if (!classGroupOptions.includes(value)) {
                  setClassGroupRows((prev) => [...prev, { _id: uid(), name: value }]);
                }
                target.value = "";
              }}
            />
          </div>
        </div>

        {classArmRows.length === 0 ? (
          <EmptyState label="class" onAdd={() => addRow(setClassArmRows, { _id: uid(), className: "", groupName: defaultClassGroupName, arms: ["A", "B", "C"] })} />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500">
              <span>Class Name *</span>
              <span>Stage Group *</span>
              <span>Arms *</span>
              <span />
            </div>
            {classArmRows.map((row, i) => (
              <div key={row._id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
                <div>
                  <Input placeholder="e.g. Year 1" value={row.className} onChange={(e) => updateRow(setClassArmRows, row._id, { className: e.target.value })} className={inputCls(`row_${i}_className`)} />
                  <FieldError msg={err(`row_${i}_className`)} />
                </div>
                <div>
                  {classGroupOptions.length > 0 ? (
                    <select
                      value={row.groupName}
                      onChange={(e) => updateRow(setClassArmRows, row._id, { groupName: e.target.value })}
                      className={`w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${inputCls(`row_${i}_groupName`)}`}
                    >
                      <option value="">Select stage group</option>
                      {classGroupOptions.map((groupName) => (
                        <option key={groupName} value={groupName}>
                          {groupName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      placeholder="e.g. Lower Primary"
                      value={row.groupName}
                      onChange={(e) => updateRow(setClassArmRows, row._id, { groupName: e.target.value })}
                      className={inputCls(`row_${i}_groupName`)}
                    />
                  )}
                  <FieldError msg={err(`row_${i}_groupName`)} />
                </div>
                <div className="space-y-2 rounded-md border border-slate-200 p-2">
                  <div className="flex flex-wrap gap-2">
                    {armOptions.map((arm) => (
                      <label key={arm} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={row.arms.includes(arm)}
                          onChange={() => updateRow(setClassArmRows, row._id, { arms: toggleListValue(row.arms, arm) })}
                        />
                        <span>{arm}</span>
                      </label>
                    ))}
                  </div>
                  <FieldError msg={err(`row_${i}_arms`)} />
                </div>
                <button type="button" className="mt-1 rounded px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50" onClick={() => removeRow(setClassArmRows, row._id)}>Remove</button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addRow(setClassArmRows, { _id: uid(), className: "", groupName: defaultClassGroupName, arms: ["A", "B", "C"] })}>+ Add Class</Button>
          </div>
        )}
      </div>
    );
  }

  function renderSubjects() {
    return (
      <div className="space-y-3">
        <SectionError msg={err("_list")} />
        <p className="text-xs text-slate-500">Assign each subject to stage groups first, then optionally fine-tune class exceptions.</p>
        {subjectRows.length === 0 ? (
          <EmptyState
            label="subject"
            onAdd={() =>
              addRow(setSubjectRows, {
                _id: uid(),
                name: "",
                classNames: defaultClassName ? [defaultClassName] : [],
                classGroupNames: defaultClassGroupName ? [defaultClassGroupName] : [],
              })
            }
          />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500">
              <span>Subject Name *</span>
              <span>Stage Groups *</span>
              <span>Class Overrides (optional)</span>
              <span />
            </div>
            {subjectRows.map((row, i) => (
              <div key={row._id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
                <div>
                  <Input placeholder="e.g. Mathematics" value={row.name} onChange={(e) => updateRow(setSubjectRows, row._id, { name: e.target.value })} className={inputCls(`row_${i}_name`)} />
                  <FieldError msg={err(`row_${i}_name`)} />
                </div>
                <div className="space-y-2 rounded-md border border-slate-200 p-2">
                  {classGroupOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {classGroupOptions.map((groupName) => (
                        <label key={groupName} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={row.classGroupNames.includes(groupName)}
                            onChange={() => updateRow(setSubjectRows, row._id, { classGroupNames: toggleListValue(row.classGroupNames, groupName) })}
                          />
                          <span>{groupName}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Input
                      placeholder="e.g. Lower Primary"
                      value={joinDelimitedList(row.classGroupNames)}
                      onChange={(e) => updateRow(setSubjectRows, row._id, { classGroupNames: splitDelimitedList(e.target.value) })}
                      className={inputCls(`row_${i}_className`)}
                    />
                  )}
                  <FieldError msg={err(`row_${i}_className`)} />
                </div>
                <div className="space-y-2 rounded-md border border-slate-200 p-2">
                  {classOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {classOptions.map((className) => (
                        <label key={className} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={row.classNames.includes(className)}
                            onChange={() => updateRow(setSubjectRows, row._id, { classNames: toggleListValue(row.classNames, className) })}
                          />
                          <span>{className}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Input placeholder="e.g. Year 1" value={joinDelimitedList(row.classNames)} onChange={(e) => updateRow(setSubjectRows, row._id, { classNames: splitDelimitedList(e.target.value) })} />
                  )}
                </div>
                <button type="button" className="mt-1 rounded px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50" onClick={() => removeRow(setSubjectRows, row._id)}>Remove</button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                addRow(setSubjectRows, {
                  _id: uid(),
                  name: "",
                  classNames: defaultClassName ? [defaultClassName] : [],
                  classGroupNames: defaultClassGroupName ? [defaultClassGroupName] : [],
                })
              }
            >
              + Add Subject
            </Button>
          </div>
        )}
      </div>
    );
  }

  function renderGrading() {
    const set = (k: keyof typeof gradingMeta) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setGradingMeta((prev) => ({ ...prev, [k]: e.target.value }));
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">CA Weight (%) *</label>
            <Input type="number" placeholder="40" value={gradingMeta.caStructure} onChange={set("caStructure")} className={inputCls("caStructure")} />
            <FieldError msg={err("caStructure")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Exam Weight (%) *</label>
            <Input type="number" placeholder="60" value={gradingMeta.examStructure} onChange={set("examStructure")} className={inputCls("examStructure")} />
            <FieldError msg={err("examStructure")} />
            <p className="mt-1 text-xs text-slate-400">CA + Exam must equal 100</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Pass Mark *</label>
            <Input type="number" placeholder="50" value={gradingMeta.passMark} onChange={set("passMark")} className={inputCls("passMark")} />
            <FieldError msg={err("passMark")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Promotion Rule</label>
            <Input placeholder="e.g. Promote if average >= pass mark" value={gradingMeta.promotionRule} onChange={set("promotionRule")} />
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Grade Bands</h4>
            <Button type="button" variant="outline" onClick={() => addRow(setGradeBandRows, { _id: uid(), min: "", grade: "", gpa: "0" })}>+ Add Band</Button>
          </div>
          <SectionError msg={err("_bands")} />
          {gradeBandRows.length === 0 ? (
            <EmptyState label="grade band" onAdd={() => addRow(setGradeBandRows, { _id: uid(), min: "", grade: "", gpa: "0" })} />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500">
                <span>Min Score *</span><span>Grade *</span><span>GPA</span><span />
              </div>
              {gradeBandRows.map((band, i) => (
                <div key={band._id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
                  <div>
                    <Input type="number" placeholder="70" value={band.min} onChange={(e) => updateRow(setGradeBandRows, band._id, { min: e.target.value })} className={inputCls(`band_${i}_min`)} />
                    <FieldError msg={err(`band_${i}_min`)} />
                  </div>
                  <div>
                    <Input placeholder="A" value={band.grade} onChange={(e) => updateRow(setGradeBandRows, band._id, { grade: e.target.value })} className={inputCls(`band_${i}_grade`)} />
                    <FieldError msg={err(`band_${i}_grade`)} />
                  </div>
                  <Input type="number" step="0.1" placeholder="5.0" value={band.gpa} onChange={(e) => updateRow(setGradeBandRows, band._id, { gpa: e.target.value })} />
                  <button type="button" className="mt-1 rounded px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50" onClick={() => removeRow(setGradeBandRows, band._id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-semibold text-slate-800">Per Stage Group Policy</h4>
          <p className="text-xs text-slate-500">
            Configure CA/Exam mix, score bands, attendance grading, and assessment components for each stage group.
          </p>
          {groupGradingRows.length === 0 ? (
            <p className="text-xs text-slate-500">Add stage groups first in Classes & Arms.</p>
          ) : (
            <div className="space-y-3">
              {groupGradingRows.map((row) => (
                <div key={row._id} className="rounded-md border border-slate-200 bg-white p-3">
                  <h5 className="mb-2 text-sm font-semibold text-slate-800">{row.groupName}</h5>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">CA Weight (%)</label>
                      <Input
                        type="number"
                        value={row.caWeight}
                        onChange={(e) => updateRow(setGroupGradingRows, row._id, { caWeight: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Exam Weight (%)</label>
                      <Input
                        type="number"
                        value={row.examWeight}
                        onChange={(e) => updateRow(setGroupGradingRows, row._id, { examWeight: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Pass Mark</label>
                      <Input
                        type="number"
                        value={row.passMark}
                        onChange={(e) => updateRow(setGroupGradingRows, row._id, { passMark: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="mb-1 block text-xs text-slate-600">Promotion Rule</label>
                    <Input
                      value={row.promotionRule}
                      onChange={(e) => updateRow(setGroupGradingRows, row._id, { promotionRule: e.target.value })}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Grade Bands (min:grade:gpa)</label>
                      <textarea
                        className="h-28 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                        value={row.gradeBandsText}
                        onChange={(e) => updateRow(setGroupGradingRows, row._id, { gradeBandsText: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Attendance Bands (min:grade:gpa)</label>
                      <textarea
                        className="h-28 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                        value={row.attendanceBandsText}
                        onChange={(e) => updateRow(setGroupGradingRows, row._id, { attendanceBandsText: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Assessments (name:maxScore)</label>
                      <textarea
                        className="h-28 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                        value={row.assessmentComponentsText}
                        onChange={(e) => updateRow(setGroupGradingRows, row._id, { assessmentComponentsText: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderFinance() {
    return (
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Fee Groups</h4>
            <Button type="button" variant="outline" onClick={() => addRow(setFeeGroupRows, { _id: uid(), name: "", code: "", description: "" })}>+ Add Group</Button>
          </div>
          <SectionError msg={err("_groups")} />
          {feeGroupRows.length === 0 ? (
            <EmptyState label="fee group" onAdd={() => addRow(setFeeGroupRows, { _id: uid(), name: "", code: "", description: "" })} />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500">
                <span>Name *</span><span>Code</span><span>Description</span><span />
              </div>
              {feeGroupRows.map((g, i) => (
                <div key={g._id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
                  <div>
                    <Input placeholder="e.g. Tuition" value={g.name} onChange={(e) => updateRow(setFeeGroupRows, g._id, { name: e.target.value })} className={inputCls(`group_${i}_name`)} />
                    <FieldError msg={err(`group_${i}_name`)} />
                  </div>
                  <Input placeholder="e.g. tuition" value={g.code} onChange={(e) => updateRow(setFeeGroupRows, g._id, { code: e.target.value })} />
                  <Input placeholder="Core charges" value={g.description} onChange={(e) => updateRow(setFeeGroupRows, g._id, { description: e.target.value })} />
                  <button type="button" className="mt-1 rounded px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50" onClick={() => removeRow(setFeeGroupRows, g._id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Fee Items</h4>
            <Button type="button" variant="outline" onClick={() => addRow(setFeeItemRows, { _id: uid(), groupName: feeGroupRows[0]?.name ?? "", name: "", category: "", amount: "", className: "", isOptional: false, dueDate: "", description: "" })}>+ Add Item</Button>
          </div>
          <SectionError msg={err("_items")} />
          {feeItemRows.length === 0 ? (
            <EmptyState label="fee item" onAdd={() => addRow(setFeeItemRows, { _id: uid(), groupName: feeGroupRows[0]?.name ?? "", name: "", category: "", amount: "", className: "", isOptional: false, dueDate: "", description: "" })} />
          ) : (
            <div className="space-y-2">
              {feeItemRows.map((item, i) => (
                <div key={item._id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Fee Group *</label>
                      <select className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm" value={item.groupName} onChange={(e) => updateRow(setFeeItemRows, item._id, { groupName: e.target.value })}>
                        <option value="">Select group</option>
                        {feeGroupRows.map((g) => <option key={g._id} value={g.name}>{g.name}</option>)}
                      </select>
                      <FieldError msg={err(`item_${i}_groupName`)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Item Name *</label>
                      <Input placeholder="e.g. First Term Tuition" value={item.name} onChange={(e) => updateRow(setFeeItemRows, item._id, { name: e.target.value })} className={inputCls(`item_${i}_name`)} />
                      <FieldError msg={err(`item_${i}_name`)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Amount (&#8358;) *</label>
                      <Input type="number" placeholder="65000" value={item.amount} onChange={(e) => updateRow(setFeeItemRows, item._id, { amount: e.target.value })} className={inputCls(`item_${i}_amount`)} />
                      <FieldError msg={err(`item_${i}_amount`)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Category</label>
                      <Input placeholder="e.g. Tuition" value={item.category} onChange={(e) => updateRow(setFeeItemRows, item._id, { category: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Class (blank = all)</label>
                      <Input placeholder="e.g. Year 2" value={item.className} onChange={(e) => updateRow(setFeeItemRows, item._id, { className: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Due Date</label>
                      <Input type="date" value={item.dueDate} onChange={(e) => updateRow(setFeeItemRows, item._id, { dueDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Description</label>
                      <Input placeholder="Optional note" value={item.description} onChange={(e) => updateRow(setFeeItemRows, item._id, { description: e.target.value })} />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={item.isOptional} onChange={(e) => updateRow(setFeeItemRows, item._id, { isOptional: e.target.checked })} />
                        Optional fee
                      </label>
                    </div>
                    <div className="flex items-end justify-end">
                      <button type="button" className="rounded px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50" onClick={() => removeRow(setFeeItemRows, item._id)}>Remove item</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderPersonRows(label: string, rows: PersonRow[], setter: React.Dispatch<React.SetStateAction<PersonRow[]>>, prefix: string) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800">{label}</h4>
          <Button type="button" variant="outline" onClick={() => addRow(setter, { _id: uid(), name: "", email: "", avatarUrl: "" })}>+ Add</Button>
        </div>
        <SectionError msg={err(`_${prefix}`)} />
        {rows.length === 0 ? (
          <EmptyState label={label.toLowerCase().replace(/s$/, "")} onAdd={() => addRow(setter, { _id: uid(), name: "", email: "", avatarUrl: "" })} />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500">
              <span>Name *</span><span>Email *</span><span>Photo (optional)</span><span />
            </div>
            {rows.map((row, i) => (
              <div key={row._id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
                <div>
                  <Input placeholder="Full name" value={row.name} onChange={(e) => updateRow(setter, row._id, { name: e.target.value })} className={inputCls(`${prefix}_${i}_name`)} />
                  <FieldError msg={err(`${prefix}_${i}_name`)} />
                </div>
                <div>
                  <Input type="email" placeholder="user@school.edu.ng" value={row.email} onChange={(e) => updateRow(setter, row._id, { email: e.target.value })} className={inputCls(`${prefix}_${i}_email`)} />
                  <FieldError msg={err(`${prefix}_${i}_email`)} />
                </div>
                <div className="space-y-1">
                  <Input placeholder="/uploads/..." value={row.avatarUrl} onChange={(e) => updateRow(setter, row._id, { avatarUrl: e.target.value })} />
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="max-w-[220px]"
                    disabled={uploadingKey === `${prefix}-${row._id}`}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setUploadingKey(`${prefix}-${row._id}`);
                      try {
                        const url = await uploadImage(file, `${prefix}s`);
                        updateRow(setter, row._id, { avatarUrl: url });
                      } catch (error) {
                        setGlobalStatus(error instanceof Error ? error.message : "Unable to upload image.");
                      } finally {
                        setUploadingKey("");
                        event.target.value = "";
                      }
                    }}
                  />
                </div>
                <button type="button" className="mt-1 rounded px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50" onClick={() => removeRow(setter, row._id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderStudentRows() {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800">Students</h4>
          <Button type="button" variant="outline" onClick={() => addRow(setStudentRows, { _id: uid(), firstName: "", middleName: "", lastName: "", email: "", className: "", parentEmail: "", gender: "UNSPECIFIED", age: "10", passportUrl: "" })}>+ Add Student</Button>
        </div>
        <SectionError msg={err("_students")} />
        {studentRows.length === 0 ? (
          <EmptyState label="student" onAdd={() => addRow(setStudentRows, { _id: uid(), firstName: "", middleName: "", lastName: "", email: "", className: "", parentEmail: "", gender: "UNSPECIFIED", age: "10", passportUrl: "" })} />
        ) : (
          <div className="space-y-2">
            {studentRows.map((row, i) => (
              <div key={row._id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">First Name *</label>
                    <Input placeholder="e.g. Eric" value={row.firstName} onChange={(e) => updateRow(setStudentRows, row._id, { firstName: e.target.value })} className={inputCls(`student_${i}_firstName`)} />
                    <FieldError msg={err(`student_${i}_firstName`)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Middle Name</label>
                    <Input placeholder="e.g. Osamudiamen" value={row.middleName} onChange={(e) => updateRow(setStudentRows, row._id, { middleName: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Last Name *</label>
                    <Input placeholder="e.g. Okonkwo" value={row.lastName} onChange={(e) => updateRow(setStudentRows, row._id, { lastName: e.target.value })} className={inputCls(`student_${i}_lastName`)} />
                    <FieldError msg={err(`student_${i}_lastName`)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Email *</label>
                    <Input type="email" placeholder="student@school.edu.ng" value={row.email} onChange={(e) => updateRow(setStudentRows, row._id, { email: e.target.value })} className={inputCls(`student_${i}_email`)} />
                    <FieldError msg={err(`student_${i}_email`)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Class *</label>
                    <Input placeholder="e.g. Year 2" value={row.className} onChange={(e) => updateRow(setStudentRows, row._id, { className: e.target.value })} className={inputCls(`student_${i}_className`)} />
                    <FieldError msg={err(`student_${i}_className`)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Parent Email</label>
                    <Input type="email" placeholder="parent@school.edu.ng" value={row.parentEmail} onChange={(e) => updateRow(setStudentRows, row._id, { parentEmail: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Gender</label>
                    <select className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm" value={row.gender} onChange={(e) => updateRow(setStudentRows, row._id, { gender: e.target.value })}>
                      <option value="UNSPECIFIED">Unspecified</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Age</label>
                    <Input type="number" placeholder="10" value={row.age} onChange={(e) => updateRow(setStudentRows, row._id, { age: e.target.value })} />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs text-slate-500">Student Photo (optional)</label>
                    <div className="flex gap-2">
                      <Input placeholder="/uploads/..." value={row.passportUrl} onChange={(e) => updateRow(setStudentRows, row._id, { passportUrl: e.target.value })} />
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="max-w-[240px]"
                        disabled={uploadingKey === `student-${row._id}`}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setUploadingKey(`student-${row._id}`);
                          try {
                            const url = await uploadImage(file, "students");
                            updateRow(setStudentRows, row._id, { passportUrl: url });
                          } catch (error) {
                            setGlobalStatus(error instanceof Error ? error.message : "Unable to upload student photo.");
                          } finally {
                            setUploadingKey("");
                            event.target.value = "";
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button type="button" className="rounded px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50" onClick={() => removeRow(setStudentRows, row._id)}>Remove student</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderAssignRows(label: string, rows: AssignRow[], setter: React.Dispatch<React.SetStateAction<AssignRow[]>>, targetLabel: string, emailLabel: string) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800">{label}</h4>
          <Button type="button" variant="outline" onClick={() => addRow(setter, { _id: uid(), target: "", email: "" })}>+ Add</Button>
        </div>
        {rows.length === 0 ? (
          <p className="rounded border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">Optional — can be configured after activation.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500">
              <span>{targetLabel}</span><span>{emailLabel}</span><span />
            </div>
            {rows.map((row) => (
              <div key={row._id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <Input placeholder={targetLabel} value={row.target} onChange={(e) => updateRow(setter, row._id, { target: e.target.value })} />
                <Input type="email" placeholder={emailLabel} value={row.email} onChange={(e) => updateRow(setter, row._id, { email: e.target.value })} />
                <button type="button" className="rounded px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50" onClick={() => removeRow(setter, row._id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderUsers() {
    return (
      <div className="space-y-6">
        {renderPersonRows("Teachers", teacherRows, setTeacherRows, "teacher")}
        {renderPersonRows("Parents", parentRows, setParentRows, "parent")}
        {renderStudentRows()}
        <hr className="border-slate-200" />
        <p className="text-xs text-slate-500">Optional: assign class and subject teachers now, or do it later from the admin panel.</p>
        {renderAssignRows("Class Teacher Assignments", classTeacherRows, setClassTeacherRows, "Class Name", "Teacher Email")}
        {renderAssignRows("Subject Teacher Assignments", subjectTeacherRows, setSubjectTeacherRows, "Subject Name", "Teacher Email")}
      </div>
    );
  }

  function renderReview() {
    const checklist = setupState?.checklist ?? {};
    const canActivate = setupState?.canActivate ?? false;
    const isActivated = setupState?.status.setupCompleted ?? false;

    if (showActivateConfirm) {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="mb-2 font-semibold text-amber-900">Confirm School Activation</h4>
            <p className="mb-3 text-sm text-amber-800">Activating will unlock the following modules for live operation:</p>
            <ul className="mb-4 space-y-1 text-sm text-amber-800">
              <li>[OK] Invoice generation and billing</li>
              <li>[OK] Result entry and report publication</li>
              <li>[OK] Student and parent portal access</li>
              <li>[OK] Finance approval workflows</li>
            </ul>
            <p className="mb-3 text-sm text-amber-800">The following are optional and can be done after activation:</p>
            <ul className="mb-4 space-y-1 text-sm text-amber-700">
              <li>- Transport setup</li>
              <li>- Additional class/subject teacher assignments</li>
              <li>- Branding customisation</li>
              <li>- Custom announcement templates</li>
            </ul>
            <div className="flex gap-2">
              <Button onClick={activateSetup} disabled={activating} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {activating ? "Activating..." : "Confirm Activation"}
              </Button>
              <Button variant="outline" onClick={() => setShowActivateConfirm(false)} disabled={activating}>Cancel</Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Review each section. Click <strong>Fix it</strong> to go to a step that needs attention.</p>
        {REVIEW_GROUPS.map((group) => {
          const done = Boolean(checklist[group.key]);
          return (
            <div key={group.key} className={`rounded-lg border p-3 ${done ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-sm font-semibold ${done ? "text-emerald-800" : "text-rose-800"}`}>
                    {done ? "[OK]" : "[X]"} {group.label}
                  </p>
                  {!done && <p className="mt-1 text-xs text-rose-700">{group.requiredDescription}</p>}
                  {group.optionalNote && <p className="mt-1 text-xs text-slate-500">{group.optionalNote}</p>}
                </div>
                {!done && (
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    onClick={() => goToStep(group.stepIndex)}
                  >
                    Fix it
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isActivated ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            [OK] Setup is active. All modules are unlocked.
          </div>
        ) : canActivate ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 text-sm text-slate-700">All required steps are complete. You can now activate the school.</p>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setShowActivateConfirm(true)} data-testid="btn-activate">
              Activate School Setup
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Complete all required steps above to unlock activation.
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading setup wizard...</section>;
  }

  const isReview = activeStep === "review-activate";
  const errorCount = Object.keys(stepErrors).length;

  return (
    <section className="space-y-4" data-testid="setup-wizard">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">School Setup Wizard</h2>
          <span className="text-xs font-medium text-slate-600">{completion}% complete</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${completion}%` }} />
        </div>
        {!setupState?.status.setupCompleted ? (
          <p className="mt-2 text-xs text-amber-700">Invoices and result reports are locked until setup is activated.</p>
        ) : (
          <p className="mt-2 text-xs text-emerald-700">Setup is active — all modules unlocked.</p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="space-y-1">
            {stepOrder.map((step, index) => {
              const done = Boolean(setupState?.status.completedSteps.includes(step));
              const active = index === activeStepIndex;
              return (
                <button
                  key={step}
                  type="button"
                  data-testid={`step-nav-${step}`}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? "bg-slate-900 text-white" : done ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                  onClick={() => goToStep(index)}
                >
                  <span className="mr-2">{done ? "[OK]" : `${index + 1}.`}</span>
                  {stepLabels[step]}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-1 text-base font-semibold text-slate-900">{stepLabels[activeStep]}</h3>

          {errorCount > 0 ? (
            <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" data-testid="validation-errors">
              {globalStatus || "Please fix the highlighted errors before saving or continuing."}
            </div>
          ) : globalStatus ? (
            <p className={`mb-3 text-sm ${globalStatus.toLowerCase().includes("error") || globalStatus.toLowerCase().includes("fix") ? "text-rose-600" : "text-emerald-700"}`}>{globalStatus}</p>
          ) : null}

          <div className="mt-3">
            {activeStep === "school-profile" && renderSchoolProfile()}
            {activeStep === "academic-setup" && renderAcademic()}
            {activeStep === "classes-arms" && renderClassArms()}
            {activeStep === "subjects" && renderSubjects()}
            {activeStep === "grading-assessment" && renderGrading()}
            {activeStep === "finance-setup" && renderFinance()}
            {activeStep === "users-roles" && renderUsers()}
            {activeStep === "review-activate" && renderReview()}
          </div>

          {!showActivateConfirm && (
            <div className="mt-6 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" disabled={activeStepIndex === 0 || saving} onClick={() => goToStep(activeStepIndex - 1)} data-testid="btn-prev">
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {!isReview && (
                  <Button variant="outline" disabled={saving} onClick={saveCurrentStep} data-testid="btn-save">
                    {saving ? "Saving..." : "Save Step"}
                  </Button>
                )}
                {!isReview && (
                  <Button disabled={activeStepIndex === stepOrder.length - 1 || saving} onClick={handleNext} data-testid="btn-next">
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
