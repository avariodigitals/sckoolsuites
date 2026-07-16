import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = unsubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: parsed.data.endpoint,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/push/unsubscribe] Error:", err);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
