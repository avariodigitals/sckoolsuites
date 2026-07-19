import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";
import { AcademicStatus } from "@/lib/db-types";
import { parseNumericId } from "@/lib/id-helpers";

const schema = z.object({
  status: z.nativeEnum(AcademicStatus),
});

const service = new AcademicCalendarService();

async function getSchoolId(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.schoolId || "default";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "terms");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
    const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "term id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid term id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = await getSchoolId(session.user.id);
  const updated = await service.updateTermStatus(schoolId, String(parsedId), parsed.data.status);
  return NextResponse.json(updated);
}
