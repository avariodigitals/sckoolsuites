import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";
import { AcademicStatus } from "@/lib/db-types";

const schema = z.object({
  status: z.nativeEnum(AcademicStatus),
});

const service = new AcademicCalendarService();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !["SCHOOL_ADMIN", "PRINCIPAL"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const updated = await service.updateSessionStatus("default", id, parsed.data.status);
  return NextResponse.json(updated);
}
