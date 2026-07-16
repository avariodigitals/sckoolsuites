import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
    }

    const schoolId = (user as any).schoolId ?? "default";

    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: user.id,
        schoolId,
        endpoint: parsed.data.endpoint,
        p256dhKey: parsed.data.keys.p256dh,
        authKey: parsed.data.keys.auth,
        userAgent: parsed.data.userAgent ?? null,
      },
      update: {
        userId: user.id,
        schoolId,
        p256dhKey: parsed.data.keys.p256dh,
        authKey: parsed.data.keys.auth,
        userAgent: parsed.data.userAgent ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/push/subscribe] Error:", err);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}
