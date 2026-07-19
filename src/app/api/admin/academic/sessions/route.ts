import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";
import { AcademicStatus } from "@/lib/db-types";

const createSessionSchema = z.object({
  name: z.string().min(3),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
});

const service = new AcademicCalendarService();

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "sessions");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const setup = await service.getAcademicSetup(schoolId);
  return NextResponse.json(setup);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const allowed = await crudPrivilege(session, "POST", "sessions");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = createSessionSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const schoolId = session.user.schoolId || "default";
    const created = await service.createSession({
      schoolId,
      ...parsed.data,
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
