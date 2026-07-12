import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";
import { AcademicStatus } from "@/lib/db-types";

const createTermSchema = z.object({
  sessionId: z.string().min(1),
  name: z.string().min(3),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  resumptionDate: z.string().optional(),
  breakDates: z.array(z.string()).optional(),
  status: z.nativeEnum(AcademicStatus).optional(),
});

const service = new AcademicCalendarService();

async function getSchoolId(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.schoolId || "default";
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const allowed = await crudPrivilege(session, "POST", "terms");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!session?.user || !["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(session.user.role)) {
      return NextResponse.json({ error: `Unauthorized. Role: ${session?.user?.role}` }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = createTermSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const schoolId = await getSchoolId(session.user.id);
    const created = await service.createTerm({
      schoolId,
      ...parsed.data,
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error("Term creation error:", error);
    return NextResponse.json({ error: "Failed to create term" }, { status: 500 });
  }
}
