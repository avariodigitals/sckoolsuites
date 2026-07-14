import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { sendWorkflowEmail } from "@/lib/email";
import { createNotificationsForRoles } from "@/lib/notification-helpers";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
  audience: z.string().min(1).max(100),
  isHtml: z.boolean().optional().default(false),
  sendEmail: z.boolean().optional().default(false),
  attachmentUrl: z.string().url().optional().nullable(),
  attachmentName: z.string().max(255).optional().nullable(),
});

const audienceRoleMap: Record<string, string[]> = {
  ALL: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "REGISTRAR", "TEACHER", "PARENT", "STUDENT", "RECEPTIONIST", "DRIVER"],
  STUDENTS: ["STUDENT"],
  PARENTS: ["PARENT"],
  TEACHERS: ["TEACHER"],
  STAFF: ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "REGISTRAR", "RECEPTIONIST"],
  "STUDENTS,PARENTS": ["STUDENT", "PARENT"],
  "TEACHERS,STAFF": ["TEACHER", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "REGISTRAR", "RECEPTIONIST"],
};

async function getRecipientEmails(schoolId: string, audience: string): Promise<string[]> {
  const roles = audienceRoleMap[audience] ?? audienceRoleMap.ALL;
  const users = await prisma.user.findMany({
    where: { schoolId, isActive: true, role: { name: { in: roles } } },
    select: { email: true },
  });
  return users.map((u: { email: string }) => u.email).filter(Boolean);
}

async function sendAnnouncementEmails(
  schoolId: string,
  title: string,
  body: string,
  isHtml: boolean,
  audience: string,
  attachmentUrl?: string | null,
  attachmentName?: string | null
): Promise<{ sent: number; failed: number }> {
  const emails = await getRecipientEmails(schoolId, audience);
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const schoolName = school?.name ?? "Sckool Suite";
  const subject = `${title} — ${schoolName}`;
  const textBody = isHtml ? body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : body;
  const htmlBody = isHtml ? body : `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;">${body.replace(/\n/g, "<br/>")}</div>`;

  let sent = 0;
  let failed = 0;

  const attachments = attachmentUrl
    ? [{ filename: attachmentName ?? "attachment", path: attachmentUrl }]
    : undefined;

  for (const email of emails) {
    const result = await sendWorkflowEmail({
      schoolId,
      to: email,
      subject,
      text: textBody,
      html: htmlBody,
      attachments,
    });
    if (result.ok) sent++;
    else failed++;
  }

  return { sent, failed };
}

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "announcements");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const termId = url.searchParams.get("termId") ?? undefined;

  const where: Record<string, any> = { schoolId };
  if (sessionId) where.sessionId = sessionId;
  if (termId) where.termId = termId;

  const announcements = await prisma.announcement.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    announcements: announcements.map((a: any) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      isHtml: a.isHtml ?? false,
      sendEmail: a.sendEmail ?? false,
      attachmentUrl: a.attachmentUrl ?? null,
      attachmentName: a.attachmentName ?? null,
      sessionId: a.sessionId ?? null,
      termId: a.termId ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "announcements");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  try {
    // Get current session/term for auto-scoping
    const [currentSession, currentTerm] = await Promise.all([
      prisma.session.findFirst({ where: { schoolId, isCurrent: true } }),
      prisma.term.findFirst({ where: { schoolId, isCurrent: true } }),
    ]);

    const announcement = await prisma.announcement.create({
      data: {
        schoolId,
        title: data.title.trim(),
        body: data.body,
        audience: data.audience.trim(),
        isHtml: data.isHtml,
        sendEmail: data.sendEmail,
        attachmentUrl: data.attachmentUrl ?? null,
        attachmentName: data.attachmentName ?? null,
        sessionId: currentSession?.id ?? null,
        termId: currentTerm?.id ?? null,
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ANNOUNCEMENT_CREATED",
      targetType: "Announcement",
      targetId: announcement.id,
      metadata: {
        announcementId: announcement.id,
        title: data.title,
        audience: data.audience,
        isHtml: data.isHtml,
        sendEmail: data.sendEmail,
        hasAttachment: !!data.attachmentUrl,
        sessionId: currentSession?.id,
        termId: currentTerm?.id,
      },
    });

    let emailResult: { sent: number; failed: number } | null = null;
    if (data.sendEmail) {
      emailResult = await sendAnnouncementEmails(
        schoolId,
        data.title,
        data.body,
        data.isHtml,
        data.audience,
        data.attachmentUrl,
        data.attachmentName
      );
    }

    // Create in-app notifications for all users in the audience (excluding the sender)
    const audienceRoles = audienceRoleMap[data.audience] ?? audienceRoleMap.ALL;
    await createNotificationsForRoles(schoolId, audienceRoles, {
      type: "announcement",
      title: `New Announcement: ${data.title}`,
      body: data.isHtml ? data.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) : data.body.slice(0, 200),
      link: "/announcements",
      actorUserId: session.user.id,
      excludeActorUserId: session.user.id,
      metadata: { announcementId: announcement.id, audience: data.audience },
    });

    return NextResponse.json(
      {
        announcement: {
          id: announcement.id,
          title: announcement.title,
          body: announcement.body,
          audience: announcement.audience,
          isHtml: announcement.isHtml,
          sendEmail: announcement.sendEmail,
          attachmentUrl: announcement.attachmentUrl,
          attachmentName: announcement.attachmentName,
          sessionId: announcement.sessionId ?? null,
          termId: announcement.termId ?? null,
          createdAt: announcement.createdAt.toISOString(),
          updatedAt: announcement.updatedAt.toISOString(),
        },
        emailResult,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create announcement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
