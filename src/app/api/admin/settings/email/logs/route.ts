import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "settings");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    const logs = await prisma.schoolSetting.findMany({
      where: {
        schoolId,
        key: { startsWith: "email_log_" },
      },
      orderBy: { id: "desc" },
      take: 50,
    });

    const parsed = logs
      .map((log: any) => {
        try {
          const data = JSON.parse(log.value);
          return {
            id: log.id,
            to: data.to ?? "",
            subject: data.subject ?? "",
            status: data.deliveryStatus ?? "unknown",
            sentAt: data.sentAt ?? new Date().toISOString(),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ logs: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
