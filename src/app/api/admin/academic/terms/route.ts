import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";
import { AcademicStatus } from "@/lib/db-types";

const createTermSchema = z.object({
  sessionId: z.string().min(5),
  name: z.string().min(3),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  resumptionDate: z.string().optional(),
  breakDates: z.array(z.string()).optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
});

const service = new AcademicCalendarService();

export async function POST(request: Request) {
  try {
    const session = await auth();
    console.log("Term API - user:", session?.user);
    if (!session?.user || !["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"].includes(session.user.role)) {
      return NextResponse.json({ error: `Unauthorized - no school assigned. Role: ${session?.user?.role}, ` }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = createTermSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const created = await service.createTerm({
      schoolId: "default",
      ...parsed.data,
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error("Term creation error:", error);
    return NextResponse.json({ error: "Failed to create term" }, { status: 500 });
  }
}
