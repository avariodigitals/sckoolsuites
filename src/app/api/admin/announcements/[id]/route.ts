import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";
import { sendWorkflowEmail } from "@/lib/email";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(50000).optional(),
  audience: z.string().min(1).max(100).optional(),
  isHtml: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
  attachmentUrl: z.string().url().optional().nullable(),
  attachmentName: z.string().max(255).optional().nullable(),
});

const audienceRoleMap: Record<string, string[]> = {
  ALL: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "REGISTRAR", "TEACHER", "CLASS_ASSISTANT", "PARENT", "STUDENT", "RECEPTIONIST", "DRIVER"],
  STUDENTS: ["STUDENT"],
  PARENTS: ["PARENT"],
  TEACHERS: ["TEACHER", "CLASS_ASSISTANT"],
  STAFF: ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "REGISTRAR", "RECEPTIONIST"],
  "STUDENTS,PARENTS": ["STUDENT", "PARENT"],
  "TEACHERS,STAFF": ["TEACHER", "CLASS_ASSISTANT", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "ACCOUNTANT", "REGISTRAR", "RECEPTIONIST"],
};

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "announcements");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "announcement id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid announcement id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  const existing = await prisma.announcement.findFirst({
    where: { id: parsedId, schoolId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const updated = await prisma.announcement.update({
      where: { id: parsedId },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.audience !== undefined ? { audience: data.audience.trim() } : {}),
        ...(data.isHtml !== undefined ? { isHtml: data.isHtml } : {}),
        ...(data.sendEmail !== undefined ? { sendEmail: data.sendEmail } : {}),
        ...(data.attachmentUrl !== undefined ? { attachmentUrl: data.attachmentUrl } : {}),
        ...(data.attachmentName !== undefined ? { attachmentName: data.attachmentName } : {}),
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ANNOUNCEMENT_UPDATED",
      targetType: "Announcement",
      targetId: String(parsedId),
      metadata: {
        announcementId: parsedId,
        title: updated.title,
        changes: Object.keys(data),
      },
    });

    let emailResult: { sent: number; failed: number } | null = null;
    if (data.sendEmail === true) {
      const emails = await prisma.user.findMany({
        where: {
          schoolId,
          isActive: true,
          role: { name: { in: audienceRoleMap[updated.audience] ?? audienceRoleMap.ALL } },
        },
        select: { email: true },
      });
      const school = await prisma.school.findUnique({ where: { id: schoolId } });
      const schoolName = school?.name ?? "Sckool Suite";
      const subject = `${updated.title} — ${schoolName}`;
      const textBody = updated.isHtml
        ? updated.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
        : updated.body;
      const htmlBody = updated.isHtml
        ? updated.body
        : `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;">${updated.body.replace(/\n/g, "<br/>")}</div>`;
      const attachments = updated.attachmentUrl
        ? [{ filename: updated.attachmentName ?? "attachment", path: updated.attachmentUrl }]
        : undefined;

      let sent = 0;
      let failed = 0;
      for (const email of emails) {
        const result = await sendWorkflowEmail({
          schoolId,
          to: email.email,
          subject,
          text: textBody,
          html: htmlBody,
          attachments,
        });
        if (result.ok) sent++;
        else failed++;
      }
      emailResult = { sent, failed };
    }

    return NextResponse.json({
      announcement: {
        id: updated.id,
        title: updated.title,
        body: updated.body,
        audience: updated.audience,
        isHtml: updated.isHtml,
        sendEmail: updated.sendEmail,
        attachmentUrl: updated.attachmentUrl,
        attachmentName: updated.attachmentName,
        updatedAt: updated.updatedAt.toISOString(),
      },
      emailResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update announcement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "announcements");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "announcement id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid announcement id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  // Check announcement exists
  const existing = await prisma.announcement.findFirst({
    where: { id: parsedId, schoolId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  try {
    await prisma.announcement.delete({
      where: { id: parsedId },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ANNOUNCEMENT_DELETED",
      targetType: "Announcement",
      targetId: String(parsedId),
      metadata: {
        announcementId: parsedId,
        title: existing.title,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete announcement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
