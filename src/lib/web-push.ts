import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@sckoolsuite.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error("VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars.");
  }

  webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
  configured = true;
}

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

export function isPushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
};

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (!subscriptions.length) {
    return { sent: 0, failed: 0 };
  }

  const message = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dhKey,
        auth: sub.authKey,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, message);
      sent++;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
      failed++;
    }
  }

  return { sent, failed };
}

export async function sendPushToUsers(userIds: number[], payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!userIds.length || !isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  if (!subscriptions.length) {
    return { sent: 0, failed: 0 };
  }

  const message = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dhKey,
        auth: sub.authKey,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, message);
      sent++;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
      failed++;
    }
  }

  return { sent, failed };
}

export async function sendPushToRoles(
  schoolId: string,
  roleNames: string[],
  payload: PushPayload,
  excludeActorUserId?: number
): Promise<{ sent: number; failed: number }> {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  const users = await prisma.user.findMany({
    where: {
      schoolId,
      isActive: true,
      role: { name: { in: roleNames } },
      ...(excludeActorUserId ? { id: { not: excludeActorUserId } } : {}),
    },
    select: { id: true },
  });

  if (!users.length) {
    return { sent: 0, failed: 0 };
  }

  return sendPushToUsers(
    users.map((u) => u.id),
    payload
  );
}
