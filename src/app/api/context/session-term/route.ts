import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";

const setContextSchema = z.object({
  sessionId: z.string().optional(),
  termId: z.string().optional(),
});

const service = new AcademicCalendarService();

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const context = await service.getUserContext(schoolId, session.user.id);
  return NextResponse.json(context);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const payload = await request.json();
  const parsed = setContextSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await service.setUserContext(schoolId, session.user.id, parsed.data.sessionId, parsed.data.termId);
  const context = await service.getUserContext(schoolId, session.user.id);
  return NextResponse.json(context);
}
