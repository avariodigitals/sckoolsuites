import { MessageStatus, PaymentStatus, RoleType } from "@/lib/db-types";
import { prisma } from "@/lib/db";
import { sendWorkflowEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit-log";

export type InvoiceContestStatus = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export type InvoiceContestItem = {
  invoiceItemId: string;
  feeName: string;
  originalAmount: number;
  proposedAmount: number;
  optional: boolean;
};

export type InvoiceContestRecord = {
  invoiceId: string;
  invoiceNumber: string;
  studentName: string;
  parentId: string;
  parentUserId: string;
  status: InvoiceContestStatus;
  parentComment: string;
  staffComment: string;
  submittedAt: string;
  updatedAt: string;
  decidedAt?: string;
  decidedByUserId?: string;
  items: InvoiceContestItem[];
};

const INVOICE_CONTEST_KEY_PREFIX = "invoice_contest_";

function contestKey(invoiceId: string) {
  return `${INVOICE_CONTEST_KEY_PREFIX}${invoiceId}`;
}

export function isOptionalFeeItem(input: { category?: string | null; name?: string | null }) {
  const category = (input.category ?? "").toLowerCase();
  const name = (input.name ?? "").toLowerCase();
  return /(optional|elective|addon|add-on)/.test(category) || /(optional|elective|club|transport|lunch|meal|boarding|excursion|trip)/.test(name);
}

function toContestRecord(value: string): InvoiceContestRecord | null {
  try {
    const parsed = JSON.parse(value) as InvoiceContestRecord;
    if (!parsed?.invoiceId || !parsed?.parentId || !Array.isArray(parsed?.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getInvoiceContestByInvoice(schoolId: string, invoiceId: string) {
  const row = await prisma.schoolSetting.findUnique({
    where: { schoolId_key: { schoolId, key: contestKey(invoiceId) } },
  });
  if (!row) return null;
  return toContestRecord(row.value);
}

export async function listInvoiceContestsBySchool(schoolId: string, take = 50) {
  const rows = await prisma.schoolSetting.findMany({
    where: { schoolId, key: { startsWith: INVOICE_CONTEST_KEY_PREFIX } },
    orderBy: { updatedAt: "desc" },
    take,
  });

  return rows
    .map((row) => toContestRecord(row.value))
    .filter((row): row is InvoiceContestRecord => Boolean(row));
}

export async function listInvoiceContestsByParent(schoolId: string, parentId: string, take = 50) {
  const rows = await listInvoiceContestsBySchool(schoolId, take);
  return rows.filter((row) => row.parentId === parentId);
}

export async function submitInvoiceContest({
  schoolId,
  parentUserId,
  invoiceId,
  parentComment,
  adjustments,
}: {
  schoolId: string;
  parentUserId: string;
  invoiceId: string;
  parentComment: string;
  adjustments: Array<{ invoiceItemId: string; proposedAmount: number }>;
}) {
  const parent = await prisma.parent.findFirst({ where: { schoolId, userId: parentUserId } });
  if (!parent) {
    throw new Error("PARENT_PROFILE_NOT_FOUND");
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      schoolId,
      OR: [{ parentId: parent.id }, { student: { parentId: parent.id } }],
    },
    include: {
      student: { include: { user: true } },
      items: { include: { feeItem: true } },
    },
  });

  if (!invoice) throw new Error("INVOICE_NOT_FOUND");
  if (invoice.status === "PAID") throw new Error("INVOICE_ALREADY_PAID");

  const adjustmentMap = new Map(adjustments.map((item: any) => [item.invoiceItemId, item.proposedAmount]));
  const optionalInvoiceItems = invoice.items?.filter((item: any) => isOptionalFeeItem({ category: item.feeItem?.category, name: item.feeItem?.name })) ?? [];
  const proposedItems: InvoiceContestItem[] = [];

  for (const item of invoice.items || []) {
    const proposedAmount = adjustmentMap.get(item.id);
    if (proposedAmount === undefined) continue;

    const optional = isOptionalFeeItem({ category: item.feeItem.category, name: item.feeItem.name });
    if (!optional) throw new Error("NON_OPTIONAL_FEE_EDIT_NOT_ALLOWED");
    if (proposedAmount < 0) throw new Error("INVALID_PROPOSED_AMOUNT");
    if (proposedAmount !== 0) throw new Error("ONLY_OPTIONAL_TOGGLE_OFF_ALLOWED");

    proposedItems.push({
      invoiceItemId: item.id,
      feeName: item.feeItem.name,
      originalAmount: item.amount,
      proposedAmount,
      optional,
    });
  }

  if (!proposedItems.length && optionalInvoiceItems.length) throw new Error("NO_OPTIONAL_FEE_TOGGLED_OFF");

  const now = new Date().toISOString();
  const existing = await getInvoiceContestByInvoice(schoolId, invoice.id);
  const record: InvoiceContestRecord = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    studentName: invoice.student.user.name,
    parentId: parent.id,
    parentUserId,
    status: "SUBMITTED",
    parentComment: parentComment.trim(),
    staffComment: existing?.staffComment ?? "",
    submittedAt: existing?.submittedAt ?? now,
    updatedAt: now,
    items: proposedItems,
  };

  await prisma.schoolSetting.upsert({
    where: { schoolId_key: { schoolId, key: contestKey(invoice.id) } },
    update: { value: JSON.stringify(record) },
    create: { schoolId, key: contestKey(invoice.id), value: JSON.stringify(record) },
  });

  await writeContestAuditEntry({
    schoolId,
    invoiceId: invoice.id,
    actorUserId: parentUserId,
    actorRole: "PARENT",
    action: "CONTEST_SUBMITTED",
    details: {
      invoiceNumber: invoice.invoiceNumber,
      itemCount: proposedItems.length,
    },
  });

  await createAuditLog({
    schoolId,
    actorUserId: parentUserId,
    action: "INVOICE_CONTEST_SUBMITTED",
    targetType: "Invoice",
    targetId: invoice.id,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      itemCount: proposedItems.length,
    },
  });

  await notifyContestToStaffBell({
    schoolId,
    title: `New Bill Contest: ${invoice.invoiceNumber}`,
    message: `${invoice.student.user.name}'s parent submitted a bill contest. ${parentComment.trim()}`,
  });

  const adminUsers = await prisma.user.findMany({
    where: {
      schoolId,
      isActive: true,
      role: { name: { in: ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "ACCOUNTANT"] } },
    },
    select: { email: true },
  });

  await Promise.all(
    adminUsers
      .filter((user) => Boolean(user.email))
      .map((user) =>
        sendWorkflowEmail({
          schoolId,
          to: user.email,
          subject: `New Bill Contest Submitted: ${invoice.invoiceNumber}`,
          text: `A parent submitted a bill contest for ${invoice.invoiceNumber}. Student: ${invoice.student.user.name}. Review required.`,
        })
      )
  );

  return record;
}

function mapPaymentStatus(amountPaid: number, totalAmount: number): PaymentStatus {
  if (amountPaid <= 0) return PaymentStatus.UNPAID;
  if (amountPaid >= totalAmount) return PaymentStatus.PAID;
  return PaymentStatus.PART_PAYMENT;
}

async function writeContestAuditEntry(params: {
  schoolId: string;
  invoiceId: string;
  actorUserId?: string;
  actorRole?: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  await prisma.invoiceContestAudit.create({
    data: {
      schoolId: params.schoolId,
      invoiceId: params.invoiceId,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      action: params.action,
      details: params.details as Record<string, unknown>,
    },
  });
}

async function notifyContestToStaffBell({
  schoolId,
  title,
  message,
}: {
  schoolId: string;
  title: string;
  message: string;
}) {
  await prisma.schoolSetting.create({
    data: {
      schoolId,
      key: `staff_contest_notification_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      value: JSON.stringify({
        type: "contest",
        title,
        message,
        audience: "ADMIN",
        createdAt: new Date().toISOString(),
      }),
    },
  });
}

async function notifyContestStatusChange({
  schoolId,
  invoiceNumber,
  targetParent,
  status,
  staffComment,
}: {
  schoolId: string;
  invoiceNumber: string;
  targetParent: { id: string; user?: { email?: string | null } | null } | null;
  status: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  staffComment: string;
}) {
  if (!targetParent) return;

  const statusLabel = status === "UNDER_REVIEW" ? "under review" : status === "APPROVED" ? "approved" : "rejected";
  const subject = `Bill ${invoiceNumber} is ${statusLabel}`;
  const message =
    status === "UNDER_REVIEW"
      ? `Your bill contest for Bill ${invoiceNumber} is now under review.${staffComment ? ` Note: ${staffComment}` : ""}`
      : status === "APPROVED"
        ? `Your bill contest for Bill ${invoiceNumber} has been approved.${staffComment ? ` Note: ${staffComment}` : ""}`
        : `Your bill contest for Bill ${invoiceNumber} has been rejected.${staffComment ? ` Note: ${staffComment}` : ""}`;

  await prisma.parentMessage.create({
    data: {
      schoolId,
      parentId: targetParent.id,
      recipient: "School Finance",
      subject,
      message,
      status: MessageStatus.SENT,
    },
  });

  if (targetParent.user?.email) {
    await sendWorkflowEmail({
      schoolId,
      to: targetParent.user.email,
      subject,
      text: message,
    });
  }
}

async function notifyContestReviewToStaff({
  schoolId,
  invoiceNumber,
  status,
  staffComment,
  reviewerRole,
}: {
  schoolId: string;
  invoiceNumber: string;
  status: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  staffComment: string;
  reviewerRole: RoleType;
}) {
  const readableStatus = status === "UNDER_REVIEW" ? "Under Review" : status === "APPROVED" ? "Approved" : "Rejected";
  await notifyContestToStaffBell({
    schoolId,
    title: `Bill Contest ${readableStatus}: ${invoiceNumber}`,
    message: `A bill contest was ${readableStatus.toLowerCase()} by ${reviewerRole}. ${staffComment ? `Note: ${staffComment}` : ""}`.trim(),
  });
}

export async function reviewInvoiceContest({
  schoolId,
  actorUserId,
  actorRole,
  invoiceId,
  action,
  staffComment,
  finalAdjustments: _finalAdjustments,
}: {
  schoolId: string;
  actorUserId: string;
  actorRole: RoleType;
  invoiceId: string;
  action: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  staffComment: string;
  finalAdjustments: Array<{ invoiceItemId: string; proposedAmount: number }>;
}) {
  if (actorRole !== "SUPER_ADMIN" && actorRole !== "SCHOOL_ADMIN" && actorRole !== "PRINCIPAL" && actorRole !== "ACCOUNTANT") {
    throw new Error("UNAUTHORIZED_REVIEWER");
  }
  void _finalAdjustments;

  const contest = await getInvoiceContestByInvoice(schoolId, invoiceId);
  if (!contest) throw new Error("CONTEST_NOT_FOUND");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, schoolId },
    include: {
      parent: { include: { user: true } },
      student: { include: { parent: { include: { user: true } }, user: true } },
      items: { include: { feeItem: true } },
    },
  });

  if (!invoice) throw new Error("INVOICE_NOT_FOUND");

  const targetParent = invoice.parent ?? invoice.student.parent;

  if (action === "APPROVED" && actorRole !== "SUPER_ADMIN" && actorRole !== "SCHOOL_ADMIN" && actorRole !== "PRINCIPAL") {
    throw new Error("HEAD_OF_SCHOOL_APPROVAL_REQUIRED");
  }

  if (action === "UNDER_REVIEW") {
    const updated: InvoiceContestRecord = {
      ...contest,
      status: "UNDER_REVIEW",
      staffComment: staffComment.trim(),
      updatedAt: new Date().toISOString(),
    };

    await prisma.schoolSetting.update({
      where: { schoolId_key: { schoolId, key: contestKey(invoiceId) } },
      data: { value: JSON.stringify(updated) },
    });

    await notifyContestReviewToStaff({
      schoolId,
      invoiceNumber: invoice.invoiceNumber,
      status: "UNDER_REVIEW",
      staffComment: staffComment.trim(),
      reviewerRole: actorRole,
    });

    await notifyContestStatusChange({
      schoolId,
      invoiceNumber: invoice.invoiceNumber,
      targetParent,
      status: "UNDER_REVIEW",
      staffComment: staffComment.trim(),
    });

    await writeContestAuditEntry({
      schoolId,
      invoiceId,
      actorUserId,
      actorRole,
      action: "CONTEST_UNDER_REVIEW",
      details: { staffComment: staffComment.trim() },
    });

    await createAuditLog({
      schoolId,
      actorUserId,
      action: "INVOICE_CONTEST_UNDER_REVIEW",
      targetType: "Invoice",
      targetId: invoiceId,
      metadata: { staffComment: staffComment.trim() },
    });

    return updated;
  }

  if (action === "REJECTED") {
    const updated: InvoiceContestRecord = {
      ...contest,
      status: "REJECTED",
      staffComment: staffComment.trim(),
      updatedAt: new Date().toISOString(),
      decidedAt: new Date().toISOString(),
      decidedByUserId: actorUserId,
    };

    await prisma.schoolSetting.update({
      where: { schoolId_key: { schoolId, key: contestKey(invoiceId) } },
      data: { value: JSON.stringify(updated) },
    });

    await notifyContestReviewToStaff({
      schoolId,
      invoiceNumber: invoice.invoiceNumber,
      status: "REJECTED",
      staffComment: staffComment.trim(),
      reviewerRole: actorRole,
    });

    await notifyContestStatusChange({
      schoolId,
      invoiceNumber: invoice.invoiceNumber,
      targetParent,
      status: "REJECTED",
      staffComment: staffComment.trim(),
    });

    await writeContestAuditEntry({
      schoolId,
      invoiceId,
      actorUserId,
      actorRole,
      action: "CONTEST_REJECTED",
      details: { staffComment: staffComment.trim() },
    });

    await createAuditLog({
      schoolId,
      actorUserId,
      action: "INVOICE_CONTEST_REJECTED",
      targetType: "Invoice",
      targetId: invoiceId,
      metadata: { staffComment: staffComment.trim() },
    });

    return updated;
  }

  const contestItemsMap = new Map(contest.items.map((item) => [item.invoiceItemId, item]));

  const toUpdate: Array<{ id: string; amount: number }> = [];
  const updatedContestItems: InvoiceContestItem[] = [];

  for (const invoiceItem of invoice.items) {
    const contestItem = contestItemsMap.get(invoiceItem.id);
    if (!contestItem) continue;

    const optional = isOptionalFeeItem({ category: invoiceItem.feeItem.category, name: invoiceItem.feeItem.name });
    if (!optional) throw new Error("NON_OPTIONAL_FEE_EDIT_NOT_ALLOWED");

    const finalAmount = 0;
    if (!Number.isFinite(finalAmount) || finalAmount < 0) throw new Error("INVALID_PROPOSED_AMOUNT");

    toUpdate.push({ id: invoiceItem.id, amount: finalAmount });
    updatedContestItems.push({
      ...contestItem,
      proposedAmount: finalAmount,
      originalAmount: invoiceItem.amount,
    });
  }

  if (!toUpdate.length) {
    const now = new Date().toISOString();
    const updated: InvoiceContestRecord = {
      ...contest,
      status: "APPROVED",
      staffComment: staffComment.trim(),
      updatedAt: now,
      decidedAt: now,
      decidedByUserId: actorUserId,
    };

    await prisma.schoolSetting.update({
      where: { schoolId_key: { schoolId, key: contestKey(invoiceId) } },
      data: { value: JSON.stringify(updated) },
    });

    await notifyContestReviewToStaff({
      schoolId,
      invoiceNumber: invoice.invoiceNumber,
      status: "APPROVED",
      staffComment: staffComment.trim() || "Your statement was reviewed.",
      reviewerRole: actorRole,
    });

    await notifyContestStatusChange({
      schoolId,
      invoiceNumber: invoice.invoiceNumber,
      targetParent,
      status: "APPROVED",
      staffComment: staffComment.trim() || "Your statement was reviewed.",
    });

    await writeContestAuditEntry({
      schoolId,
      invoiceId,
      actorUserId,
      actorRole,
      action: "CONTEST_APPROVED",
      details: {
        adjusted: false,
        staffComment: staffComment.trim() || "Your statement was reviewed.",
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId,
      action: "INVOICE_CONTEST_APPROVED",
      targetType: "Invoice",
      targetId: invoiceId,
      metadata: {
        adjusted: false,
        staffComment: staffComment.trim() || "Your statement was reviewed.",
      },
    });

    return updated;
  }

  const result = await prisma.$transaction(async (tx) => {
    for (const item of toUpdate) {
      await tx.invoiceItem.update({ where: { id: item.id }, data: { amount: item.amount } });
    }

    const latestItems = await tx.invoiceItem.findMany({ where: { invoiceId: invoice.id } });
    const totalAmount = latestItems.reduce((sum: number, item: any) => sum + item.amount, 0);
    const balance = Math.max(0, totalAmount - invoice.amountPaid);
    const status = mapPaymentStatus(invoice.amountPaid, totalAmount);

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        totalAmount,
        balance,
        status,
      },
    });

    const now = new Date().toISOString();
    const updated: InvoiceContestRecord = {
      ...contest,
      status: "APPROVED",
      staffComment: staffComment.trim(),
      items: updatedContestItems,
      updatedAt: now,
      decidedAt: now,
      decidedByUserId: actorUserId,
    };

    await tx.schoolSetting.update({
      where: { schoolId_key: { schoolId, key: contestKey(invoice.id) } },
      data: { value: JSON.stringify(updated) },
    });

    return { updated, totalAmount, balance, status };
  });

  await notifyContestReviewToStaff({
    schoolId,
    invoiceNumber: invoice.invoiceNumber,
    status: "APPROVED",
    staffComment: staffComment.trim() || "Your statement was reviewed.",
    reviewerRole: actorRole,
  });

  await notifyContestStatusChange({
    schoolId,
    invoiceNumber: invoice.invoiceNumber,
    targetParent,
    status: "APPROVED",
    staffComment: staffComment.trim() || "Your statement was reviewed.",
  });

  await writeContestAuditEntry({
    schoolId,
    invoiceId,
    actorUserId,
    actorRole,
    action: "CONTEST_APPROVED",
    details: {
      adjusted: true,
      staffComment: staffComment.trim() || "Your statement was reviewed.",
      items: result.updated.items,
    },
  });

  await createAuditLog({
    schoolId,
    actorUserId,
    action: "INVOICE_CONTEST_APPROVED",
    targetType: "Invoice",
    targetId: invoiceId,
    metadata: {
      adjusted: true,
      staffComment: staffComment.trim() || "Your statement was reviewed.",
      itemCount: result.updated.items.length,
    },
  });

  return result.updated;
}
