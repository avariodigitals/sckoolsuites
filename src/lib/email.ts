import { prisma } from "@/lib/db";

export async function sendWorkflowEmail({
  schoolId,
  to,
  subject,
  text,
}: {
  schoolId: string;
  to: string;
  subject: string;
  text: string;
}) {
  const payload = {
    to,
    subject,
    text,
    sentAt: new Date().toISOString(),
  };

  let deliveryStatus = "logged";
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      deliveryStatus = response.ok ? "sent" : "webhook_failed";
    } catch {
      deliveryStatus = "webhook_error";
    }
  }

  await prisma.schoolSetting.create({
    data: {
      schoolId,
      key: `email_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      value: JSON.stringify({ ...payload, deliveryStatus }),
    },
  });

  return { ok: deliveryStatus === "sent" || deliveryStatus === "logged", deliveryStatus };
}
