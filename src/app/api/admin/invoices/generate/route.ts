import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { getSetupWizardState } from "@/lib/setup-wizard";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";

const schema = z.object({
  studentId: z.string().min(5),
  includeOptional: z.boolean().optional().default(false),
  dueDate: z.string().optional(),
  paymentInstructions: z.string().max(1000).optional(),
  termId: z.string().min(5).optional(),
  sessionId: z.string().min(5).optional(),
});

const calendarService = new AcademicCalendarService();

async function nextInvoiceNumber(schoolId: string) {
  const count = await prisma.invoice.count({ where: { schoolId } });
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["SCHOOL_ADMIN", "PRINCIPAL", "ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const setup = await getSetupWizardState("default");
  if (!setup.status.setupCompleted) {
    return NextResponse.json({ error: "Setup wizard must be completed before generating invoices.", setup }, { status: 409 });
  }

  const context = await calendarService.getUserContext("default", session.user.id);
  const sessionId = parsed.data.sessionId ?? context.sessionId;
  const termId = parsed.data.termId ?? context.termId;

  if (!sessionId || !termId) {
    return NextResponse.json({ error: "Academic context is not selected" }, { status: 400 });
  }

  const student = await prisma.student.findFirst({
    where: { id: parsed.data.studentId, schoolId: "default" },
    include: { class: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Load active fee groups first (shim does not support nested relation filters)
  const activeGroups = await prisma.feeGroup.findMany({
    where: { schoolId: "default", isActive: true },
    select: { id: true },
  });
  const activeGroupIds = activeGroups.map((g) => g.id);

  const classFilter = student.classId
    ? { OR: [{ classId: student.classId }, { classId: null }] }
    : { classId: null };

  const feeItems = await prisma.feeItem.findMany({
    where: {
      schoolId: "default",
      feeGroupId: { in: activeGroupIds },
      sessionId,
      termId,
      ...classFilter,
      armId: null,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
    include: { feeGroup: true },
  });

  const selectedItems = feeItems.filter((item) => {
    if (item.amount <= 0) return false;
    if (parsed.data.includeOptional) return true;
    return !item.isOptional;
  });

  if (!selectedItems.length) {
    return NextResponse.json({ error: "No active fee items found for invoice generation" }, { status: 400 });
  }

  // Find existing invoices for this student/session/term, then their items
  const existingInvoices = await prisma.invoice.findMany({
    where: { schoolId: "default", studentId: student.id, sessionId, termId },
    select: { id: true },
  });
  const existingInvoiceIds = existingInvoices.map((inv) => inv.id);

  const existingItemRows = existingInvoiceIds.length
    ? await prisma.invoiceItem.findMany({
        where: { feeItemId: { in: selectedItems.map((item) => item.id) }, invoiceId: { in: existingInvoiceIds } },
        select: { feeItemId: true },
      })
    : [];

  const billedFeeItemIds = new Set(existingItemRows.map((row) => row.fee_item_id));
  const netNewItems = selectedItems.filter((item) => !billedFeeItemIds.has(item.id));

  if (!netNewItems.length) {
    return NextResponse.json({ error: "All selected fee items are already billed for this student/session/term." }, { status: 409 });
  }

  const totalAmount = netNewItems.reduce((sum, item) => sum + item.amount, 0);

  // Create invoice without nested items (shim strips nested creates)
  const invoice = await prisma.invoice.create({
    data: {
      schoolId: "default",
      studentId: student.id,
      parentId: student.parent_id ?? null,
      classId: student.class_id ?? null,
      termId,
      sessionId,
      invoiceNumber: await nextInvoiceNumber("default"),
      totalAmount,
      amountPaid: 0,
      balance: totalAmount,
      status: "UNPAID",
      paymentInstructions: parsed.data.paymentInstructions?.trim() || null,
      createdById: session.user.id,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });

  // Create invoice items separately
  for (const item of netNewItems) {
    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        feeItemId: item.id,
        amount: item.amount,
      },
    });
  }

  // Reload invoice with all relations for response
  const invoiceWithData = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: {
      items: { include: { feeItem: { include: { feeGroup: true } } } },
      term: true,
      session: true,
      student: { include: { user: true } },
    },
  });

  if (!invoiceWithData) {
    return NextResponse.json({ error: "Invoice creation failed" }, { status: 500 });
  }

  await createAuditLog({
    schoolId: "default",
    actorUserId: session.user.id,
    action: "INVOICE_GENERATED",
    targetType: "Invoice",
    targetId: invoice.id,
    metadata: {
      studentId: student.id,
      sessionId,
      termId,
      includeOptional: parsed.data.includeOptional,
      itemCount: netNewItems.length,
      totalAmount: invoice.totalAmount,
      generatedFeeItemIds: netNewItems.map((item) => item.id),
      invoiceNumber: invoice.invoiceNumber,
    },
  });

  return NextResponse.json({
    ok: true,
    invoice: {
      id: invoiceWithData.id,
      invoiceNumber: invoiceWithData.invoice_number,
      totalAmount: invoiceWithData.total_amount,
      balance: invoiceWithData.balance,
      status: invoiceWithData.status,
      studentName: (invoiceWithData.student as any)?.user?.name ?? "",
      termName: (invoiceWithData.term as any)?.name ?? "",
      sessionName: (invoiceWithData.session as any)?.name ?? "",
      items: (invoiceWithData as any).items?.map((item: any) => ({
        id: item.id,
        feeItemId: item.fee_item_id,
        feeGroupName: item.feeItem?.feeGroup?.name,
        name: item.feeItem?.name,
        category: item.feeItem?.category,
        amount: item.amount,
      })) ?? [],
    },
  });
}
