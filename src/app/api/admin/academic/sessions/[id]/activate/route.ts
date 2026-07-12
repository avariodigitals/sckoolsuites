import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";
import { parseNumericId } from "@/lib/id-helpers";

const service = new AcademicCalendarService();

async function getSchoolId(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.schoolId || "default";
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "sessions");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "session id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid session id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = await getSchoolId(session.user.id);
  const updated = await service.activateSession(schoolId, String(parsedId));
  return NextResponse.json(updated);
}
