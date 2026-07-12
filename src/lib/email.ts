import { Resend } from "resend";
import { prisma } from "@/lib/db";

// ────────────────────────────────────────────────────────────────
// Resend client
// ────────────────────────────────────────────────────────────────
async function getEmailConfigFromDb(schoolId: string): Promise<{ resendApiKey?: string; fromEmail?: string } | null> {
  try {
    const setting = await prisma.schoolSetting.findFirst({
      where: { schoolId, key: "email_config" },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      return { resendApiKey: parsed.resendApiKey, fromEmail: parsed.fromEmail };
    }
  } catch { /* ignore */ }
  return null;
}

async function getResendClient(schoolId?: string) {
  let apiKey = process.env.RESEND_API_KEY;
  if (!apiKey && schoolId) {
    const dbConfig = await getEmailConfigFromDb(schoolId);
    apiKey = dbConfig?.resendApiKey;
  }
  if (!apiKey) return null;
  return new Resend(apiKey);
}

async function getFromEmail(schoolId?: string): Promise<string> {
  let from = process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!from && schoolId) {
    const dbConfig = await getEmailConfigFromDb(schoolId);
    from = dbConfig?.fromEmail;
  }
  return from || "onboarding@resend.dev";
}

// ────────────────────────────────────────────────────────────────
// Core send function (backward compatible)
// ────────────────────────────────────────────────────────────────
export async function sendWorkflowEmail({
  schoolId,
  to,
  subject,
  text,
  html,
  attachments,
}: {
  schoolId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{ filename: string; content?: string | Buffer; path?: string; contentType?: string }>;
}) {
  const payload = { to, subject, text, html, sentAt: new Date().toISOString() };
  let deliveryStatus = "logged";

  const resend = await getResendClient(schoolId);
  if (resend) {
    try {
      const attachmentParts = attachments?.map((att) => ({
        filename: att.filename,
        content: att.content ? Buffer.from(att.content).toString("base64") : undefined,
      }));

      await resend.emails.send({
        from: await getFromEmail(schoolId),
        to,
        subject,
        text,
        html,
        attachments: attachmentParts as any,
      });
      deliveryStatus = "sent";
    } catch {
      deliveryStatus = "resend_failed";
    }
  }

  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  if (deliveryStatus !== "sent" && webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      deliveryStatus = response.ok ? "sent" : "webhook_failed";
    } catch {
      deliveryStatus = deliveryStatus === "resend_failed" ? "both_failed" : "webhook_error";
    }
  }

  try {
    await prisma.schoolSetting.create({
      data: {
        schoolId,
        key: `email_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        value: JSON.stringify({ ...payload, deliveryStatus }),
      },
    });
  } catch {
    // silently ignore audit log failures
  }

  return { ok: deliveryStatus === "sent" || deliveryStatus === "logged", deliveryStatus };
}

// ────────────────────────────────────────────────────────────────
// Editable Email Templates
// ────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  name: string;
  key: string;
  description: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
}

export const defaultTemplates: EmailTemplate[] = [
  {
    name: "Pre-Admission Letter",
    key: "pre_admission_letter",
    description: "Sent to the applicant when their admission is approved. Includes login credentials and enrollment instructions.",
    subject: "Admission Approved — Pre-Admission Letter — {schoolName}",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
body{font-family:Georgia,serif;color:#1e293b;line-height:1.6;}
.letter{max-width:700px;margin:0 auto;padding:40px;border:1px solid #cbd5e1;}
.header{text-align:center;border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:24px;}
.school-name{font-size:22px;font-weight:bold;color:#0f172a;text-transform:uppercase;letter-spacing:1px;}
.school-meta{font-size:12px;color:#64748b;margin-top:4px;}
.title{text-align:center;font-size:18px;font-weight:bold;color:#0e9f6e;margin:24px 0;text-transform:uppercase;letter-spacing:2px;}
.field{margin:8px 0;}
.label{font-weight:bold;color:#334155;}
.footer{margin-top:40px;border-top:1px solid #cbd5e1;padding-top:16px;font-size:12px;color:#64748b;}
.portal-box{background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:6px;margin-top:16px;}
.portal-box strong{color:#047857;}
</style>
</head>
<body>
<div class="letter">
  <div class="header">
    <div class="school-name">{schoolName}</div>
    <div class="school-meta">{schoolAddress}{schoolPhone}{schoolEmail}</div>
  </div>
  <div class="title">Pre-Admission Letter</div>
  <p>Date: <strong>{date}</strong></p>
  <p>Dear <strong>{studentName}</strong>,</p>
  <p>We are delighted to inform you that your application for admission has been reviewed and <strong>approved</strong>. Welcome to {schoolName}.</p>
  <div style="margin:20px 0;padding:16px;background:#f8fafc;border-radius:6px;">
    <div class="field"><span class="label">Applicant Number:</span> {applicantNumber}</div>
    <div class="field"><span class="label">Student Name:</span> {studentName}</div>
    <div class="field"><span class="label">Class Admitted To:</span> {className}</div>
    <div class="field"><span class="label">Status:</span> <span style="color:#047857;font-weight:bold;">APPROVED</span></div>
  </div>
  <p>Please report to the school administration office within the next <strong>14 days</strong> to complete your enrollment formalities. Bring the following documents:</p>
  <ul><li>Original birth certificate</li><li>Immunization records</li><li>Passport photographs (4 copies)</li><li>Previous school transfer certificate (if applicable)</li></ul>
  <div class="portal-box">
    <strong>Portal Access</strong><br/>
    You can now access the student portal using the credentials below:<br/>
    <strong>Email:</strong> {loginEmail}<br/>
    <strong>Password:</strong> {loginPassword}<br/>
    {portalUrl}
  </div>
  <p>Congratulations once again, and we look forward to having you as part of our school community.</p>
  <p style="margin-top:32px;">Yours sincerely,<br/><strong>The Admissions Office</strong><br/>{schoolName}</p>
  <div class="footer">This is an automated letter generated by the SckoolSuite admissions system. If you have any questions, please contact the school directly.</div>
</div>
</body>
</html>`,
    text: "Dear {studentName},\n\nYour application has been approved.\n\nApplicant Number: {applicantNumber}\nClass: {className}\n\nLogin Email: {loginEmail}\nPassword: {loginPassword}\n\nCongratulations!",
    variables: ["schoolName","schoolAddress","schoolPhone","schoolEmail","studentName","applicantNumber","className","date","loginEmail","loginPassword","portalUrl"],
  },
  {
    name: "Guardian Notification",
    key: "guardian_notification",
    description: "Sent to each guardian when an admission is approved. Includes their portal access credentials.",
    subject: "Admission Approved — {studentName} — {schoolName}",
    html: `<p>Dear {guardianName},</p><p>We are pleased to inform you that <strong>{studentName}</strong> has been approved for admission at <strong>{schoolName}</strong>.</p><p><strong>Applicant Number:</strong> {applicantNumber}<br/><strong>Class:</strong> {className}</p><p>Portal Access:<br/><strong>Email:</strong> {email}<br/><strong>Password:</strong> {password}</p><p>The full Pre-Admission Letter has been sent to the applicant email address.</p>`,
    text: "Dear {guardianName},\n\nWe are pleased to inform you that {studentName} has been approved for admission at {schoolName}.\n\nApplicant Number: {applicantNumber}\nClass: {className}\n\nPortal Access:\nEmail: {email}\nPassword: {password}\n\nThe full Pre-Admission Letter has been sent to the applicant email address.",
    variables: ["guardianName","studentName","schoolName","applicantNumber","className","email","password"],
  },
  {
    name: "Bill Contest Submitted",
    key: "bill_contest_submitted",
    description: "Sent to admin staff when a parent submits a bill contest.",
    subject: "New Bill Contest Submitted: {invoiceNumber}",
    html: `<p>A parent submitted a bill contest for <strong>{invoiceNumber}</strong>.</p><p>Student: {studentName}</p><p>Review required.</p>`,
    text: "A parent submitted a bill contest for {invoiceNumber}. Student: {studentName}. Review required.",
    variables: ["invoiceNumber","studentName"],
  },
  {
    name: "Bill Contest Status Update",
    key: "bill_contest_status",
    description: "Sent to parent when a bill contest status changes (under review, approved, rejected).",
    subject: "Bill {invoiceNumber} is {statusLabel}",
    html: `<p>Your bill contest for Bill <strong>{invoiceNumber}</strong> has been {statusLabel}.</p>{staffComment}`,
    text: "Your bill contest for Bill {invoiceNumber} has been {statusLabel}. {staffComment}",
    variables: ["invoiceNumber","statusLabel","staffComment"],
  },
  {
    name: "Welcome — New Account",
    key: "welcome_account",
    description: "Sent when a new user account is created (student, parent, teacher, staff).",
    subject: "Welcome to {schoolName} — Your Account Details",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;}h2{color:#0f172a;} .box{background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;margin:16px 0;} .btn{background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;}</style></head><body><h2>Welcome to {schoolName}</h2><p>Hello <strong>{userName}</strong>,</p><p>Your account has been created successfully. You can now access the school portal.</p><div class="box"><strong>Email:</strong> {email}<br/><strong>Password:</strong> {password}<br/><strong>Role:</strong> {role}</div><p><a href="{portalUrl}" class="btn">Access Portal</a></p><p>If you have any questions, please contact the school administration.</p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from {schoolName}.</p></body></html>`,
    text: "Welcome to {schoolName}!\n\nHello {userName},\n\nYour account has been created.\n\nEmail: {email}\nPassword: {password}\nRole: {role}\n\nAccess the portal: {portalUrl}\n\nThis is an automated message from {schoolName}.",
    variables: ["schoolName","userName","email","password","role","portalUrl"],
  },
  {
    name: "Password Reset",
    key: "password_reset",
    description: "Sent when a user requests a password reset.",
    subject: "Password Reset — {schoolName}",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;}h2{color:#0f172a;} .box{background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;margin:16px 0;} .btn{background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;}</style></head><body><h2>Password Reset Request</h2><p>Hello <strong>{userName}</strong>,</p><p>We received a request to reset your password for {schoolName}. Click the button below to reset it:</p><p><a href="{resetUrl}" class="btn">Reset Password</a></p><p>If you did not request this, please ignore this email.</p><p style="color:#64748b;font-size:12px;margin-top:24px;">This link expires in 1 hour. This is an automated message from {schoolName}.</p></body></html>`,
    text: "Password Reset Request\n\nHello {userName},\n\nWe received a request to reset your password for {schoolName}.\n\nReset link: {resetUrl}\n\nThis link expires in 1 hour. If you did not request this, please ignore this email.",
    variables: ["schoolName","userName","resetUrl"],
  },
  {
    name: "Invoice Generated",
    key: "invoice_generated",
    description: "Sent to parent when a new invoice is generated for their child.",
    subject: "New Invoice — {invoiceNumber} — {schoolName}",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;}h2{color:#0f172a;} .box{background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;margin:16px 0;} .btn{background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;}</style></head><body><h2>New Invoice</h2><p>Hello <strong>{parentName}</strong>,</p><p>A new invoice has been generated for <strong>{studentName}</strong> at {schoolName}.</p><div class="box"><strong>Invoice Number:</strong> {invoiceNumber}<br/><strong>Amount Due:</strong> {amount}<br/><strong>Due Date:</strong> {dueDate}<br/><strong>Session:</strong> {sessionName}<br/><strong>Term:</strong> {termName}</div><p><a href="{portalUrl}" class="btn">View & Pay Invoice</a></p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from {schoolName}.</p></body></html>`,
    text: "New Invoice\n\nHello {parentName},\n\nA new invoice has been generated for {studentName} at {schoolName}.\n\nInvoice Number: {invoiceNumber}\nAmount Due: {amount}\nDue Date: {dueDate}\nSession: {sessionName}\nTerm: {termName}\n\nView invoice: {portalUrl}\n\nThis is an automated message from {schoolName}.",
    variables: ["schoolName","parentName","studentName","invoiceNumber","amount","dueDate","sessionName","termName","portalUrl"],
  },
  {
    name: "Payment Receipt",
    key: "payment_receipt",
    description: "Sent to parent after a successful payment.",
    subject: "Payment Received — {invoiceNumber} — {schoolName}",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;}h2{color:#0f172a;} .box{background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;margin:16px 0;} .btn{background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;}</style></head><body><h2>Payment Received</h2><p>Hello <strong>{parentName}</strong>,</p><p>Thank you for your payment for <strong>{studentName}</strong> at {schoolName}.</p><div class="box"><strong>Invoice Number:</strong> {invoiceNumber}<br/><strong>Amount Paid:</strong> {amountPaid}<br/><strong>Payment Method:</strong> {paymentMethod}<br/><strong>Transaction Date:</strong> {transactionDate}<br/><strong>Balance:</strong> {balance}</div><p><a href="{portalUrl}" class="btn">View Receipt</a></p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from {schoolName}.</p></body></html>`,
    text: "Payment Received\n\nHello {parentName},\n\nThank you for your payment for {studentName} at {schoolName}.\n\nInvoice Number: {invoiceNumber}\nAmount Paid: {amountPaid}\nPayment Method: {paymentMethod}\nTransaction Date: {transactionDate}\nBalance: {balance}\n\nView receipt: {portalUrl}\n\nThis is an automated message from {schoolName}.",
    variables: ["schoolName","parentName","studentName","invoiceNumber","amountPaid","paymentMethod","transactionDate","balance","portalUrl"],
  },
  {
    name: "Fee Reminder",
    key: "fee_reminder",
    description: "Sent to parent as a reminder for upcoming or overdue fee payment.",
    subject: "Fee Payment Reminder — {studentName} — {schoolName}",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;}h2{color:#0f172a;} .box{background:#fffbeb;border:1px solid #fcd34d;padding:16px;border-radius:8px;margin:16px 0;} .btn{background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;}</style></head><body><h2>Fee Payment Reminder</h2><p>Hello <strong>{parentName}</strong>,</p><p>This is a friendly reminder that the fee payment for <strong>{studentName}</strong> at {schoolName} is due.</p><div class="box"><strong>Amount Due:</strong> {amountDue}<br/><strong>Due Date:</strong> {dueDate}<br/><strong>Session:</strong> {sessionName}<br/><strong>Term:</strong> {termName}</div><p><a href="{portalUrl}" class="btn">Pay Now</a></p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from {schoolName}.</p></body></html>`,
    text: "Fee Payment Reminder\n\nHello {parentName},\n\nThis is a reminder that the fee payment for {studentName} at {schoolName} is due.\n\nAmount Due: {amountDue}\nDue Date: {dueDate}\nSession: {sessionName}\nTerm: {termName}\n\nPay now: {portalUrl}\n\nThis is an automated message from {schoolName}.",
    variables: ["schoolName","parentName","studentName","amountDue","dueDate","sessionName","termName","portalUrl"],
  },
  {
    name: "Results Published",
    key: "results_published",
    description: "Sent to parent when student results are published.",
    subject: "Results Published — {studentName} — {schoolName}",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;}h2{color:#0f172a;} .box{background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;margin:16px 0;} .btn{background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;}</style></head><body><h2>Results Published</h2><p>Hello <strong>{parentName}</strong>,</p><p>The results for <strong>{studentName}</strong> for {termName} have been published at {schoolName}.</p><div class="box"><strong>Session:</strong> {sessionName}<br/><strong>Term:</strong> {termName}<br/><strong>Class:</strong> {className}<br/><strong>Overall Grade:</strong> {overallGrade}</div><p><a href="{portalUrl}" class="btn">View Results</a></p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from {schoolName}.</p></body></html>`,
    text: "Results Published\n\nHello {parentName},\n\nThe results for {studentName} for {termName} have been published at {schoolName}.\n\nSession: {sessionName}\nTerm: {termName}\nClass: {className}\nOverall Grade: {overallGrade}\n\nView results: {portalUrl}\n\nThis is an automated message from {schoolName}.",
    variables: ["schoolName","parentName","studentName","sessionName","termName","className","overallGrade","portalUrl"],
  },
  {
    name: "Attendance Alert",
    key: "attendance_alert",
    description: "Sent to parent when a student is marked absent.",
    subject: "Attendance Alert — {studentName} — {schoolName}",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;}h2{color:#0f172a;} .box{background:#fef2f2;border:1px solid #fecaca;padding:16px;border-radius:8px;margin:16px 0;} .btn{background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;}</style></head><body><h2>Attendance Alert</h2><p>Hello <strong>{parentName}</strong>,</p><p>We would like to inform you that <strong>{studentName}</strong> was marked absent on <strong>{date}</strong> at {schoolName}.</p><div class="box"><strong>Date:</strong> {date}<br/><strong>Status:</strong> {attendanceStatus}<br/><strong>Class:</strong> {className}</div><p>If you have any concerns, please contact the school administration.</p><p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message from {schoolName}.</p></body></html>`,
    text: "Attendance Alert\n\nHello {parentName},\n\nWe would like to inform you that {studentName} was marked absent on {date} at {schoolName}.\n\nDate: {date}\nStatus: {attendanceStatus}\nClass: {className}\n\nIf you have any concerns, please contact the school administration.\n\nThis is an automated message from {schoolName}.",
    variables: ["schoolName","parentName","studentName","date","attendanceStatus","className"],
  },
  {
    name: "General Announcement",
    key: "general_announcement",
    description: "Used for school-wide announcements and newsletters.",
    subject: "{announcementTitle} — {schoolName}",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto;padding:24px;}h2{color:#0f172a;} .box{background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;margin:16px 0;}</style></head><body><h2>{announcementTitle}</h2><p>Hello <strong>{recipientName}</strong>,</p><div class="box">{announcementBody}</div><p style="color:#64748b;font-size:12px;margin-top:24px;">This message was sent by {schoolName}. If you have questions, please contact the school.</p></body></html>`,
    text: "{announcementTitle}\n\nHello {recipientName},\n\n{announcementBody}\n\nThis message was sent by {schoolName}.",
    variables: ["schoolName","recipientName","announcementTitle","announcementBody"],
  },
];

function interpolateTemplate(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? escapeHtml(String(val)) : "";
  });
}

export async function getEmailTemplate(schoolId: string, key: string): Promise<EmailTemplate | null> {
  const setting = await prisma.schoolSetting.findFirst({
    where: { schoolId, key: `email_template_${key}` },
  });
  if (setting?.value) {
    try { return JSON.parse(setting.value); } catch { /* ignore */ }
  }
  const fallback = defaultTemplates.find((t) => t.key === key);
  return fallback ?? null;
}

export async function saveEmailTemplate(schoolId: string, template: EmailTemplate) {
  const existing = await prisma.schoolSetting.findFirst({
    where: { schoolId, key: `email_template_${template.key}` },
  });
  const payload = JSON.stringify(template);
  if (existing) {
    await prisma.schoolSetting.update({
      where: { id: existing.id },
      data: { value: payload },
    });
  } else {
    await prisma.schoolSetting.create({
      data: { schoolId, key: `email_template_${template.key}`, value: payload },
    });
  }
}

export async function listEmailTemplates(schoolId: string): Promise<EmailTemplate[]> {
  const saved = await prisma.schoolSetting.findMany({
    where: { schoolId, key: { startsWith: "email_template_" } },
  });
  const savedMap = new Map<string, EmailTemplate>();
  for (const row of saved) {
    try {
      const t = JSON.parse(row.value) as EmailTemplate;
      savedMap.set(t.key, t);
    } catch { /* ignore */ }
  }
  return defaultTemplates.map((t) => savedMap.get(t.key) ?? t);
}

// Build a complete email using a template key + variables
export async function buildTemplatedEmail(
  schoolId: string,
  templateKey: string,
  vars: Record<string, string | undefined>
): Promise<{ subject: string; html: string; text: string } | null> {
  const template = await getEmailTemplate(schoolId, templateKey);
  if (!template) return null;
  return {
    subject: interpolateTemplate(template.subject, vars),
    html: interpolateTemplate(template.html, vars),
    text: interpolateTemplate(template.text, vars),
  };
}

// Send a welcome email to a newly created user with login credentials
export async function sendWelcomeEmail({
  schoolId,
  to,
  userName,
  email,
  password,
  role,
}: {
  schoolId: string;
  to: string;
  userName: string;
  email: string;
  password: string;
  role: string;
}) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const portalUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  return sendTemplatedEmail({
    schoolId,
    to,
    templateKey: "welcome_account",
    vars: {
      schoolName: school?.name ?? "Sckool Suite",
      userName,
      email,
      password,
      role,
      portalUrl,
    },
  });
}

// Convenience: send using a template
export async function sendTemplatedEmail({
  schoolId,
  to,
  templateKey,
  vars,
}: {
  schoolId: string;
  to: string;
  templateKey: string;
  vars: Record<string, string | undefined>;
}) {
  const built = await buildTemplatedEmail(schoolId, templateKey, vars);
  if (!built) return { ok: false, deliveryStatus: "template_not_found" };
  return sendWorkflowEmail({ schoolId, to, subject: built.subject, text: built.text, html: built.html });
}

// ────────────────────────────────────────────────────────────────
// Legacy helpers (kept for backward compatibility)
// ────────────────────────────────────────────────────────────────
export function buildPreAdmissionLetterHtml(params: {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  studentName: string;
  applicantNumber: string;
  className: string;
  date: string;
  loginEmail?: string;
  loginPassword?: string;
  portalUrl?: string;
}) {
  const {
    schoolName,
    schoolAddress = "",
    schoolPhone = "",
    schoolEmail = "",
    studentName,
    applicantNumber,
    className,
    date,
    loginEmail,
    loginPassword,
    portalUrl = "",
  } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Georgia, serif; color: #1e293b; line-height: 1.6; }
    .letter { max-width: 700px; margin: 0 auto; padding: 40px; border: 1px solid #cbd5e1; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .school-name { font-size: 22px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
    .school-meta { font-size: 12px; color: #64748b; margin-top: 4px; }
    .title { text-align: center; font-size: 18px; font-weight: bold; color: #0e9f6e; margin: 24px 0; text-transform: uppercase; letter-spacing: 2px; }
    .field { margin: 8px 0; }
    .label { font-weight: bold; color: #334155; }
    .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 16px; font-size: 12px; color: #64748b; }
    .portal-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; margin-top: 16px; }
    .portal-box strong { color: #047857; }
  </style>
</head>
<body>
  <div class="letter">
    <div class="header">
      <div class="school-name">${escapeHtml(schoolName)}</div>
      <div class="school-meta">${escapeHtml(schoolAddress)}${schoolAddress && schoolPhone ? " · " : ""}${escapeHtml(schoolPhone)}${schoolPhone && schoolEmail ? " · " : ""}${escapeHtml(schoolEmail)}</div>
    </div>

    <div class="title">Pre-Admission Letter</div>

    <p>Date: <strong>${escapeHtml(date)}</strong></p>

    <p>Dear <strong>${escapeHtml(studentName)}</strong>,</p>

    <p>We are delighted to inform you that your application for admission has been reviewed and <strong>approved</strong>. Welcome to ${escapeHtml(schoolName)}.</p>

    <div style="margin: 20px 0; padding: 16px; background: #f8fafc; border-radius: 6px;">
      <div class="field"><span class="label">Applicant Number:</span> ${escapeHtml(applicantNumber)}</div>
      <div class="field"><span class="label">Student Name:</span> ${escapeHtml(studentName)}</div>
      <div class="field"><span class="label">Class Admitted To:</span> ${escapeHtml(className)}</div>
      <div class="field"><span class="label">Status:</span> <span style="color:#047857;font-weight:bold;">APPROVED</span></div>
    </div>

    <p>Please report to the school administration office within the next <strong>14 days</strong> to complete your enrollment formalities. Bring the following documents:</p>
    <ul>
      <li>Original birth certificate</li>
      <li>Immunization records</li>
      <li>Passport photographs (4 copies)</li>
      <li>Previous school transfer certificate (if applicable)</li>
    </ul>

    ${loginEmail && loginPassword ? `
    <div class="portal-box">
      <strong>Portal Access</strong><br/>
      You can now access the student portal using the credentials below:<br/>
      <strong>Email:</strong> ${escapeHtml(loginEmail)}<br/>
      <strong>Password:</strong> ${escapeHtml(loginPassword)}<br/>
      ${portalUrl ? `<a href="${escapeHtml(portalUrl)}" style="color:#047857;">${escapeHtml(portalUrl)}</a>` : ""}
    </div>
    ` : ""}

    <p>Congratulations once again, and we look forward to having you as part of our school community.</p>

    <p style="margin-top:32px;">Yours sincerely,<br/>
    <strong>The Admissions Office</strong><br/>
    ${escapeHtml(schoolName)}</p>

    <div class="footer">
      This is an automated letter generated by the SckoolSuite admissions system. If you have any questions, please contact the school directly.
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
