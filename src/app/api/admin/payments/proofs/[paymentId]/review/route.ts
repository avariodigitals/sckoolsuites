import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { MessageStatus, PaymentStatus } from "@/lib/db-types";
import { z } from "zod";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().max(500).optional(),
});

function nextReceiptNumber() {
  const now = new Date();
  return `RCT-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
}

async function getApprovedPaidTotal(tx: any, invoiceId: number) {
  const aggregate = await tx.payment.aggregate({
    where: {
      invoiceId,
      status: PaymentStatus.PAID,
    },
    _sum: { amount: true },
  });

  return aggregate._sum.amount ?? 0;
}

function invoiceStatusFromBalance(totalAmount: number, amountPaid: number) {
  if (amountPaid <= 0) return PaymentStatus.UNPAID;
  if (amountPaid >= totalAmount) return PaymentStatus.PAID;
  return PaymentStatus.PART_PAYMENT;
}

export async function POST(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "payments");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { paymentId: rawPaymentId } = await params;
  const paymentIdInt = parseInt(rawPaymentId, 10);
  if (isNaN(paymentIdInt)) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const reviewNote = parsed.data.reviewNote?.trim() || null;
  if (parsed.data.action === "REJECT" && !reviewNote) {
    return NextResponse.json({ error: "Review note is required when rejecting a payment proof." }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentIdInt, schoolId: "default" },
    include: {
      invoice: true,
      student: true,
      proof: true,
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (!payment.proof) {
    return NextResponse.json({ error: "Payment proof not found" }, { status: 404 });
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx: any) => {
    if (parsed.data.action === "APPROVE") {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          confirmedAt: now,
          receivedById: session.user.id,
        },
      });

      const amountPaid = await getApprovedPaidTotal(tx, payment.invoiceId);
      const balance = Math.max(0, payment.invoice.totalAmount - amountPaid);
      const invoiceStatus = invoiceStatusFromBalance(payment.invoice.totalAmount, amountPaid);

      const updatedInvoice = await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountPaid,
          balance,
          status: invoiceStatus,
        },
      });

      const existingReceipt = await tx.receipt.findUnique({ where: { invoiceId: payment.invoiceId } });
      if (existingReceipt) {
        await tx.receipt.update({
          where: { id: existingReceipt.id },
          data: {
            amount: amountPaid,
            balance,
            paymentMethod: updatedPayment.method,
            paymentDate: now,
            receivedBy: session.user.name ?? "Finance Admin",
          },
        });
      } else {
        await tx.receipt.create({
          data: {
            schoolId: payment.schoolId,
            invoiceId: payment.invoiceId,
            studentId: payment.studentId,
            parentId: payment.invoice.parentId,
            receiptNumber: nextReceiptNumber(),
            amount: amountPaid,
            balance,
            paymentMethod: updatedPayment.method,
            paymentDate: now,
            receivedBy: session.user.name ?? "Finance Admin",
          },
        });
      }

      await tx.paymentProof.update({
        where: { paymentId: payment.id },
        data: {
          status: "APPROVED",
          reviewNote,
          reviewedById: session.user.id,
          reviewedAt: now,
        },
      });

      if (payment.invoice.parentId) {
        await tx.parentMessage.create({
          data: {
            schoolId: payment.schoolId,
            parentId: payment.invoice.parentId,
            recipient: "Parent Notification",
            subject: `Payment approved for ${payment.invoice.invoiceNumber}`,
            message: `Your payment proof has been approved. Receipt is now available in your portal.${reviewNote ? ` Note: ${reviewNote}` : ""}`,
            status: MessageStatus.SENT,
          },
        });
      }

      return { updatedInvoice, updatedPayment };
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REVERSED,
        confirmedAt: null,
      },
    });

    const amountPaid = await getApprovedPaidTotal(tx, payment.invoiceId);
    const balance = Math.max(0, payment.invoice.totalAmount - amountPaid);
    const invoiceStatus = invoiceStatusFromBalance(payment.invoice.totalAmount, amountPaid);

    const updatedInvoice = await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        amountPaid,
        balance,
        status: invoiceStatus,
      },
    });

    await tx.paymentProof.update({
      where: { paymentId: payment.id },
      data: {
        status: "REJECTED",
        reviewNote,
        reviewedById: session.user.id,
        reviewedAt: now,
      },
    });

    if (payment.invoice.parentId) {
      await tx.parentMessage.create({
        data: {
          schoolId: payment.schoolId,
          parentId: payment.invoice.parentId,
          recipient: "Parent Notification",
          subject: `Payment rejected for ${payment.invoice.invoiceNumber}`,
          message: `Your submitted payment proof was not approved. Please review and submit again.${reviewNote ? ` Note: ${reviewNote}` : ""}`,
          status: MessageStatus.SENT,
        },
      });
    }

    return { updatedInvoice, updatedPayment };
  });

  await createAuditLog({
    schoolId: "default",
    actorUserId: session.user.id,
    action: parsed.data.action === "APPROVE" ? "PAYMENT_PROOF_APPROVED" : "PAYMENT_PROOF_REJECTED",
    targetType: "Payment",
    targetId: payment.id,
    metadata: {
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      reviewNote,
      paymentStatus: result.updatedPayment.status,
      invoiceStatus: result.updatedInvoice.status,
      invoiceAmountPaid: result.updatedInvoice.amountPaid,
      invoiceBalance: result.updatedInvoice.balance,
    },
  });

  return NextResponse.json({
    ok: true,
    paymentStatus: result.updatedPayment.status,
    invoice: {
      id: result.updatedInvoice.id,
      amountPaid: result.updatedInvoice.amountPaid,
      balance: result.updatedInvoice.balance,
      status: result.updatedInvoice.status,
    },
  });
}
