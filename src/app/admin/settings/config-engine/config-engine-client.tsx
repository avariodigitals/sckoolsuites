"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type VersionSummary = {
  id: string;
  version: string;
  isActive: boolean;
  source: string;
  notes: string | null;
  createdAt: string;
};

type ActiveConfigPayload = {
  id: string;
  version: number;
  source: string;
  notes: string | null;
  config: {
    academic: Record<string, unknown>;
    finance: Record<string, unknown>;
    result?: Record<string, unknown>;
    communication?: Record<string, unknown>;
    operations?: Record<string, unknown>;
    governance?: Record<string, unknown>;
    portal?: Record<string, unknown>;
  };
};

type SessionNode = { name: string; isCurrent?: boolean; status?: string };
type TermNode = { name: string; sessionName?: string; isCurrent?: boolean; status?: string };
type ClassArmNode = { name: string; subjects: string[] };
type ClassNode = { name: string; arms: ClassArmNode[] };
type SubjectNode = { name: string; className?: string; armName?: string };
type AssessmentNode = { name: string; weight: number };
type GradingNode = { min: number; grade: string; gpa: number };
type ClassGroupPolicyNode = {
  groupName: string;
  caWeight: number;
  examWeight: number;
  passMark: number;
  promotionRule?: string;
  gradeBandsText: string;
  attendanceGradeBandsText: string;
  assessmentComponentsText: string;
};
type FeeNode = { category: string; name: string; amount: number; className?: string; isActive?: boolean };
type TimetablePeriodNode = { day: string; period: number; subject: string; startTime?: string; endTime?: string };
type ResultTemplateNode = { name: string; level?: string; classGroupName?: string; className?: string; isDefault: boolean; layoutHeader: boolean; layoutSectionsText: string };
type EmailTemplateNode = { key: string; subject: string; body: string; isActive: boolean };
type SmsTemplateNode = { key: string; body: string; isActive: boolean };
type AttendanceRuleNode = { name: string; value?: string; isActive: boolean };
type SchoolCalendarNode = { title: string; date: string; category?: string };
type TimetableTemplateNode = { name: string; level?: string; periods: TimetablePeriodNode[] };
type PaymentChannelNode = { name: string; provider?: string; isActive: boolean; configText: string };
type UserRoleNode = { name: string; description?: string; permissionsText: string };
type SampleRecord = Record<string, unknown>;

type MappingSpec = {
  arrayKey: string;
  fields: Record<string, string>;
};

type ConfigTab =
  | "import"
  | "academic"
  | "grading"
  | "fees"
  | "portal"
  | "templates"
  | "communication"
  | "operations"
  | "channels"
  | "release";

function safeArray<T>(value: unknown, mapItem: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(mapItem);
}

function toStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function toLayoutNode(value: unknown) {
  const layout = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    layoutHeader: Boolean(layout.header ?? true),
    layoutSectionsText: toStringList(layout.sections).join(", "),
  };
}

function normalizeGradingBandsText(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return `${Number(row.min ?? 0)}:${String(row.grade ?? "").trim()}:${Number(row.gpa ?? 0)}`;
    })
    .join("\n");
}

function normalizeAssessmentComponentsText(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return `${String(row.name ?? "").trim()}:${Number(row.maxScore ?? 0)}`;
    })
    .join("\n");
}

function parseGradingBandsText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [min, grade, gpa] = line.split(":").map((part) => part.trim());
      return { min: Number(min ?? 0), grade: String(grade ?? ""), gpa: Number(gpa ?? 0) };
    })
    .filter((item) => item.grade);
}

function parseAssessmentComponentsText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, maxScore] = line.split(":").map((part) => part.trim());
      return { name: String(name ?? ""), maxScore: Number(maxScore ?? 0) };
    })
    .filter((item) => item.name);
}

function buildDefaultResultTemplates(): ResultTemplateNode[] {
  return [
    {
      name: "Prenursery",
      level: "Prenursery",
      classGroupName: "Prenursery",
      className: "",
      isDefault: true,
      layoutHeader: true,
      layoutSectionsText: "bio, performance, attendance",
    },
    {
      name: "Primary",
      level: "Primary",
      classGroupName: "Primary",
      className: "",
      isDefault: false,
      layoutHeader: true,
      layoutSectionsText: "bio, performance, attendance",
    },
  ];
}

function toPeriods(value: unknown): TimetablePeriodNode[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const node = (item ?? {}) as Record<string, unknown>;
    return {
      day: String(node.day ?? ""),
      period: Number(node.period ?? 1),
      subject: String(node.subject ?? ""),
      startTime: String(node.startTime ?? ""),
      endTime: String(node.endTime ?? ""),
    };
  });
}

function formatUtcDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

export function ConfigEngineClient({
  initialActive,
  initialVersions,
}: {
  initialActive: ActiveConfigPayload;
  initialVersions: VersionSummary[];
}) {
  const initialAcademic = (initialActive.config.academic ?? {}) as Record<string, unknown>;
  const initialFinance = (initialActive.config.finance ?? {}) as Record<string, unknown>;
  const initialResult = (initialActive.config.result ?? {}) as Record<string, unknown>;
  const initialCommunication = (initialActive.config.communication ?? {}) as Record<string, unknown>;
  const initialOperations = (initialActive.config.operations ?? {}) as Record<string, unknown>;
  const initialGovernance = (initialActive.config.governance ?? {}) as Record<string, unknown>;
  const initialPortal = (initialActive.config.portal ?? {}) as Record<string, unknown>;
  const initialVisibility = (initialPortal.visibility ?? {}) as Record<string, unknown>;
  const initialNotificationControls = (initialPortal.notificationControls ?? {}) as Record<string, unknown>;

  const [sessions, setSessions] = useState<SessionNode[]>(() =>
    safeArray(initialAcademic.sessions, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(node.name ?? ""),
        isCurrent: Boolean(node.isCurrent),
        status: String(node.status ?? "DRAFT"),
      };
    })
  );
  const [terms, setTerms] = useState<TermNode[]>(() =>
    safeArray(initialAcademic.terms, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(node.name ?? ""),
        sessionName: String(node.sessionName ?? ""),
        isCurrent: Boolean(node.isCurrent),
        status: String(node.status ?? "DRAFT"),
      };
    })
  );
  const [classes, setClasses] = useState<ClassNode[]>(() =>
    safeArray(initialAcademic.classes, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(node.name ?? ""),
        arms: safeArray(node.arms, (arm) => {
          const armNode = (arm ?? {}) as Record<string, unknown>;
          return {
            name: String(armNode.name ?? ""),
            subjects: toStringList(armNode.subjects),
          };
        }),
      };
    })
  );
  const [subjects, setSubjects] = useState<SubjectNode[]>(() =>
    safeArray(initialAcademic.subjects, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(node.name ?? ""),
        className: String(node.className ?? ""),
        armName: String(node.armName ?? ""),
      };
    })
  );
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentNode[]>(() =>
    safeArray(initialAcademic.assessmentTypes, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(node.name ?? ""),
        weight: Number(node.weight ?? 0),
      };
    })
  );
  const [gradingSystem, setGradingSystem] = useState<GradingNode[]>(() =>
    safeArray(initialAcademic.gradingSystem, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        min: Number(node.min ?? 0),
        grade: String(node.grade ?? ""),
        gpa: Number(node.gpa ?? 0),
      };
    })
  );
  const [classGroupPolicies, setClassGroupPolicies] = useState<ClassGroupPolicyNode[]>(() =>
    safeArray(initialAcademic.classGroupPolicies, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        groupName: String(node.groupName ?? ""),
        caWeight: Number(node.caWeight ?? 40),
        examWeight: Number(node.examWeight ?? 60),
        passMark: Number(node.passMark ?? 50),
        promotionRule: String(node.promotionRule ?? "Promote if average >= pass mark"),
        gradeBandsText: normalizeGradingBandsText(node.gradeBands),
        attendanceGradeBandsText: normalizeGradingBandsText(node.attendanceGradeBands),
        assessmentComponentsText: normalizeAssessmentComponentsText(node.assessmentComponents),
      };
    })
  );
  const [feeStructures, setFeeStructures] = useState<FeeNode[]>(() =>
    safeArray(initialFinance.feeStructures, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        category: String(node.category ?? ""),
        name: String(node.name ?? ""),
        amount: Number(node.amount ?? 0),
        className: String(node.className ?? ""),
        isActive: node.isActive === undefined ? true : Boolean(node.isActive),
      };
    })
  );
  const [portalVisibility, setPortalVisibility] = useState({
    parentPortal: Boolean(initialVisibility.parentPortal ?? true),
    teacherPortal: Boolean(initialVisibility.teacherPortal ?? true),
    studentPortal: Boolean(initialVisibility.studentPortal ?? true),
    accountantPortal: Boolean(initialVisibility.accountantPortal ?? true),
  });
  const [notificationControls, setNotificationControls] = useState({
    email: Boolean(initialNotificationControls.email ?? true),
    sms: Boolean(initialNotificationControls.sms ?? true),
    push: Boolean(initialNotificationControls.push ?? true),
    inApp: Boolean(initialNotificationControls.inApp ?? true),
  });
  const [resultTemplates, setResultTemplates] = useState<ResultTemplateNode[]>(() =>
    (() => {
      const rows = safeArray(initialResult.templates, (item) => {
        const node = (item ?? {}) as Record<string, unknown>;
        const layoutNode = toLayoutNode(node.layout);
        return {
          name: String(node.name ?? ""),
          level: String(node.level ?? ""),
          classGroupName: String(node.classGroupName ?? ""),
          className: String(node.className ?? ""),
          isDefault: node.isDefault === undefined ? false : Boolean(node.isDefault),
          layoutHeader: layoutNode.layoutHeader,
          layoutSectionsText: layoutNode.layoutSectionsText,
        };
      });
      return rows.length > 0 ? rows : buildDefaultResultTemplates();
    })()
  );
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateNode[]>(() =>
    safeArray(initialCommunication.emailTemplates, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        key: String(node.key ?? ""),
        subject: String(node.subject ?? ""),
        body: String(node.body ?? ""),
        isActive: node.isActive === undefined ? true : Boolean(node.isActive),
      };
    })
  );
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplateNode[]>(() =>
    safeArray(initialCommunication.smsTemplates, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        key: String(node.key ?? ""),
        body: String(node.body ?? ""),
        isActive: node.isActive === undefined ? true : Boolean(node.isActive),
      };
    })
  );
  const [attendanceRules, setAttendanceRules] = useState<AttendanceRuleNode[]>(() =>
    safeArray(initialOperations.attendanceRules, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(node.name ?? ""),
        value: String(node.value ?? ""),
        isActive: node.isActive === undefined ? true : Boolean(node.isActive),
      };
    })
  );
  const [schoolCalendar, setSchoolCalendar] = useState<SchoolCalendarNode[]>(() =>
    safeArray(initialOperations.schoolCalendar, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        title: String(node.title ?? ""),
        date: String(node.date ?? ""),
        category: String(node.category ?? ""),
      };
    })
  );
  const [timetableTemplates, setTimetableTemplates] = useState<TimetableTemplateNode[]>(() =>
    safeArray(initialOperations.timetableTemplates, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(node.name ?? ""),
        level: String(node.level ?? ""),
        periods: toPeriods(node.periods),
      };
    })
  );
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannelNode[]>(() =>
    safeArray(initialFinance.paymentChannels, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(node.name ?? ""),
        provider: String(node.provider ?? ""),
        isActive: node.isActive === undefined ? true : Boolean(node.isActive),
        configText: JSON.stringify((node.config ?? {}) as Record<string, unknown>, null, 2),
      };
    })
  );
  const [userRoles, setUserRoles] = useState<UserRoleNode[]>(() =>
    safeArray(initialGovernance.userRoles, (item) => {
      const node = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(node.name ?? ""),
        description: String(node.description ?? ""),
        permissionsText: toStringList(node.permissions).join(", "),
      };
    })
  );

  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [versions, setVersions] = useState<VersionSummary[]>(initialVersions);
  const [sampleName, setSampleName] = useState("");
  const [sampleData, setSampleData] = useState<Record<string, unknown> | null>(null);
  const [mappingStatus, setMappingStatus] = useState("");
  const [activeTab, setActiveTab] = useState<ConfigTab>("academic");

  const [sessionMapping, setSessionMapping] = useState<MappingSpec>({
    arrayKey: "",
    fields: { name: "name", isCurrent: "isCurrent", status: "status" },
  });
  const [termMapping, setTermMapping] = useState<MappingSpec>({
    arrayKey: "",
    fields: { name: "name", sessionName: "sessionName", isCurrent: "isCurrent", status: "status" },
  });
  const [classMapping, setClassMapping] = useState<MappingSpec>({
    arrayKey: "",
    fields: { name: "name" },
  });
  const [classArmMapping, setClassArmMapping] = useState<MappingSpec>({
    arrayKey: "",
    fields: { className: "className", name: "name", subjects: "subjects" },
  });
  const [subjectMapping, setSubjectMapping] = useState<MappingSpec>({
    arrayKey: "",
    fields: { name: "name", className: "className", armName: "armName" },
  });
  const [assessmentMapping, setAssessmentMapping] = useState<MappingSpec>({
    arrayKey: "",
    fields: { name: "name", weight: "weight" },
  });
  const [gradingMapping, setGradingMapping] = useState<MappingSpec>({
    arrayKey: "",
    fields: { min: "min", grade: "grade", gpa: "gpa" },
  });
  const [feeMapping, setFeeMapping] = useState<MappingSpec>({
    arrayKey: "",
    fields: { category: "category", name: "name", amount: "amount", className: "className", isActive: "isActive" },
  });

  const summary = useMemo(
    () => ({
      sessions: sessions.length,
      terms: terms.length,
      classes: classes.length,
      subjects: subjects.length,
      assessments: assessmentTypes.length,
      gradingBands: gradingSystem.length,
      fees: feeStructures.length,
    }),
    [sessions, terms, classes, subjects, assessmentTypes, gradingSystem, feeStructures]
  );

  const tabItems: Array<{ key: ConfigTab; label: string }> = [
    { key: "academic", label: "Academic" },
    { key: "grading", label: "Grading" },
    { key: "fees", label: "Fees" },
    { key: "templates", label: "Result Templates" },
    { key: "communication", label: "Communication" },
    { key: "portal", label: "Portal" },
    { key: "operations", label: "Operations" },
    { key: "channels", label: "Channels & Roles" },
    { key: "import", label: "Import Wizard" },
    { key: "release", label: "Publish & Versions" },
  ];

  function tabClass(key: ConfigTab) {
    return key === activeTab
      ? "rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
      : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50";
  }

  const sampleArrayKeys = useMemo(() => {
    if (!sampleData) return [];
    return Object.entries(sampleData)
      .filter(([, value]) => Array.isArray(value))
      .map(([key]) => key);
  }, [sampleData]);

  function sampleFieldsForArray(arrayKey: string): string[] {
    if (!sampleData || !arrayKey) return [];
    const arr = sampleData[arrayKey];
    if (!Array.isArray(arr) || !arr.length) return [];
    const first = arr[0];
    if (!first || typeof first !== "object") return [];
    return Object.keys(first as Record<string, unknown>);
  }

  function readMappedRows(spec: MappingSpec): SampleRecord[] {
    if (!sampleData || !spec.arrayKey) return [];
    const source = sampleData[spec.arrayKey];
    if (!Array.isArray(source)) return [];
    return source.filter((item) => item && typeof item === "object") as SampleRecord[];
  }

  function mapField(row: SampleRecord, key: string): unknown {
    const sourceKey = key?.trim();
    if (!sourceKey) return undefined;
    return row[sourceKey];
  }

  function parseWorkbookToSampleData(arrayBuffer: ArrayBuffer): Record<string, unknown> {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const parsed: Record<string, unknown> = {};

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      parsed[sheetName] = rows;
    });

    return parsed;
  }

  function parseJsonObject(raw: string, label: string) {
    const parsed = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object.`);
    }
    return parsed as Record<string, unknown>;
  }

  function normalizeKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function pickBestField(fieldKeys: string[], aliases: string[]): string {
    if (!fieldKeys.length) return "";
    const normalizedAliases = aliases.map(normalizeKey);

    for (const key of fieldKeys) {
      const nk = normalizeKey(key);
      if (normalizedAliases.includes(nk)) return key;
    }

    for (const key of fieldKeys) {
      const nk = normalizeKey(key);
      if (normalizedAliases.some((alias) => nk.includes(alias) || alias.includes(nk))) return key;
    }

    return "";
  }

  function suggestArrayKey(parsed: Record<string, unknown>, aliases: string[]): string {
    const keys = Object.keys(parsed).filter((key) => Array.isArray(parsed[key]));
    if (!keys.length) return "";

    const normalizedAliases = aliases.map(normalizeKey);
    const exact = keys.find((key) => normalizedAliases.includes(normalizeKey(key)));
    if (exact) return exact;

    const partial = keys.find((key) => normalizedAliases.some((alias) => normalizeKey(key).includes(alias) || alias.includes(normalizeKey(key))));
    if (partial) return partial;

    return keys[0];
  }

  function autoDetectMappings(parsed: Record<string, unknown>) {
    const buildSpec = (
      aliases: string[],
      targetFields: Record<string, string[]>,
      current: MappingSpec
    ): MappingSpec => {
      const arrayKey = suggestArrayKey(parsed, aliases);
      const fields = sampleFieldsForArrayFrom(parsed, arrayKey);
      const nextFields: Record<string, string> = { ...current.fields };

      Object.entries(targetFields).forEach(([target, targetAliases]) => {
        const suggested = pickBestField(fields, targetAliases);
        if (suggested) nextFields[target] = suggested;
      });

      return { arrayKey, fields: nextFields };
    };

    setSessionMapping((prev) =>
      buildSpec(
        ["sessions", "session"],
        { name: ["name", "sessionname"], isCurrent: ["iscurrent", "current", "active"], status: ["status"] },
        prev
      )
    );
    setTermMapping((prev) =>
      buildSpec(
        ["terms", "term"],
        { name: ["name", "termname"], sessionName: ["sessionname", "session"], isCurrent: ["iscurrent", "current", "active"], status: ["status"] },
        prev
      )
    );
    setClassMapping((prev) => buildSpec(["classes", "class"], { name: ["name", "classname", "class"] }, prev));
    setClassArmMapping((prev) =>
      buildSpec(
        ["classarms", "class_arms", "arms", "classarm"],
        { className: ["classname", "class"], name: ["name", "arm", "armname"], subjects: ["subjects", "subjectlist", "assignedsubjects"] },
        prev
      )
    );
    setSubjectMapping((prev) =>
      buildSpec(["subjects", "subject"], { name: ["name", "subjectname", "subject"], className: ["classname", "class"], armName: ["armname", "arm"] }, prev)
    );
    setAssessmentMapping((prev) =>
      buildSpec(["assessmenttypes", "assessments", "assessment"], { name: ["name", "assessmentname", "component"], weight: ["weight", "percentage", "percent"] }, prev)
    );
    setGradingMapping((prev) =>
      buildSpec(["gradingsystem", "grading", "grades", "gradebands"], { min: ["min", "minimum", "scorefrom"], grade: ["grade", "letter"], gpa: ["gpa", "point"] }, prev)
    );
    setFeeMapping((prev) =>
      buildSpec(
        ["feestructures", "fees", "feeitems", "fee"],
        { category: ["category", "group"], name: ["name", "feename", "item"], amount: ["amount", "value", "price"], className: ["classname", "class"], isActive: ["isactive", "active", "enabled"] },
        prev
      )
    );
  }

  function downloadJsonTemplate() {
    const template = {
      sessions: [{ name: "2026/2027", isCurrent: true, status: "ACTIVE" }],
      terms: [{ name: "First Term", sessionName: "2026/2027", isCurrent: true, status: "ACTIVE" }],
      classes: [
        { name: "JSS 1", arms: [{ name: "A", subjects: ["Mathematics", "English"] }, { name: "B", subjects: ["Mathematics", "Basic Science"] }] },
        { name: "JSS 2", arms: [{ name: "A", subjects: ["Mathematics", "English"] }] },
      ],
      classArms: [
        { className: "JSS 1", name: "A", subjects: "Mathematics, English" },
        { className: "JSS 1", name: "B", subjects: "Mathematics, Basic Science" },
      ],
      subjects: [
        { name: "Mathematics", className: "JSS 1", armName: "A" },
        { name: "English", className: "JSS 1", armName: "A" },
      ],
      assessmentTypes: [{ name: "Test 1", weight: 20 }, { name: "Exam", weight: 80 }],
      gradingSystem: [{ min: 70, grade: "A", gpa: 5 }, { min: 60, grade: "B", gpa: 4 }, { min: 0, grade: "F", gpa: 0 }],
      feeStructures: [{ category: "Tuition", name: "Term Tuition", amount: 65000, className: "JSS 1", isActive: true }],
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sckoolsuite-config-template.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadExcelTemplate() {
    const workbook = XLSX.utils.book_new();

    const sheets: Record<string, Array<Record<string, unknown>>> = {
      sessions: [{ name: "2026/2027", isCurrent: true, status: "ACTIVE" }],
      terms: [{ name: "First Term", sessionName: "2026/2027", isCurrent: true, status: "ACTIVE" }],
      classes: [
        { name: "JSS 1", arms: "See classArms sheet" },
        { name: "JSS 2", arms: "See classArms sheet" },
      ],
      classArms: [
        { className: "JSS 1", name: "A", subjects: "Mathematics, English" },
        { className: "JSS 1", name: "B", subjects: "Mathematics, Basic Science" },
      ],
      subjects: [{ name: "Mathematics", className: "JSS 1", armName: "A" }, { name: "English", className: "JSS 1", armName: "A" }],
      assessmentTypes: [{ name: "Test 1", weight: 20 }, { name: "Exam", weight: 80 }],
      gradingSystem: [{ min: 70, grade: "A", gpa: 5 }, { min: 60, grade: "B", gpa: 4 }, { min: 0, grade: "F", gpa: 0 }],
      feeStructures: [{ category: "Tuition", name: "Term Tuition", amount: 65000, className: "JSS 1", isActive: true }],
    };

    Object.entries(sheets).forEach(([sheetName, rows]) => {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, "sckoolsuite-config-template.xlsx");
  }

  function sampleFieldsForArrayFrom(data: Record<string, unknown>, arrayKey: string): string[] {
    if (!arrayKey) return [];
    const arr = data[arrayKey];
    if (!Array.isArray(arr) || !arr.length) return [];
    const first = arr[0];
    if (!first || typeof first !== "object") return [];
    return Object.keys(first as Record<string, unknown>);
  }

  async function handleSampleUpload(file: File) {
    try {
      const ext = file.name.toLowerCase().split(".").pop();

      if (ext === "json") {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (Array.isArray(parsed)) {
          const normalized = { data: parsed };
          setSampleData(normalized);
          setSampleName(file.name);
          autoDetectMappings(normalized);
          setMappingStatus(`Loaded sample: ${file.name}`);
          return;
        }

        if (!parsed || typeof parsed !== "object") {
          setMappingStatus("JSON sample must be an object or array.");
          return;
        }

        const normalized = parsed as Record<string, unknown>;
        setSampleData(normalized);
        setSampleName(file.name);
        autoDetectMappings(normalized);
        setMappingStatus(`Loaded sample: ${file.name}`);
        return;
      }

      if (ext === "csv" || ext === "xlsx" || ext === "xls") {
        const arrayBuffer = await file.arrayBuffer();
        const parsed = parseWorkbookToSampleData(arrayBuffer);
        if (!Object.keys(parsed).length) {
          setMappingStatus("No tabular rows found in uploaded spreadsheet.");
          return;
        }

        setSampleData(parsed);
        setSampleName(file.name);
        autoDetectMappings(parsed);
        setMappingStatus(`Loaded sample: ${file.name}`);
        return;
      }

      setMappingStatus("Unsupported file type. Upload JSON, CSV, XLSX, or XLS.");
    } catch {
      setMappingStatus("Unable to parse sample. Upload a valid JSON, CSV, or Excel file.");
    }
  }

  function applyMappingFromSample() {
    if (!sampleData) {
      setMappingStatus("Upload a sample first.");
      return;
    }

    const mappedSessions = readMappedRows(sessionMapping).map((row) => ({
      name: String(mapField(row, sessionMapping.fields.name) ?? ""),
      isCurrent: Boolean(mapField(row, sessionMapping.fields.isCurrent)),
      status: String(mapField(row, sessionMapping.fields.status) ?? "DRAFT"),
    }));

    const mappedTerms = readMappedRows(termMapping).map((row) => ({
      name: String(mapField(row, termMapping.fields.name) ?? ""),
      sessionName: String(mapField(row, termMapping.fields.sessionName) ?? ""),
      isCurrent: Boolean(mapField(row, termMapping.fields.isCurrent)),
      status: String(mapField(row, termMapping.fields.status) ?? "DRAFT"),
    }));

    const mappedClasses = readMappedRows(classMapping).map((row) => ({
      name: String(mapField(row, classMapping.fields.name) ?? ""),
      arms: [],
    }));

    const mappedClassArms = readMappedRows(classArmMapping).map((row) => ({
      className: String(mapField(row, classArmMapping.fields.className) ?? ""),
      name: String(mapField(row, classArmMapping.fields.name) ?? ""),
      subjects: String(mapField(row, classArmMapping.fields.subjects) ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));

    const mappedSubjects = readMappedRows(subjectMapping).map((row) => ({
      name: String(mapField(row, subjectMapping.fields.name) ?? ""),
      className: String(mapField(row, subjectMapping.fields.className) ?? ""),
      armName: String(mapField(row, subjectMapping.fields.armName) ?? ""),
    }));

    const mappedAssessments = readMappedRows(assessmentMapping).map((row) => ({
      name: String(mapField(row, assessmentMapping.fields.name) ?? ""),
      weight: Number(mapField(row, assessmentMapping.fields.weight) ?? 0),
    }));

    const mappedGrading = readMappedRows(gradingMapping).map((row) => ({
      min: Number(mapField(row, gradingMapping.fields.min) ?? 0),
      grade: String(mapField(row, gradingMapping.fields.grade) ?? ""),
      gpa: Number(mapField(row, gradingMapping.fields.gpa) ?? 0),
    }));

    const mappedFees = readMappedRows(feeMapping).map((row) => ({
      category: String(mapField(row, feeMapping.fields.category) ?? ""),
      name: String(mapField(row, feeMapping.fields.name) ?? ""),
      amount: Number(mapField(row, feeMapping.fields.amount) ?? 0),
      className: String(mapField(row, feeMapping.fields.className) ?? ""),
      isActive: mapField(row, feeMapping.fields.isActive) === undefined ? true : Boolean(mapField(row, feeMapping.fields.isActive)),
    }));

    if (mappedSessions.length) setSessions(mappedSessions);
    if (mappedTerms.length) setTerms(mappedTerms);
    if (mappedClasses.length || mappedClassArms.length) {
      const classMap = new Map<string, ClassNode>();
      mappedClasses.forEach((item) => {
        classMap.set(item.name, { name: item.name, arms: item.arms ?? [] });
      });
      mappedClassArms.forEach((item) => {
        const key = item.className;
        if (!key) return;
        const existing = classMap.get(key) ?? { name: key, arms: [] };
        existing.arms = [...existing.arms, { name: item.name, subjects: item.subjects }];
        classMap.set(key, existing);
      });
      setClasses(Array.from(classMap.values()));
    }
    if (mappedSubjects.length) setSubjects(mappedSubjects);
    if (mappedAssessments.length) setAssessmentTypes(mappedAssessments);
    if (mappedGrading.length) setGradingSystem(mappedGrading);
    if (mappedFees.length) setFeeStructures(mappedFees);

    setMappingStatus("Sample mapping applied to structured fields. Review and publish.");
  }

  async function refreshVersions() {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin/settings/config", { method: "GET" });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? "Failed to refresh configuration list.");
        return;
      }
      setVersions(payload.versions as VersionSummary[]);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function publishConfig() {
    setStatus("");
    setIsSaving(true);

    try {
      const academic = {
        sessions: sessions.filter((item) => item.name.trim()).map((item) => ({
          name: item.name.trim(),
          isCurrent: Boolean(item.isCurrent),
          status: item.status?.trim() || "DRAFT",
        })),
        terms: terms.filter((item) => item.name.trim()).map((item) => ({
          name: item.name.trim(),
          sessionName: item.sessionName?.trim() || undefined,
          isCurrent: Boolean(item.isCurrent),
          status: item.status?.trim() || "DRAFT",
        })),
        classes: classes.filter((item) => item.name.trim()).map((item) => ({
          name: item.name.trim(),
          arms: item.arms
            .filter((arm) => arm.name.trim() || arm.subjects.length)
            .map((arm) => ({
              name: arm.name.trim(),
              subjects: arm.subjects.filter((subject) => subject.trim()).map((subject) => subject.trim()),
            })),
        })),
        arms: [],
        subjects: subjects.filter((item) => item.name.trim()).map((item) => ({
          name: item.name.trim(),
          className: item.className?.trim() || undefined,
          armName: item.armName?.trim() || undefined,
        })),
        assessmentTypes: assessmentTypes
          .filter((item) => item.name.trim())
          .map((item) => ({ name: item.name.trim(), weight: Number(item.weight) || 0 })),
        gradingSystem: gradingSystem
          .filter((item) => item.grade.trim())
          .map((item) => ({ min: Number(item.min) || 0, grade: item.grade.trim(), gpa: Number(item.gpa) || 0 })),
        classGroupPolicies: classGroupPolicies
          .filter((item) => item.groupName.trim())
          .map((item) => ({
            groupName: item.groupName.trim(),
            caWeight: Number(item.caWeight) || 0,
            examWeight: Number(item.examWeight) || 0,
            passMark: Number(item.passMark) || 0,
            promotionRule: item.promotionRule?.trim() || undefined,
            gradeBands: parseGradingBandsText(item.gradeBandsText),
            attendanceGradeBands: parseGradingBandsText(item.attendanceGradeBandsText),
            assessmentComponents: parseAssessmentComponentsText(item.assessmentComponentsText),
          })),
      };

      const finance = {
        feeStructures: feeStructures
          .filter((item) => item.category.trim() && item.name.trim())
          .map((item) => ({
            category: item.category.trim(),
            name: item.name.trim(),
            amount: Number(item.amount) || 0,
            className: item.className?.trim() || undefined,
            isActive: item.isActive !== false,
          })),
        paymentChannels: paymentChannels
          .filter((item) => item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            provider: item.provider?.trim() || undefined,
            isActive: item.isActive !== false,
            config: parseJsonObject(item.configText, `Payment channel config (${item.name || "new"})`),
          })),
      };

      const result = {
        templates: resultTemplates
          .filter((item) => item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            level: item.level?.trim() || undefined,
            classGroupName: item.classGroupName?.trim() || undefined,
            className: item.className?.trim() || undefined,
            isDefault: item.isDefault === true,
            layout: {
              header: item.layoutHeader,
              sections: item.layoutSectionsText
                .split(",")
                .map((section) => section.trim())
                .filter(Boolean),
            },
          })),
      };

      const communication = {
        emailTemplates: emailTemplates
          .filter((item) => item.key.trim() && item.subject.trim() && item.body.trim())
          .map((item) => ({
            key: item.key.trim(),
            subject: item.subject.trim(),
            body: item.body.trim(),
            isActive: item.isActive !== false,
          })),
        smsTemplates: smsTemplates
          .filter((item) => item.key.trim() && item.body.trim())
          .map((item) => ({
            key: item.key.trim(),
            body: item.body.trim(),
            isActive: item.isActive !== false,
          })),
      };

      const operations = {
        attendanceRules: attendanceRules
          .filter((item) => item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            value: item.value?.trim() || undefined,
            isActive: item.isActive !== false,
          })),
        schoolCalendar: schoolCalendar
          .filter((item) => item.title.trim() && item.date.trim())
          .map((item) => ({
            title: item.title.trim(),
            date: item.date.trim(),
            category: item.category?.trim() || undefined,
          })),
        timetableTemplates: timetableTemplates
          .filter((item) => item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            level: item.level?.trim() || undefined,
            periods: item.periods
              .filter((period) => period.day.trim() && period.subject.trim())
              .map((period) => ({
                day: period.day.trim(),
                period: Number(period.period) || 1,
                subject: period.subject.trim(),
                startTime: period.startTime?.trim() || undefined,
                endTime: period.endTime?.trim() || undefined,
              })),
          })),
      };

      const governance = {
        userRoles: userRoles
          .filter((item) => item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            description: item.description?.trim() || undefined,
            permissions: item.permissionsText
              .split(",")
              .map((permission) => permission.trim())
              .filter(Boolean),
          })),
      };

      const portal = {
        visibility: portalVisibility,
        notificationControls,
      };

      const response = await fetch("/api/admin/settings/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "manual",
          notes: notes || undefined,
          config: { academic, finance, result, communication, operations, governance, portal },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? "Failed to publish configuration.");
        return;
      }

      setStatus(`Published version v${payload.version} successfully.`);
      setNotes("");
      await refreshVersions();
    } catch {
      setStatus("Unable to publish configuration. Please check form values.");
    } finally {
      setIsSaving(false);
    }
  }

  async function activateVersion(id: string) {
    setStatus("");
    const response = await fetch(`/api/admin/settings/config/${id}/activate`, { method: "POST" });
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Failed to activate configuration version.");
      return;
    }

    setStatus(`Activated version v${payload.version}.`);
    await refreshVersions();
  }

  return (
    <div className="space-y-6">
      <div className="glass-soft rounded-xl p-3">
        <div className="flex flex-wrap gap-2">
          {tabItems.map((item) => (
            <button key={item.key} type="button" className={tabClass(item.key)} onClick={() => setActiveTab(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "import" ? <section className="glass-soft rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-900">Sample Upload & Mapping Wizard</h3>
        <p className="mt-1 text-xs text-slate-500">Upload a school sample JSON, map columns to config fields, and apply in one click.</p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Sample File (JSON/CSV/XLSX/XLS)</p>
            <Input
              className="mt-1"
              type="file"
              accept="application/json,.json,text/csv,.csv,application/vnd.ms-excel,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleSampleUpload(file);
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (!sampleData) {
                setMappingStatus("Upload a sample first.");
                return;
              }
              autoDetectMappings(sampleData);
              setMappingStatus("Mapping fields auto-detected. Review and apply.");
            }}
          >
            Auto-detect Mapping
          </Button>
          <Button variant="outline" onClick={downloadJsonTemplate}>Download JSON Template</Button>
          <Button variant="outline" onClick={downloadExcelTemplate}>Download Excel Template</Button>
          <Button variant="outline" onClick={applyMappingFromSample}>Apply Mapping To Form</Button>
          {sampleName ? <span className="text-xs text-slate-600">Loaded: {sampleName}</span> : null}
        </div>

        {sampleArrayKeys.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <MappingCard
              title="Sessions"
              arrayKeys={sampleArrayKeys}
              fieldKeys={sampleFieldsForArray(sessionMapping.arrayKey)}
              spec={sessionMapping}
              onChange={setSessionMapping}
              targetFields={["name", "isCurrent", "status"]}
              targetFieldAliases={{ name: ["name", "sessionname"], isCurrent: ["iscurrent", "current", "active"], status: ["status"] }}
            />
            <MappingCard
              title="Terms"
              arrayKeys={sampleArrayKeys}
              fieldKeys={sampleFieldsForArray(termMapping.arrayKey)}
              spec={termMapping}
              onChange={setTermMapping}
              targetFields={["name", "sessionName", "isCurrent", "status"]}
              targetFieldAliases={{ name: ["name", "termname"], sessionName: ["session", "sessionname"], isCurrent: ["iscurrent", "current", "active"], status: ["status"] }}
            />
            <MappingCard
              title="Classes"
              arrayKeys={sampleArrayKeys}
              fieldKeys={sampleFieldsForArray(classMapping.arrayKey)}
              spec={classMapping}
              onChange={setClassMapping}
              targetFields={["name"]}
              targetFieldAliases={{ name: ["name", "classname", "class"] }}
            />
            <MappingCard
              title="Class Arms"
              arrayKeys={sampleArrayKeys}
              fieldKeys={sampleFieldsForArray(classArmMapping.arrayKey)}
              spec={classArmMapping}
              onChange={setClassArmMapping}
              targetFields={["className", "name", "subjects"]}
              targetFieldAliases={{ className: ["classname", "class"], name: ["name", "arm", "armname"], subjects: ["subjects", "subjectlist", "assignedsubjects"] }}
            />
            <MappingCard
              title="Subjects"
              arrayKeys={sampleArrayKeys}
              fieldKeys={sampleFieldsForArray(subjectMapping.arrayKey)}
              spec={subjectMapping}
              onChange={setSubjectMapping}
              targetFields={["name", "className", "armName"]}
              targetFieldAliases={{ name: ["name", "subjectname", "subject"], className: ["classname", "class"], armName: ["armname", "arm"] }}
            />
            <MappingCard
              title="Assessment Types"
              arrayKeys={sampleArrayKeys}
              fieldKeys={sampleFieldsForArray(assessmentMapping.arrayKey)}
              spec={assessmentMapping}
              onChange={setAssessmentMapping}
              targetFields={["name", "weight"]}
              targetFieldAliases={{ name: ["name", "assessmentname", "component"], weight: ["weight", "percentage", "percent"] }}
            />
            <MappingCard
              title="Grading Bands"
              arrayKeys={sampleArrayKeys}
              fieldKeys={sampleFieldsForArray(gradingMapping.arrayKey)}
              spec={gradingMapping}
              onChange={setGradingMapping}
              targetFields={["min", "grade", "gpa"]}
              targetFieldAliases={{ min: ["min", "minimum", "scorefrom"], grade: ["grade", "letter"], gpa: ["gpa", "point"] }}
            />
            <MappingCard
              title="Fee Structures"
              arrayKeys={sampleArrayKeys}
              fieldKeys={sampleFieldsForArray(feeMapping.arrayKey)}
              spec={feeMapping}
              onChange={setFeeMapping}
              targetFields={["category", "name", "amount", "className", "isActive"]}
              targetFieldAliases={{ category: ["category", "group"], name: ["name", "feename", "item"], amount: ["amount", "value", "price"], className: ["classname", "class"], isActive: ["isactive", "active", "enabled"] }}
            />
          </div>
        ) : null}

        {mappingStatus ? <p className="mt-3 text-sm text-slate-600">{mappingStatus}</p> : null}
      </section> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-soft rounded-xl p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active Version</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">v{initialActive.version}</p>
        </div>
        <div className="glass-soft rounded-xl p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Source</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{initialActive.source}</p>
        </div>
        <div className="glass-soft rounded-xl p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Academic Nodes</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{summary.sessions + summary.terms + summary.classes + summary.subjects}</p>
        </div>
        <div className="glass-soft rounded-xl p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Fee Definitions</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{summary.fees}</p>
        </div>
      </div>

      {(activeTab === "academic" || activeTab === "grading") ? <div className="grid gap-6 xl:grid-cols-2">
        {activeTab === "academic" ? <section className="glass-soft rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900">Academic Configuration</h3>
          <p className="mt-1 text-xs text-slate-500">Define sessions, terms, classes, and subjects without hardcoded values.</p>

          <div className="mt-4 space-y-5">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sessions</p>
                <Button size="sm" variant="outline" onClick={() => setSessions((prev) => [...prev, { name: "", status: "DRAFT" }])}>Add Session</Button>
              </div>
              <div className="space-y-3">
                {sessions.map((item, index) => (
                  <div key={`session-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_auto_auto]">
                    <Input value={item.name} onChange={(e) => setSessions((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="Session name" />
                    <Input value={item.status ?? ""} onChange={(e) => setSessions((prev) => prev.map((row, i) => (i === index ? { ...row, status: e.target.value } : row)))} placeholder="Status" />
                    <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <input type="checkbox" checked={Boolean(item.isCurrent)} onChange={(e) => setSessions((prev) => prev.map((row, i) => (i === index ? { ...row, isCurrent: e.target.checked } : row)))} />
                      Current
                    </label>
                    <Button size="sm" variant="outline" onClick={() => setSessions((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terms</p>
                <Button size="sm" variant="outline" onClick={() => setTerms((prev) => [...prev, { name: "", sessionName: "", status: "DRAFT" }])}>Add Term</Button>
              </div>
              <div className="space-y-3">
                {terms.map((item, index) => (
                  <div key={`term-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_140px_auto_auto]">
                    <Input value={item.name} onChange={(e) => setTerms((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="Term name" />
                    <Input value={item.sessionName ?? ""} onChange={(e) => setTerms((prev) => prev.map((row, i) => (i === index ? { ...row, sessionName: e.target.value } : row)))} placeholder="Session name" />
                    <Input value={item.status ?? ""} onChange={(e) => setTerms((prev) => prev.map((row, i) => (i === index ? { ...row, status: e.target.value } : row)))} placeholder="Status" />
                    <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <input type="checkbox" checked={Boolean(item.isCurrent)} onChange={(e) => setTerms((prev) => prev.map((row, i) => (i === index ? { ...row, isCurrent: e.target.checked } : row)))} />
                      Current
                    </label>
                    <Button size="sm" variant="outline" onClick={() => setTerms((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Classes, Arms & Subjects</p>
                <Button size="sm" variant="outline" onClick={() => setClasses((prev) => [...prev, { name: "", arms: [] }])}>Add Class</Button>
              </div>
              <div className="space-y-4">
                {classes.map((item, index) => (
                  <div key={`class-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                      <Input value={item.name} onChange={(e) => setClasses((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="Class name" />
                      <Button size="sm" variant="outline" onClick={() => setClasses((prev) => prev.filter((_, i) => i !== index))}>Remove Class</Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Arms</p>
                        <Button size="sm" variant="outline" onClick={() => setClasses((prev) => prev.map((row, i) => (i === index ? { ...row, arms: [...row.arms, { name: "", subjects: [] }] } : row)))}>Add Arm</Button>
                      </div>
                      {item.arms.length ? item.arms.map((arm, armIndex) => (
                        <div key={`class-${index}-arm-${armIndex}`} className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_auto]">
                          <Input
                            value={arm.name}
                            onChange={(e) => setClasses((prev) => prev.map((row, i) => i === index ? {
                              ...row,
                              arms: row.arms.map((rowArm, j) => (j === armIndex ? { ...rowArm, name: e.target.value } : rowArm)),
                            } : row))}
                            placeholder="Arm"
                          />
                          <Input
                            value={arm.subjects.join(", ")}
                            onChange={(e) => setClasses((prev) => prev.map((row, i) => i === index ? {
                              ...row,
                              arms: row.arms.map((rowArm, j) => (j === armIndex ? { ...rowArm, subjects: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : rowArm)),
                            } : row))}
                            placeholder="Assigned subjects, comma separated"
                          />
                          <Button size="sm" variant="outline" onClick={() => setClasses((prev) => prev.map((row, i) => i === index ? { ...row, arms: row.arms.filter((_, j) => j !== armIndex) } : row))}>Remove Arm</Button>
                        </div>
                      )) : <p className="text-xs text-slate-500">No arms added yet. Add A, B, C streams and assign different subjects per arm.</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {subjects.map((item, index) => (
                  <div key={`subject-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <Input value={item.name} onChange={(e) => setSubjects((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="Subject name" />
                    <Input value={item.className ?? ""} onChange={(e) => setSubjects((prev) => prev.map((row, i) => (i === index ? { ...row, className: e.target.value } : row)))} placeholder="Class name" />
                    <Input value={item.armName ?? ""} onChange={(e) => setSubjects((prev) => prev.map((row, i) => (i === index ? { ...row, armName: e.target.value } : row)))} placeholder="Arm" />
                    <Button size="sm" variant="outline" onClick={() => setSubjects((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setSubjects((prev) => [...prev, { name: "", className: "", armName: "" }])}>Add Subject</Button>
              </div>
            </div>
          </div>
        </section> : null}

        {activeTab === "grading" ? <section className="glass-soft rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900">Grading & Assessment Configuration</h3>
          <p className="mt-1 text-xs text-slate-500">Define assessment weights and grading policies per class group.</p>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assessment Types</p>
              <Button size="sm" variant="outline" onClick={() => setAssessmentTypes((prev) => [...prev, { name: "", weight: 0 }])}>Add Assessment</Button>
            </div>
            <div className="space-y-3">
              {assessmentTypes.map((item, index) => (
                <div key={`assessment-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_auto]">
                  <Input value={item.name} onChange={(e) => setAssessmentTypes((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="Name" />
                  <Input type="number" value={item.weight} onChange={(e) => setAssessmentTypes((prev) => prev.map((row, i) => (i === index ? { ...row, weight: Number(e.target.value) } : row)))} placeholder="Weight" />
                  <Button size="sm" variant="outline" onClick={() => setAssessmentTypes((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grading Bands</p>
              <Button size="sm" variant="outline" onClick={() => setGradingSystem((prev) => [...prev, { min: 0, grade: "", gpa: 0 }])}>Add Band</Button>
            </div>
            <div className="space-y-3">
              {gradingSystem.map((item, index) => (
                <div key={`grading-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_120px_auto]">
                  <Input type="number" value={item.min} onChange={(e) => setGradingSystem((prev) => prev.map((row, i) => (i === index ? { ...row, min: Number(e.target.value) } : row)))} placeholder="Min" />
                  <Input value={item.grade} onChange={(e) => setGradingSystem((prev) => prev.map((row, i) => (i === index ? { ...row, grade: e.target.value } : row)))} placeholder="Grade" />
                  <Input type="number" value={item.gpa} onChange={(e) => setGradingSystem((prev) => prev.map((row, i) => (i === index ? { ...row, gpa: Number(e.target.value) } : row)))} placeholder="GPA" />
                  <Button size="sm" variant="outline" onClick={() => setGradingSystem((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Per Class Group Grading Policies</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setClassGroupPolicies((prev) => [
                    ...prev,
                    {
                      groupName: "",
                      caWeight: 40,
                      examWeight: 60,
                      passMark: 50,
                      promotionRule: "Promote if average >= pass mark",
                      gradeBandsText: "70:A:5\n60:B:4\n50:C:3\n45:D:2\n0:F:0",
                      attendanceGradeBandsText: "95:A:5\n85:B:4\n75:C:3\n60:D:2\n0:F:0",
                      assessmentComponentsText: "Cognitive:100\nAffective:100\nPsychomotor:100",
                    },
                  ])
                }
              >
                Add Group Policy
              </Button>
            </div>
            <p className="mb-3 text-xs text-slate-500">Use format min:grade:gpa for bands and name:maxScore for assessments.</p>
            <div className="space-y-4">
              {classGroupPolicies.map((item, index) => (
                <div key={`group-policy-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_120px_120px_auto]">
                    <Input
                      value={item.groupName}
                      onChange={(e) =>
                        setClassGroupPolicies((prev) => prev.map((row, i) => (i === index ? { ...row, groupName: e.target.value } : row)))
                      }
                      placeholder="Class group name (e.g. Prenursery, Primary)"
                    />
                    <Input
                      type="number"
                      value={item.caWeight}
                      onChange={(e) =>
                        setClassGroupPolicies((prev) => prev.map((row, i) => (i === index ? { ...row, caWeight: Number(e.target.value) } : row)))
                      }
                      placeholder="CA %"
                    />
                    <Input
                      type="number"
                      value={item.examWeight}
                      onChange={(e) =>
                        setClassGroupPolicies((prev) => prev.map((row, i) => (i === index ? { ...row, examWeight: Number(e.target.value) } : row)))
                      }
                      placeholder="Exam %"
                    />
                    <Input
                      type="number"
                      value={item.passMark}
                      onChange={(e) =>
                        setClassGroupPolicies((prev) => prev.map((row, i) => (i === index ? { ...row, passMark: Number(e.target.value) } : row)))
                      }
                      placeholder="Pass Mark"
                    />
                    <Button size="sm" variant="outline" onClick={() => setClassGroupPolicies((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>

                  <Input
                    className="mt-3"
                    value={item.promotionRule ?? ""}
                    onChange={(e) =>
                      setClassGroupPolicies((prev) => prev.map((row, i) => (i === index ? { ...row, promotionRule: e.target.value } : row)))
                    }
                    placeholder="Promotion Rule"
                  />

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Textarea
                      value={item.gradeBandsText}
                      onChange={(e) =>
                        setClassGroupPolicies((prev) => prev.map((row, i) => (i === index ? { ...row, gradeBandsText: e.target.value } : row)))
                      }
                      className="min-h-24 text-xs"
                      placeholder="Grade bands: min:grade:gpa"
                    />
                    <Textarea
                      value={item.attendanceGradeBandsText}
                      onChange={(e) =>
                        setClassGroupPolicies((prev) => prev.map((row, i) => (i === index ? { ...row, attendanceGradeBandsText: e.target.value } : row)))
                      }
                      className="min-h-24 text-xs"
                      placeholder="Attendance bands: min:grade:gpa"
                    />
                    <Textarea
                      value={item.assessmentComponentsText}
                      onChange={(e) =>
                        setClassGroupPolicies((prev) => prev.map((row, i) => (i === index ? { ...row, assessmentComponentsText: e.target.value } : row)))
                      }
                      className="min-h-24 text-xs"
                      placeholder="Assessments: name:maxScore"
                    />
                  </div>
                </div>
              ))}
              {classGroupPolicies.length === 0 ? <p className="text-xs text-slate-500">No class group policies yet.</p> : null}
            </div>
          </div>

        </section> : null}
      </div> : null}

      {activeTab === "fees" ? <section className="glass-soft rounded-xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Fee Structures</h3>
            <p className="mt-1 text-xs text-slate-500">Create clear fee items with category, amount, and optional class targeting.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setFeeStructures((prev) => [...prev, { category: "", name: "", amount: 0, className: "", isActive: true }])}>Add Fee Item</Button>
        </div>

        <div className="mt-5 space-y-4">
          {feeStructures.map((item, index) => (
            <div key={`fee-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-600">Category</p>
                  <Input value={item.category} onChange={(e) => setFeeStructures((prev) => prev.map((row, i) => (i === index ? { ...row, category: e.target.value } : row)))} placeholder="e.g. Tuition" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-600">Fee Name</p>
                  <Input value={item.name} onChange={(e) => setFeeStructures((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="e.g. First Term Tuition" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-600">Amount</p>
                  <Input type="number" value={item.amount} onChange={(e) => setFeeStructures((prev) => prev.map((row, i) => (i === index ? { ...row, amount: Number(e.target.value) } : row)))} placeholder="Amount" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-600">Class (Optional)</p>
                  <Input value={item.className ?? ""} onChange={(e) => setFeeStructures((prev) => prev.map((row, i) => (i === index ? { ...row, className: e.target.value } : row)))} placeholder="e.g. Grade 5" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={item.isActive !== false} onChange={(e) => setFeeStructures((prev) => prev.map((row, i) => (i === index ? { ...row, isActive: e.target.checked } : row)))} />
                  Active Fee Item
                </label>
                <Button size="sm" variant="outline" onClick={() => setFeeStructures((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
              </div>
            </div>
          ))}
          {feeStructures.length === 0 ? <p className="text-xs text-slate-500">No fee items yet.</p> : null}
        </div>
      </section> : null}

      {activeTab === "portal" ? <section className="glass-soft rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-900">Portal Visibility Configuration</h3>
        <p className="mt-1 text-xs text-slate-500">Control which portals are available to each school.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={portalVisibility.parentPortal} onChange={(e) => setPortalVisibility((prev) => ({ ...prev, parentPortal: e.target.checked }))} />
            Parent Portal
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={portalVisibility.teacherPortal} onChange={(e) => setPortalVisibility((prev) => ({ ...prev, teacherPortal: e.target.checked }))} />
            Teacher Portal
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={portalVisibility.studentPortal} onChange={(e) => setPortalVisibility((prev) => ({ ...prev, studentPortal: e.target.checked }))} />
            Student Portal
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={portalVisibility.accountantPortal} onChange={(e) => setPortalVisibility((prev) => ({ ...prev, accountantPortal: e.target.checked }))} />
            Accountant Portal
          </label>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Notification Controls</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={notificationControls.email} onChange={(e) => setNotificationControls((prev) => ({ ...prev, email: e.target.checked }))} />
            Email Notifications
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={notificationControls.sms} onChange={(e) => setNotificationControls((prev) => ({ ...prev, sms: e.target.checked }))} />
            SMS Notifications
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={notificationControls.push} onChange={(e) => setNotificationControls((prev) => ({ ...prev, push: e.target.checked }))} />
            Push Notifications
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={notificationControls.inApp} onChange={(e) => setNotificationControls((prev) => ({ ...prev, inApp: e.target.checked }))} />
            In-App Notifications
          </label>
        </div>
      </section> : null}

      {activeTab === "templates" ? <section className="glass-soft rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-900">Result Templates</h3>
        <p className="mt-1 text-xs text-slate-500">Manage dynamic report card templates by level, class group, or class.</p>
        <div className="mt-3 space-y-3">
          {resultTemplates.map((item, index) => (
            <div key={`result-template-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
                <Input value={item.name} onChange={(e) => setResultTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="Template name" />
                <Input value={item.level ?? ""} onChange={(e) => setResultTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, level: e.target.value } : row)))} placeholder="Level (Nursery, Primary, Secondary)" />
                <Input value={item.classGroupName ?? ""} onChange={(e) => setResultTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, classGroupName: e.target.value } : row)))} placeholder="Class group (optional)" />
                <Input value={item.className ?? ""} onChange={(e) => setResultTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, className: e.target.value } : row)))} placeholder="Class (optional)" />
                <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" checked={item.isDefault === true} onChange={(e) => setResultTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, isDefault: e.target.checked } : row)))} />
                  Default
                </label>
                <Button size="sm" variant="outline" onClick={() => setResultTemplates((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr]">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={item.layoutHeader} onChange={(e) => setResultTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, layoutHeader: e.target.checked } : row)))} />
                  Show Header
                </label>
                <Input value={item.layoutSectionsText} onChange={(e) => setResultTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, layoutSectionsText: e.target.value } : row)))} placeholder="Layout sections (comma separated: bio, performance, attendance)" />
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setResultTemplates((prev) => [...prev, { name: "", level: "", classGroupName: "", className: "", isDefault: false, layoutHeader: true, layoutSectionsText: "bio, performance" }])}>Add Result Template</Button>
        </div>
      </section> : null}

      {activeTab === "communication" ? <section className="glass-soft rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-900">Communication Templates</h3>
        <div className="mt-2 grid gap-3 xl:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Email Templates</p>
            <div className="mt-1 space-y-2">
              {emailTemplates.map((item, index) => (
                <div key={`email-template-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                    <Input value={item.key} onChange={(e) => setEmailTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, key: e.target.value } : row)))} placeholder="Template key" />
                    <Input value={item.subject} onChange={(e) => setEmailTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, subject: e.target.value } : row)))} placeholder="Subject" />
                    <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <input type="checkbox" checked={item.isActive !== false} onChange={(e) => setEmailTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, isActive: e.target.checked } : row)))} />
                      Active
                    </label>
                    <Button size="sm" variant="outline" onClick={() => setEmailTemplates((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                  <Textarea className="mt-2 min-h-20 text-xs" value={item.body} onChange={(e) => setEmailTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, body: e.target.value } : row)))} placeholder="Template body" />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setEmailTemplates((prev) => [...prev, { key: "", subject: "", body: "", isActive: true }])}>Add Email Template</Button>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">SMS Templates</p>
            <div className="mt-1 space-y-2">
              {smsTemplates.map((item, index) => (
                <div key={`sms-template-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
                    <Input value={item.key} onChange={(e) => setSmsTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, key: e.target.value } : row)))} placeholder="Template key" />
                    <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <input type="checkbox" checked={item.isActive !== false} onChange={(e) => setSmsTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, isActive: e.target.checked } : row)))} />
                      Active
                    </label>
                    <Button size="sm" variant="outline" onClick={() => setSmsTemplates((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                  <Textarea className="mt-2 min-h-20 text-xs" value={item.body} onChange={(e) => setSmsTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, body: e.target.value } : row)))} placeholder="SMS body" />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setSmsTemplates((prev) => [...prev, { key: "", body: "", isActive: true }])}>Add SMS Template</Button>
            </div>
          </div>
        </div>
      </section> : null}

      {activeTab === "operations" ? <section className="glass-soft rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-900">Operations Rules & Templates</h3>
        <div className="mt-2 grid gap-3 xl:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Attendance Rules</p>
            <div className="mt-1 space-y-2">
              {attendanceRules.map((item, index) => (
                <div key={`attendance-rule-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                    <Input value={item.name} onChange={(e) => setAttendanceRules((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="Rule name" />
                    <Input value={item.value ?? ""} onChange={(e) => setAttendanceRules((prev) => prev.map((row, i) => (i === index ? { ...row, value: e.target.value } : row)))} placeholder="Rule value" />
                    <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <input type="checkbox" checked={item.isActive !== false} onChange={(e) => setAttendanceRules((prev) => prev.map((row, i) => (i === index ? { ...row, isActive: e.target.checked } : row)))} />
                      Active
                    </label>
                    <Button size="sm" variant="outline" onClick={() => setAttendanceRules((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setAttendanceRules((prev) => [...prev, { name: "", value: "", isActive: true }])}>Add Rule</Button>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">School Calendar</p>
            <div className="mt-1 space-y-2">
              {schoolCalendar.map((item, index) => (
                <div key={`calendar-item-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_130px_1fr_auto]">
                    <Input value={item.title} onChange={(e) => setSchoolCalendar((prev) => prev.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)))} placeholder="Event title" />
                    <Input type="date" value={item.date} onChange={(e) => setSchoolCalendar((prev) => prev.map((row, i) => (i === index ? { ...row, date: e.target.value } : row)))} />
                    <Input value={item.category ?? ""} onChange={(e) => setSchoolCalendar((prev) => prev.map((row, i) => (i === index ? { ...row, category: e.target.value } : row)))} placeholder="Category" />
                    <Button size="sm" variant="outline" onClick={() => setSchoolCalendar((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setSchoolCalendar((prev) => [...prev, { title: "", date: "", category: "" }])}>Add Calendar Item</Button>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Timetable Templates</p>
            <div className="mt-1 space-y-2">
              {timetableTemplates.map((item, index) => (
                <div key={`timetable-template-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <Input value={item.name} onChange={(e) => setTimetableTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="Template name" />
                    <Input value={item.level ?? ""} onChange={(e) => setTimetableTemplates((prev) => prev.map((row, i) => (i === index ? { ...row, level: e.target.value } : row)))} placeholder="Level" />
                    <Button size="sm" variant="outline" onClick={() => setTimetableTemplates((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {item.periods.map((period, periodIndex) => (
                      <div key={`timetable-template-${index}-period-${periodIndex}`} className="grid grid-cols-1 gap-2 md:grid-cols-[100px_90px_1fr_110px_110px_auto]">
                        <Input
                          value={period.day}
                          onChange={(e) =>
                            setTimetableTemplates((prev) =>
                              prev.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      periods: row.periods.map((r, j) => (j === periodIndex ? { ...r, day: e.target.value } : r)),
                                    }
                                  : row
                              )
                            )
                          }
                          placeholder="Day"
                        />
                        <Input
                          type="number"
                          value={period.period}
                          onChange={(e) =>
                            setTimetableTemplates((prev) =>
                              prev.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      periods: row.periods.map((r, j) => (j === periodIndex ? { ...r, period: Number(e.target.value) || 1 } : r)),
                                    }
                                  : row
                              )
                            )
                          }
                          placeholder="Period"
                        />
                        <Input
                          value={period.subject}
                          onChange={(e) =>
                            setTimetableTemplates((prev) =>
                              prev.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      periods: row.periods.map((r, j) => (j === periodIndex ? { ...r, subject: e.target.value } : r)),
                                    }
                                  : row
                              )
                            )
                          }
                          placeholder="Subject"
                        />
                        <Input
                          value={period.startTime ?? ""}
                          onChange={(e) =>
                            setTimetableTemplates((prev) =>
                              prev.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      periods: row.periods.map((r, j) => (j === periodIndex ? { ...r, startTime: e.target.value } : r)),
                                    }
                                  : row
                              )
                            )
                          }
                          placeholder="Start"
                        />
                        <Input
                          value={period.endTime ?? ""}
                          onChange={(e) =>
                            setTimetableTemplates((prev) =>
                              prev.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      periods: row.periods.map((r, j) => (j === periodIndex ? { ...r, endTime: e.target.value } : r)),
                                    }
                                  : row
                              )
                            )
                          }
                          placeholder="End"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setTimetableTemplates((prev) =>
                              prev.map((row, i) =>
                                i === index ? { ...row, periods: row.periods.filter((_, j) => j !== periodIndex) } : row
                              )
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setTimetableTemplates((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  periods: [
                                    ...row.periods,
                                    { day: "", period: row.periods.length + 1, subject: "", startTime: "", endTime: "" },
                                  ],
                                }
                              : row
                          )
                        )
                      }
                    >
                      Add Period Row
                    </Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setTimetableTemplates((prev) => [...prev, { name: "", level: "", periods: [] }])}>Add Timetable Template</Button>
            </div>
          </div>
        </div>
      </section> : null}

      {activeTab === "channels" ? <section className="glass-soft rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-900">Finance Channels & Governance</h3>
        <div className="mt-2 grid gap-3 xl:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Payment Channels</p>
            <div className="mt-1 space-y-2">
              {paymentChannels.map((item, index) => (
                <div key={`payment-channel-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                    <Input value={item.name} onChange={(e) => setPaymentChannels((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="Channel name" />
                    <Input value={item.provider ?? ""} onChange={(e) => setPaymentChannels((prev) => prev.map((row, i) => (i === index ? { ...row, provider: e.target.value } : row)))} placeholder="Provider" />
                    <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <input type="checkbox" checked={item.isActive !== false} onChange={(e) => setPaymentChannels((prev) => prev.map((row, i) => (i === index ? { ...row, isActive: e.target.checked } : row)))} />
                      Active
                    </label>
                    <Button size="sm" variant="outline" onClick={() => setPaymentChannels((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                  <Textarea className="mt-2 min-h-20 font-mono text-xs" value={item.configText} onChange={(e) => setPaymentChannels((prev) => prev.map((row, i) => (i === index ? { ...row, configText: e.target.value } : row)))} placeholder='JSON config e.g. {"merchantId":"..."}' />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPaymentChannels((prev) => [...prev, { name: "", provider: "", isActive: true, configText: "{}" }])}>Add Payment Channel</Button>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">User Roles</p>
            <div className="mt-1 space-y-2">
              {userRoles.map((item, index) => (
                <div key={`user-role-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                    <Input value={item.name} onChange={(e) => setUserRoles((prev) => prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} placeholder="Role name" />
                    <Button size="sm" variant="outline" onClick={() => setUserRoles((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                  <Input className="mt-2" value={item.description ?? ""} onChange={(e) => setUserRoles((prev) => prev.map((row, i) => (i === index ? { ...row, description: e.target.value } : row)))} placeholder="Description" />
                  <Input className="mt-2" value={item.permissionsText} onChange={(e) => setUserRoles((prev) => prev.map((row, i) => (i === index ? { ...row, permissionsText: e.target.value } : row)))} placeholder="Permissions (comma separated)" />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setUserRoles((prev) => [...prev, { name: "", description: "", permissionsText: "" }])}>Add Role</Button>
            </div>
          </div>
        </div>
      </section> : null}

      {activeTab === "release" ? <section className="glass-soft rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[280px] flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">Release Notes</p>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What changed in this configuration version?" className="mt-1" />
          </div>
          <Button onClick={publishConfig} disabled={isSaving}>{isSaving ? "Publishing..." : "Publish New Configuration Version"}</Button>
          <Button variant="outline" onClick={refreshVersions} disabled={isRefreshing}>{isRefreshing ? "Refreshing..." : "Refresh Versions"}</Button>
        </div>
        {status ? <p className="mt-2 text-sm text-slate-600">{status}</p> : null}
      </section> : null}

      {activeTab === "release" ? <section className="glass-soft rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-900">Version History</h3>
        <div className="mt-3 space-y-2">
          {versions.map((version) => (
            <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-slate-900">v{version.version} {version.isActive ? "(Active)" : ""}</p>
                <p className="text-xs text-slate-500">{version.source} • {formatUtcDateTime(version.createdAt)}</p>
                {version.notes ? <p className="text-xs text-slate-500">{version.notes}</p> : null}
              </div>
              {!version.isActive ? (
                <Button variant="outline" size="sm" onClick={() => activateVersion(version.id)}>Activate</Button>
              ) : (
                <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Live</span>
              )}
            </div>
          ))}
        </div>
      </section> : null}
    </div>
  );
}

function MappingCard({
  title,
  arrayKeys,
  fieldKeys,
  spec,
  targetFields,
  targetFieldAliases,
  onChange,
}: {
  title: string;
  arrayKeys: string[];
  fieldKeys: string[];
  spec: MappingSpec;
  targetFields: string[];
  targetFieldAliases: Record<string, string[]>;
  onChange: (next: MappingSpec) => void;
}) {
  function normalized(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function confidenceFor(field: string, selected: string): "high" | "medium" | "low" {
    if (!selected) return "low";
    const aliases = (targetFieldAliases[field] ?? [field]).map(normalized);
    const target = normalized(selected);
    if (aliases.includes(target)) return "high";
    if (aliases.some((alias) => target.includes(alias) || alias.includes(target))) return "medium";
    return "low";
  }

  function confidenceClass(level: "high" | "medium" | "low") {
    if (level === "high") return "bg-emerald-100 text-emerald-700";
    if (level === "medium") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        <label className="block text-xs text-slate-600">
          Source Array
          <select
            className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
            value={spec.arrayKey}
            onChange={(event) => onChange({ ...spec, arrayKey: event.target.value })}
          >
            <option value="">Select array</option>
            {arrayKeys.map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </label>

        {targetFields.map((field) => {
          const selected = spec.fields[field] ?? "";
          const confidence = confidenceFor(field, selected);
          return (
          <label key={`${title}-${field}`} className="block text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span>{field}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${confidenceClass(confidence)}`}>{confidence}</span>
            </span>
            <select
              className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
              value={selected}
              onChange={(event) =>
                onChange({
                  ...spec,
                  fields: {
                    ...spec.fields,
                    [field]: event.target.value,
                  },
                })
              }
            >
              <option value="">Unmapped</option>
              {fieldKeys.map((key) => (
                <option key={`${title}-${field}-${key}`} value={key}>{key}</option>
              ))}
            </select>
          </label>
          );
        })}
      </div>
    </div>
  );
}
