import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { RoleType } from "@/lib/db-types";
import { z } from "zod";
import { auth } from "@/auth";
import { reviewInvoiceContest } from "@/lib/invoice-contest";

const reviewSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  action: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED"]),
  staffComment: z.string().optional().default(""),
  finalAdjustments: z
    .array(
      z.object({
        invoiceItemId: z.coerce.number().int().positive(),
        proposedAmount: z.coerce.number().min(0),
      })
    )
    .optional()
    .default([]),
});

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "bills");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session?.user;
  if (!user?.id || !user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const contest = await reviewInvoiceContest({
      schoolId: "default",
      actorUserId: user.id,
      actorRole: user.role as RoleType,
      invoiceId: parsed.data.invoiceId,
      action: parsed.data.action,
      staffComment: parsed.data.staffComment,
      finalAdjustments: parsed.data.finalAdjustments,
    });

    return NextResponse.json({ ok: true, contest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process contest review.";
    const status = ["CONTEST_NOT_FOUND", "INVOICE_NOT_FOUND"].includes(message)
      ? 404
      : message === "UNAUTHORIZED_REVIEWER"
        ? 401
        : message === "HEAD_OF_SCHOOL_APPROVAL_REQUIRED"
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
