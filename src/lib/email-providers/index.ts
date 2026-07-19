import { CPanelProvider } from "./providers/cpanel";
import { GoogleWorkspaceProvider } from "./providers/google";
import { Microsoft365Provider } from "./providers/microsoft";
import { ZohoMailProvider } from "./providers/zoho";

export type EmailProviderType = "cpanel" | "google" | "microsoft" | "zoho";

export type CreateEmailAccountInput = {
  localPart: string;
  domain: string;
  password: string;
  displayName?: string;
  givenName?: string;
  familyName?: string;
};

export type CreateEmailAccountResult = {
  emailAddress: string;
  password: string;
  providerUserId?: string;
  raw?: unknown;
};

export type DeleteEmailAccountInput = {
  emailAddress: string;
};

export type SuspendEmailAccountInput = {
  emailAddress: string;
};

export type EmailProviderConfig = {
  provider: EmailProviderType;
  domain: string;
  credentials: Record<string, string>;
  defaultPassword?: string;
  passwordPolicy?: string;
  emailPattern?: EmailPattern;
  customPattern?: string;
};

export interface EmailProvider {
  readonly type: EmailProviderType;

  createAccount(
    input: CreateEmailAccountInput
  ): Promise<CreateEmailAccountResult>;

  deleteAccount(input: DeleteEmailAccountInput): Promise<void>;

  suspendAccount(input: SuspendEmailAccountInput): Promise<void>;

  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export function getProvider(
  config: EmailProviderConfig
): EmailProvider {
  switch (config.provider) {
    case "cpanel":
      return new CPanelProvider(config);
    case "google":
      return new GoogleWorkspaceProvider(config);
    case "microsoft":
      return new Microsoft365Provider(config);
    case "zoho":
      return new ZohoMailProvider(config);
    default:
      throw new Error(`Unknown email provider: ${config.provider}`);
  }
}

export function generatePassword(
  policy: string | undefined,
  fallback: string | undefined,
  student: { firstName: string; lastName: string }
): string {
  if (policy === "fixed" && fallback) {
    return fallback;
  }
  if (policy === "firstname+year") {
    const year = new Date().getFullYear();
    return `${student.firstName.toLowerCase()}${year}!`;
  }
  if (policy === "random" || !fallback) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
  }
  return fallback;
}

export type EmailPattern =
  | "firstname.lastname"
  | "firstname.lastinitial"
  | "firstinitial.lastname"
  | "firstname"
  | "firstname.lastname.year"
  | "firstname.studentid"
  | "admissionno"
  | "custom";

export function generateLocalPart(
  firstName: string,
  lastName: string,
  options?: {
    studentId?: number;
    admissionNo?: string | null;
    pattern?: EmailPattern;
    customPattern?: string;
    year?: number;
  }
): string {
  const pattern = options?.pattern ?? "firstname.lastname";
  const first = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const last = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const firstInitial = first.charAt(0);
  const lastInitial = last.charAt(0);
  const year = options?.year ?? new Date().getFullYear();
  const studentId = options?.studentId;

  switch (pattern) {
    case "firstname.lastinitial":
      return `${first}.${lastInitial}`;
    case "firstinitial.lastname":
      return `${firstInitial}.${last}`;
    case "firstname":
      return first;
    case "firstname.lastname.year":
      return `${first}.${last}.${year}`;
    case "firstname.studentid":
      return studentId ? `${first}.${studentId}` : `${first}.${last}`;
    case "admissionno":
      return options?.admissionNo?.toLowerCase().replace(/[^a-z0-9]/g, "") || `${first}.${last}`;
    case "custom":
      if (options?.customPattern) {
        return options.customPattern
          .replace(/\{firstname\}/g, first)
          .replace(/\{lastname\}/g, last)
          .replace(/\{firstinitial\}/g, firstInitial)
          .replace(/\{lastinitial\}/g, lastInitial)
          .replace(/\{studentid\}/g, studentId ? String(studentId) : "")
          .replace(/\{year\}/g, String(year))
          .replace(/\{admissionno\}/g, options?.admissionNo?.toLowerCase().replace(/[^a-z0-9]/g, "") || "");
      }
      return `${first}.${last}`;
    case "firstname.lastname":
    default:
      return `${first}.${last}`;
  }
}

export const EMAIL_PATTERN_OPTIONS: { value: EmailPattern; label: string; example: string }[] = [
  { value: "firstname.lastname", label: "First Name . Last Name", example: "john.doe" },
  { value: "firstname.lastinitial", label: "First Name . Last Initial", example: "john.d" },
  { value: "firstinitial.lastname", label: "First Initial . Last Name", example: "j.doe" },
  { value: "firstname", label: "First Name Only", example: "john" },
  { value: "firstname.lastname.year", label: "First Name . Last Name . Year", example: "john.doe.2026" },
  { value: "firstname.studentid", label: "First Name . Student ID", example: "john.42" },
  { value: "admissionno", label: "Admission Number", example: "adm001" },
  { value: "custom", label: "Custom Pattern", example: "{firstname}.{firstinitial}{lastinitial}" },
];
