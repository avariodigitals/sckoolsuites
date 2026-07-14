import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericSearchParamResponse } from "@/lib/id-helpers";

const createBillSchema = z.object({
  studentId: z.coerce.number().min(1),
  classId: z.coerce.number().optional().nullable(),
  termId: z.coerce.number().min(1),
  sessionId: z.coerce.number().min(1),
  items: z.array(
    z.object({
      feeItemId: z.coerce.number().min(1),
      amount: z.number().min(0),
    })
  ).min(1),
  dueDate: z.string().optional().nullable(),
  paymentInstructions: z.string().optional().nullable(),
});

const recordPaymentSchema = z.object({
  invoiceId: z.coerce.number().min(1),
  amount: z.number().min(0.01),
  method: z.string().min(1),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "BURSAR", "ACCOUNTANT"].includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "bills");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  // Get query params
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");
  const rawStudentId = url.searchParams.get("studentId");
  const rawClassId = url.searchParams.get("classId");
  const searchQuery = url.searchParams.get("q");

  const parsedStudentId = parseNumericSearchParamResponse(rawStudentId, "studentId");
  if (!parsedStudentId.ok) return parsedStudentId.response;

  const parsedClassId = parseNumericSearchParamResponse(rawClassId, "classId");
  if (!parsedClassId.ok) return parsedClassId.response;

  const where: Record<string, unknown> = { schoolId };

  if (statusFilter && ["PAID", "UNPAID", "PART_PAYMENT", "PENDING"].includes(statusFilter)) {
    where.status = statusFilter;
  }
  if (parsedStudentId.value !== undefined) {
    where.studentId = parsedStudentId.value;
  }
  if (parsedClassId.value !== undefined) {
    where.classId = parsedClassId.value;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      student: { include: { user: true } },
      class: true,
      term: true,
      session: true,
      items: { include: { feeItem: true } },
      payments: true,
      parent: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get stats
  const [totalBills, totalPaid, totalOutstanding, totalOverdue] = await Promise.all([
    prisma.invoice.count({ where: { schoolId } }),
    prisma.invoice.aggregate({
      where: { schoolId, status: { in: ["PAID", "PART_PAYMENT"] } },
      _sum: { amountPaid: true },
    }),
    prisma.invoice.aggregate({
      where: { schoolId },
      _sum: { balance: true },
    }),
    prisma.invoice.count({
      where: {
        schoolId,
        status: { not: "PAID" },
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  // Get supporting data for forms
  const [students, classes, terms, sessions, feeGroups] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId },
      include: { user: true, class: true },
      orderBy: { id: "asc" },
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
    prisma.term.findMany({
      where: { schoolId },
      orderBy: { startDate: "desc" },
    }),
    prisma.session.findMany({
      where: { schoolId },
      orderBy: { startDate: "desc" },
    }),
    prisma.feeGroup.findMany({
      where: { schoolId, isActive: true },
      include: {
        feeItems: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Filter invoices by search query if provided
  let filteredInvoices = invoices;
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredInvoices = invoices.filter(
      (inv: any) =>
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.student.user.name.toLowerCase().includes(query) ||
        [inv.student.firstName, inv.student.middleName, inv.student.lastName].filter(Boolean).join(" ").toLowerCase().includes(query) ||
        inv.student.user.email?.toLowerCase().includes(query)
    );
  }

  return NextResponse.json({
    bills: filteredInvoices.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      studentId: inv.studentId,
      studentName: [inv.student.firstName, inv.student.middleName, inv.student.lastName].filter(Boolean).join(" ") || inv.student.user.name,
      studentEmail: inv.student.user.email,
      classId: inv.classId,
      className: inv.class?.name ?? null,
      parentName: inv.parent?.user.name ?? null,
      termId: inv.termId,
      termName: inv.term.name,
      sessionId: inv.sessionId,
      sessionName: inv.session.name,
      totalAmount: inv.totalAmount,
      amountPaid: inv.amountPaid,
      balance: inv.balance,
      status: inv.status,
      dueDate: inv.dueDate?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
      paymentInstructions: inv.paymentInstructions,
      items: inv.items?.map((item: any) => ({
        id: item.id,
        feeItemId: item.feeItemId,
        feeItemName: item.feeItem?.name,
        amount: item.amount,
      })) ?? [],
      payments: inv.payments?.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    })),
    stats: {
      totalBills,
      totalPaid: totalPaid._sum?.amountPaid ?? 0,
      totalOutstanding: totalOutstanding._sum?.balance ?? 0,
      totalOverdue,
    },
    students: students.map((s: any) => ({
      id: s.id,
      name: s.user.name,
      email: s.user.email,
      classId: s.classId,
      className: s.class?.name ?? null,
    })),
    classes,
    terms: terms.map((t: any) => ({ id: t.id, name: t.name })),
    sessions: sessions.map((s: any) => ({ id: s.id, name: s.name })),
    feeGroups: feeGroups.map((fg: any) => ({
      id: fg.id,
      name: fg.name,
      feeItems: fg.feeItems?.map((fi: any) => ({
        id: fi.id,
        name: fi.name,
        amount: fi.amount,
        description: fi.description,
        isOptional: fi.isOptional,
      })) ?? [],
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "bills");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createBillSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  try {
    // Generate invoice number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const invoiceNumber = `INV-${year}${month}-${random}`;

    // Calculate total
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

    // Create invoice without nested items (shim strips nested creates)
    const invoice = await prisma.invoice.create({
      data: {
        schoolId,
        studentId: data.studentId,
        classId: data.classId || null,
        termId: data.termId,
        sessionId: data.sessionId,
        invoiceNumber,
        totalAmount,
        amountPaid: 0,
        balance: totalAmount,
        status: "UNPAID",
        paymentInstructions: data.paymentInstructions?.trim() || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: session.user.id,
      },
    });

    // Create invoice items separately
    for (const item of data.items) {
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          feeItemId: item.feeItemId,
          amount: item.amount,
        },
      });
    }

    // Reload with relations for response
    const invoiceWithData = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        student: { include: { user: true } },
        items: { include: { feeItem: true } },
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "BILL_CREATED",
      targetType: "Invoice",
      targetId: String(invoice.id),
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber,
        studentId: data.studentId,
        totalAmount,
      },
    });

    return NextResponse.json(
      {
        bill: {
          id: invoiceWithData!.id,
          invoiceNumber: invoiceWithData!.invoiceNumber,
          studentName: invoiceWithData?.student?.user?.name ?? "",
          totalAmount: invoiceWithData!.totalAmount,
          balance: invoiceWithData!.balance,
          status: invoiceWithData!.status,
          createdAt: invoiceWithData!.createdAt?.toISOString?.() ?? new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create bill";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "bills");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = recordPaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  try {
    // Get invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, schoolId },
      include: { student: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        schoolId,
        invoiceId: data.invoiceId,
        studentId: invoice.studentId,
        amount: data.amount,
        method: data.method,
        status: "PAID",
        confirmedAt: new Date(),
        receivedById: session.user.id,
      },
    });

    // Auto-create income entry from payment
    const schoolFeeCategory = await prisma.incomeCategory.findFirst({
      where: { schoolId, isDefault: true },
    });
    if (schoolFeeCategory) {
      await prisma.income.create({
        data: {
          schoolId,
          categoryId: schoolFeeCategory.id,
          amount: data.amount,
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          source: `Payment #${payment.id}`,
          date: new Date(),
          isFromPayment: true,
          paymentId: payment.id,
        },
      });
    }

    // Update invoice
    const newAmountPaid = invoice.amountPaid + data.amount;
    const newBalance = invoice.totalAmount - newAmountPaid;
    const newStatus = newBalance <= 0 ? "PAID" : newAmountPaid > 0 ? "PART_PAYMENT" : "UNPAID";

    const updatedInvoice = await prisma.invoice.update({
      where: { id: data.invoiceId },
      data: {
        amountPaid: newAmountPaid,
        balance: Math.max(0, newBalance),
        status: newStatus,
      },
    });

    // Create receipt if fully paid
    if (newStatus === "PAID") {
      const receiptNumber = `RCP-${Date.now()}`;
      await prisma.receipt.create({
        data: {
          schoolId,
          invoiceId: data.invoiceId,
          studentId: invoice.studentId,
          parentId: invoice.parentId,
          receiptNumber,
          amount: data.amount,
          balance: 0,
          paymentMethod: data.method,
          paymentDate: new Date(),
          receivedBy: session.user.name || "Admin",
        },
      });
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "PAYMENT_RECORDED",
      targetType: "Payment",
      targetId: String(payment.id),
      metadata: {
        paymentId: payment.id,
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
      },
    });

    return NextResponse.json({
      payment: {
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        invoiceStatus: updatedInvoice.status,
        balance: updatedInvoice.balance,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
