import { prisma } from "@/lib/db";

export type DashboardNotification = {
  id: string;
  type: "announcement" | "message" | "complaint" | "contest";
  title: string;
  description: string;
  audience: string;
  createdAt: string;
};

export type NotificationRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "PRINCIPAL" | "ACCOUNTANT" | "TEACHER" | "PARENT" | "STUDENT";

const roleAudienceGroups: Record<NotificationRole, string[]> = {
  SUPER_ADMIN: ["ALL", "ADMIN", "STAFF"],
  SCHOOL_ADMIN: ["ALL", "ADMIN", "STAFF"],
  PRINCIPAL: ["ALL", "ADMIN", "STAFF"],
  ACCOUNTANT: ["ALL", "ACCOUNTANT", "STAFF", "ADMIN"],
  TEACHER: ["ALL", "TEACHER", "STAFF"],
  PARENT: ["ALL", "PARENT", "PARENT_STUDENT", "FAMILY"],
  STUDENT: ["ALL", "STUDENT", "PARENT_STUDENT"],
};

function normalizeAudience(value: string | null | undefined) {
  return (value ?? "ALL").trim().toUpperCase();
}

function canSeeAnnouncement(audience: string, role: NotificationRole) {
  const normalized = normalizeAudience(audience);
  if (normalized === "ALL") return true;
  return roleAudienceGroups[role]?.includes(normalized) ?? false;
}

function isContestText(title: string, body: string) {
  const combined = `${title} ${body}`.toLowerCase();
  return combined.includes("bill contest") || combined.includes("contest") && combined.includes("bill");
}

function canSeeStaffContestNotifications(role: NotificationRole) {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN" || role === "PRINCIPAL" || role === "ACCOUNTANT";
}

function sortByDateDesc(items: DashboardNotification[]) {
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getLatestNotifications({
  schoolId,
  userId,
  role,
  take = 12,
}: {
  schoolId: string;
  userId: string;
  role: NotificationRole;
  take?: number;
}) {
  const [announcements, parentProfile, staffContestRows] = await Promise.all([
    prisma.announcement.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    role === "PARENT"
      ? prisma.parent.findFirst({
          where: { schoolId, userId },
          select: { id: true },
        })
      : Promise.resolve(null),
    canSeeStaffContestNotifications(role)
      ? prisma.schoolSetting.findMany({
          where: {
            schoolId,
            key: { startsWith: "staff_contest_notification_" },
          },
          orderBy: { createdAt: "desc" },
          take: 25,
        })
      : Promise.resolve([]),
  ]);

  const baseItems: DashboardNotification[] = announcements
    .filter((item) => !isContestText(item.title, item.body))
    .filter((item) => canSeeAnnouncement(item.audience, role))
    .map((item) => ({
      id: `announcement-${item.id}`,
      type: "announcement",
      title: item.title,
      description: item.body,
      audience: normalizeAudience(item.audience),
      createdAt: item.createdAt.toISOString(),
    }));

  const staffContestItems = staffContestRows
    .map((row) => {
      try {
        const parsed = JSON.parse(row.value) as { title?: string; message?: string; createdAt?: string; audience?: string };
        return {
          id: `contest-${row.id}`,
          type: "contest" as const,
          title: parsed.title?.trim() || "Bill Contest Update",
          description: parsed.message?.trim() || "A bill contest was updated.",
          audience: normalizeAudience(parsed.audience ?? "ADMIN"),
          createdAt: parsed.createdAt ?? row.createdAt.toISOString(),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as DashboardNotification[];

  const roleBaseItems = [...baseItems, ...staffContestItems];

  if (role !== "PARENT" || !parentProfile) {
    return sortByDateDesc(roleBaseItems).slice(0, take);
  }

  const [messages, complaints] = await Promise.all([
    prisma.parentMessage.findMany({
      where: { schoolId, parentId: parentProfile.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.parentComplaint.findMany({
      where: { schoolId, parentId: parentProfile.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  const messageItems = messages.map((item) => ({
    id: `message-${item.id}`,
    type: "message" as const,
    title: item.subject?.trim() || "Message sent",
    description: item.message?.trim() || "Your message was sent.",
    audience: "PARENT",
    createdAt: item.createdAt.toISOString(),
  })) as DashboardNotification[];

  const complaintItems = complaints.map((item) => ({
    id: `complaint-${item.id}`,
    type: "complaint" as const,
    title: item.subject?.trim() || "Complaint submitted",
    description: item.complaint?.trim() || "Your complaint was submitted.",
    audience: "PARENT",
    createdAt: item.createdAt.toISOString(),
  })) as DashboardNotification[];

  return sortByDateDesc([...roleBaseItems, ...messageItems, ...complaintItems]).slice(0, take);
}