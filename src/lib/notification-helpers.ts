import { prisma } from "@/lib/db";

export type NotificationType =
  | "announcement"
  | "message"
  | "complaint"
  | "invoice"
  | "result"
  | "attendance"
  | "admission"
  | "fee_reminder"
  | "general";

type CreateNotificationInput = {
  schoolId: string;
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  actorUserId?: number;
  metadata?: Record<string, unknown>;
};

export async function createNotification(input: CreateNotificationInput) {
  try {
    await prisma.notificationRecord.create({
      data: {
        schoolId: input.schoolId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        actorUserId: input.actorUserId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (err) {
    console.error("[notification-helpers] Failed to create notification:", err);
  }
}

export async function createNotificationsForUsers(
  inputs: Omit<CreateNotificationInput, "userId"> & { userIds: number[] }
) {
  const { userIds, ...rest } = inputs;
  const excludeActor = userIds.filter((id) => id !== rest.actorUserId);
  if (!excludeActor.length) return;
  try {
    await prisma.notificationRecord.createMany({
      data: excludeActor.map((userId) => ({
        schoolId: rest.schoolId,
        userId,
        type: rest.type,
        title: rest.title,
        body: rest.body,
        link: rest.link ?? null,
        actorUserId: rest.actorUserId ?? null,
        metadata: rest.metadata ? JSON.stringify(rest.metadata) : null,
      })),
    });
  } catch (err) {
    console.error("[notification-helpers] Failed to create notifications:", err);
  }
}

export async function createNotificationsForRoles(
  schoolId: string,
  roleNames: string[],
  input: Omit<CreateNotificationInput, "schoolId" | "userId"> & { excludeActorUserId?: number }
) {
  try {
    const users = await prisma.user.findMany({
      where: {
        schoolId,
        isActive: true,
        role: { name: { in: roleNames } },
        ...(input.excludeActorUserId ? { id: { not: input.excludeActorUserId } } : {}),
      },
      select: { id: true },
    });
    if (!users.length) return;
    await prisma.notificationRecord.createMany({
      data: users.map((u) => ({
        schoolId,
        userId: u.id,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        actorUserId: input.actorUserId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      })),
    });
  } catch (err) {
    console.error("[notification-helpers] Failed to create notifications for roles:", err);
  }
}

export async function createNotificationsForParents(
  schoolId: string,
  studentIds: number[],
  input: Omit<CreateNotificationInput, "schoolId" | "userId"> & { excludeActorUserId?: number }
) {
  try {
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { parentId: true },
    });
    const parentIds = [...new Set(students.map((s) => s.parentId).filter(Boolean))] as number[];
    if (!parentIds.length) return;
    const parents = await prisma.parent.findMany({
      where: { id: { in: parentIds } },
      select: { userId: true },
    });
    const userIds = parents
      .map((p) => p.userId)
      .filter((id) => id !== input.excludeActorUserId);
    if (!userIds.length) return;
    await prisma.notificationRecord.createMany({
      data: userIds.map((userId) => ({
        schoolId,
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        actorUserId: input.actorUserId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      })),
    });
  } catch (err) {
    console.error("[notification-helpers] Failed to create notifications for parents:", err);
  }
}
