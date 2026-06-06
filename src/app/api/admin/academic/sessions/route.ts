import { NextResponse } from "next/server";
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
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setup = await service.getAcademicSetup("default");
  return NextResponse.json(setup);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    console.log("Session API - user:", session?.user);
    if (!session?.user || !["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"].includes(session.user.role)) {
      return NextResponse.json({ error: `Unauthorized. Role: ${session?.user?.role}` }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = createSessionSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const created = await service.createSession({
      schoolId: "default",
      ...parsed.data,
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
