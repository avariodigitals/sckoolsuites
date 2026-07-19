import { prisma } from "@/lib/db";
import {
  getProvider,
  generatePassword,
  generateLocalPart,
  type EmailProviderConfig,
  type EmailPattern,
  type CreateEmailAccountResult,
} from "@/lib/email-providers";

export type CreateStudentEmailInput = {
  schoolId: string;
  studentId: number;
  firstName: string;
  lastName: string;
  displayName?: string;
  admissionNo?: string | null;
};

export type CreateStudentEmailResult = {
  emailAddress: string;
  password: string;
  provider: string;
  created: boolean;
};

export async function getActiveEmailProviderConfig(
  schoolId: string
): Promise<EmailProviderConfig | null> {
  const record = await prisma.emailProviderConfig.findFirst({
    where: { schoolId, isActive: true },
  });

  if (!record) return null;

  const credentials = (record.config as Record<string, string>) || {};

  return {
    provider: record.provider as EmailProviderConfig["provider"],
    domain: record.domain,
    credentials,
    defaultPassword: record.defaultPassword ?? undefined,
    passwordPolicy: record.passwordPolicy ?? undefined,
    emailPattern: (record.emailPattern as EmailPattern) ?? undefined,
    customPattern: record.customPattern ?? undefined,
  };
}

export async function createStudentEmailAccount(
  input: CreateStudentEmailInput
): Promise<CreateStudentEmailResult> {
  const existing = await prisma.studentEmailAccount.findUnique({
    where: { studentId: input.studentId },
  });

  if (existing && existing.status === "ACTIVE") {
    return {
      emailAddress: existing.emailAddress,
      password: existing.password ?? "",
      provider: "existing",
      created: false,
    };
  }

  const config = await getActiveEmailProviderConfig(input.schoolId);
  if (!config) {
    throw new Error("No active email provider configured for this school");
  }

  const localPart = generateLocalPart(input.firstName, input.lastName, {
    studentId: input.studentId,
    admissionNo: input.admissionNo,
    pattern: config.emailPattern,
    customPattern: config.customPattern,
  });
  const password = generatePassword(
    config.passwordPolicy,
    config.defaultPassword,
    { firstName: input.firstName, lastName: input.lastName }
  );

  const provider = getProvider(config);

  const result: CreateEmailAccountResult = await provider.createAccount({
    localPart,
    domain: config.domain,
    password,
    displayName: input.displayName || `${input.firstName} ${input.lastName}`,
    givenName: input.firstName,
    familyName: input.lastName,
  });

  await prisma.studentEmailAccount.upsert({
    where: { studentId: input.studentId },
    update: {
      emailAddress: result.emailAddress,
      password: result.password,
      status: "ACTIVE",
    },
    create: {
      schoolId: input.schoolId,
      studentId: input.studentId,
      emailAddress: result.emailAddress,
      password: result.password,
      status: "ACTIVE",
    },
  });

  return {
    emailAddress: result.emailAddress,
    password: result.password,
    provider: config.provider,
    created: true,
  };
}

export async function deleteStudentEmailAccount(
  schoolId: string,
  studentId: number
): Promise<void> {
  const record = await prisma.studentEmailAccount.findUnique({
    where: { studentId },
  });

  if (!record) return;

  const config = await getActiveEmailProviderConfig(schoolId);
  if (config) {
    const provider = getProvider(config);
    try {
      await provider.deleteAccount({ emailAddress: record.emailAddress });
    } catch (err) {
      console.error("[email-service] Provider deletion failed:", err);
    }
  }

  await prisma.studentEmailAccount.update({
    where: { studentId },
    data: { status: "DELETED" },
  });
}

export async function suspendStudentEmailAccount(
  schoolId: string,
  studentId: number
): Promise<void> {
  const record = await prisma.studentEmailAccount.findUnique({
    where: { studentId },
  });

  if (!record || record.status !== "ACTIVE") return;

  const config = await getActiveEmailProviderConfig(schoolId);
  if (config) {
    const provider = getProvider(config);
    try {
      await provider.suspendAccount({ emailAddress: record.emailAddress });
    } catch (err) {
      console.error("[email-service] Provider suspension failed:", err);
    }
  }

  await prisma.studentEmailAccount.update({
    where: { studentId },
    data: { status: "SUSPENDED" },
  });
}
