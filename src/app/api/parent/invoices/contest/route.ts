import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listInvoiceContestsByParent, submitInvoiceContest } from "@/lib/invoice-contest";
import { prisma } from "@/lib/db";

const submitSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  parentComment: z.string().min(5),
  adjustments: z.array(
    z.object({
      invoiceItemId: z.coerce.number().int().positive(),
      proposedAmount: z.coerce.number().min(0),
    })
  ),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT"  || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parent = await prisma.parent.findFirst({ where: { schoolId: "default", userId: session.user.id } });
  if (!parent) {
    return NextResponse.json({ contests: [] });
  }

  const contests = await listInvoiceContestsByParent("default", parent.id, 50);
  return NextResponse.json({ contests });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT"  || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = submitSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const contest = await submitInvoiceContest({
      schoolId: "default",
      parentUserId: session.user.id,
      invoiceId: parsed.data.invoiceId,
      parentComment: parsed.data.parentComment,
      adjustments: parsed.data.adjustments,
    });

    return NextResponse.json({ ok: true, contest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit contest.";
    const status = ["INVOICE_NOT_FOUND", "PARENT_PROFILE_NOT_FOUND"].includes(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
