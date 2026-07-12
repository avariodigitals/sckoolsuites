import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const querySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "payments");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.flatten() }, { status: 400 });
  }

  const proofs = await prisma.paymentProof.findMany({
    where: {
      schoolId: "default",
      ...(parsedQuery.data.status ? { status: parsedQuery.data.status } : {}),
    },
    include: {
      reviewedBy: { select: { id: true, name: true, email: true } },
      payment: {
        include: {
          student: { include: { user: true } },
          invoice: {
            include: {
              parent: { include: { user: true } },
              term: true,
              session: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: parsedQuery.data.take ?? 100,
  });

  return NextResponse.json(
    proofs.map((proof: any) => ({
      id: proof.id,
      status: proof.status,
      reviewNote: proof.reviewNote,
      reviewedAt: proof.reviewedAt?.toISOString() ?? null,
      reviewedBy: proof.reviewedBy ? { id: proof.reviewedBy.id, name: proof.reviewedBy.name, email: proof.reviewedBy.email } : null,
      transactionReference: proof.transactionReference,
      bankName: proof.bankName,
      paymentDate: proof.paymentDate.toISOString(),
      proofUrl: proof.proofUrl,
      payment: {
        id: proof.payment.id,
        amount: proof.payment.amount,
        method: proof.payment.method,
        status: proof.payment.status,
      },
      invoice: {
        id: proof.payment.invoice.id,
        invoiceNumber: proof.payment.invoice.invoiceNumber,
        totalAmount: proof.payment.invoice.totalAmount,
        amountPaid: proof.payment.invoice.amountPaid,
        balance: proof.payment.invoice.balance,
        status: proof.payment.invoice.status,
        termName: proof.payment.invoice.term.name,
        sessionName: proof.payment.invoice.session.name,
      },
      student: {
        id: proof.payment.student.id,
        name: proof.payment.student.user.name,
      },
      parent: proof.payment.invoice.parent
        ? {
            id: proof.payment.invoice.parent.id,
            name: proof.payment.invoice.parent.user.name,
            email: proof.payment.invoice.parent.user.email,
          }
        : null,
    }))
  );
}
